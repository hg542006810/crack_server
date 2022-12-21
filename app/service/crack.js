'use strict';

const BaseService = require('../core/baseService');
const path = require('path');
const isEmpty = require('lodash/isEmpty');
const { TaskStatus, CacheKey, UseRule } = require('../common/constant');
const spawn = require('child_process').spawn;
const { getHashCatMode } = require('../utils/cmdUtils');
const sequelize = require('sequelize');
const { removeFile } = require('../utils/filesUtils');
const moment = require('moment');
const isNil = require('lodash/isNil');
const { sendPasswordEmail } = require('../crack/email');
const { UniqueID } = require('nodejs-snowflake');
const execSync = require('child_process').execSync;

const { Op } = sequelize;

// 破解相关
class CrackService extends BaseService {
  // 开始破解
  async startCrack(email, hash, file) {
    // hash正确校验
    if (getHashCatMode(hash) === null) {
      return this.error({ message: 'Hash格式不正确或文件没有加密!' });
    }
    const { ctx, config } = this;
    const { dir } = config;
    // 生成唯一uuid
    const uid = new UniqueID();
    const uuid = uid.getUniqueID();
    const data = {
      id: uuid,
      email,
      hash,
      status: TaskStatus.inProgress,
      fileName: file ? file.filename : hash,
      useRule: UseRule.all, // 默认跑全部规则
    };
    const pm2Name = `crack_${uuid}`;
    const pm2Result = execSync('pm2 list');
    if (pm2Result.toString().indexOf(pm2Name) !== -1) {
      return this.error({ message: '该进程已存在!' });
    }
    const result = await ctx.model.transaction(async () => {
      // 获得文件的hash
      // 查找数据库是否存在该hash值
      const info = await ctx.model.Task.findOne({ where: { hash } });
      // 保存文件 避免重复上传
      if (isEmpty(info) && !isEmpty(file)) {
        const path = await ctx.helper.uploadFile(file);
        if (isEmpty(path)) {
          return this.error({ message: '上传发生了错误!' });
        }
        data.filepath = path;
      }
      if (!isEmpty(info) && !isEmpty(info.filepath)) {
        data.filepath = info.filepath;
      }
      if (
        isEmpty(info) ||
        (isEmpty(info.password) && info.status !== TaskStatus.success)
      ) {
        await ctx.model.Task.create(data);
        // 创建一个独立进程运行脚本
        const exec = spawn(
          `pm2 start ${path.join(
            __dirname,
            './../crack/crack.js'
          )} --name='${pm2Name}' -- --uuid='${uuid}' --hash='${hash}' --dictDir='${
            dir.dict
          }' --logDir='${dir.logs}' --mysqlHost='${
            config.sequelize.host
          }' --mysqlUsername='${config.sequelize.username}' --mysqlPassword='${
            config.sequelize.password
          }' --redisHost='${config.redis.client.host}' --redisPassword='${
            config.redis.client.password
          }' --type='${file ? 'file' : 'hash'}' --fileName='${
            file ? file.filename : ''
          }' --email='${email}' --useRule='${UseRule.all}'`,
          {
            detached: true,
            stdio: 'ignore',
            shell: true,
          }
        );
        exec.unref();
        return this.success({ message: '开始破解...' });
      }
      // 数据库有密码 则直接破解成功
      if (
        !isEmpty(info) &&
        !isEmpty(info.password) &&
        info.status === TaskStatus.success
      ) {
        const isExist = await ctx.model.Task.count({ where: { hash, email } });
        // 一个邮箱只能入库一次
        if (!isExist) {
          await ctx.model.Task.create({
            ...data,
            password: info.password,
            status: TaskStatus.success,
          });
        }

        return this.success({ message: '破解成功!', data: info.password });
      }
      return this.error({ message: '发生了意外错误!' });
    });
    return result;
  }

  // 获得所有任务
  async getTask({
    page,
    pageSize,
    email,
    hash,
    createdAt,
    sortBy,
    orderBy,
    status,
  }) {
    const { ctx } = this;
    const where = {};
    if (!isEmpty(email)) {
      where.email = { [Op.like]: '%' + email + '%' };
    }
    if (!isEmpty(hash)) {
      where.hash = { [Op.like]: '%' + hash + '%' };
    }
    if (!isEmpty(createdAt)) {
      where.createdAt = {
        [Op.gte]: createdAt[0],
        [Op.lte]: createdAt[1],
      };
    }
    if (!isNil(status)) {
      where.status = status;
    }
    // 需要分页
    const { limit, offset } = ctx.helper.getPageParams(page, pageSize);
    const result = await ctx.model.Task.findAndCountAll({
      attributes: {
        exclude: [ 'hash' ],
      },
      where,
      limit,
      offset,
      order: sortBy && orderBy ? [[ sortBy, orderBy ]] : [[ 'createdAt', 'DESC' ]],
    });
    /*    const keys = result.rows.map(item => `${CacheKey.TaskProgress}:${item.id}`);
    if (keys.length !== 0) {
      const progress = await app.redis.mget(keys);
      result.rows.map((item, index) => {
        if (isEmpty(progress[index])) {
          if (isEmpty(progress)) {
            item.dataValues.progress = {
              message: '暂无进度',
              progress: '0.00%',
              hash: item.hash,
              speed: 0,
            };
          }
        } else {
          item.dataValues.progress = JSON.parse(progress[index]);
        }
        return item;
      });
    } */
    return this.success({ data: result, message: '查询成功!' });
  }

  // 获得进度
  async getProgress(id) {
    const { app } = this;
    const progress = await app.redis.get(`${CacheKey.TaskProgress}:${id}`);
    if (isEmpty(progress)) {
      return this.success({
        message: '查询成功!',
        data: {
          message: '暂无进度',
          progress: '0.00%',
          hash: '',
          speed: 0,
        },
      });
    }
    return this.success({
      message: '查询成功!',
      data: JSON.parse(progress),
    });
  }

  // 杀掉进程
  async killProcess(id) {
    const { ctx, app, config } = this;
    const { dir } = config;
    const info = await ctx.model.Task.findOne({ where: { id } });
    if (isEmpty(info)) {
      return this.error({ message: '任务不存在!' });
    }
    if (info.status !== TaskStatus.inProgress) {
      return this.error({ message: '必须在进行中的任务才能杀掉!' });
    }
    try {
      // 杀掉对应的破解任务
      execSync(`pm2 delete crack_${id}`);
      return this.success({ message: '操作成功!' });
    } catch (_) {
      return this.success({ message: '操作成功!' });
    } finally {
      // 清空redis进度
      app.redis.del(`${CacheKey.TaskProgress}:${id}`);
      await ctx.model.Task.update(
        { status: TaskStatus.over },
        { where: { id } }
      );
      // 删除日志
      removeFile(
        `${dir.logs}/${moment(info.createdAt).format('YYYYMMDD')}/${
          info.id
        }.log`
      );
    }
  }

  // 发送邮件
  async sendEmail(id) {
    const { ctx } = this;
    const info = await ctx.model.Task.findOne({ where: { id } });
    if (isEmpty(info)) {
      return this.error({ message: '任务不存在!' });
    }
    if (isEmpty(info.password)) {
      return this.error({ message: '任务没有破解成功!' });
    }
    // 发送成功邮件
    try {
      await sendPasswordEmail(
        info.email,
        !isEmpty(info.fileName)
          ? `您的文件：${info.fileName}，已恢复完成，密码为：`
          : `您的Hash：${info.hash}，已恢复完成，密码为：`,
        info.password
      );
      return this.success({ message: '发送成功!' });
    } catch (err) {
      return this.error({ message: `发送失败，原因：${err}` });
    }
  }

  // 结束排队
  async queued(id) {
    const { ctx, config } = this;
    const { dir } = config;
    const info = await ctx.model.Task.findOne({ where: { id } });
    if (isEmpty(info)) {
      return this.error({ message: '任务不存在!' });
    }
    if (info.status !== TaskStatus.queueing) {
      return this.error({ message: '任务必须在排队中!' });
    }
    const hashInfo = await ctx.model.Task.findOne({
      where: {
        hash: info.hash,
        status: TaskStatus.success,
        password: { [Op.ne]: null },
      },
    });
    if (!isEmpty(hashInfo)) {
      // 有相同的hash值完成了破解 直接完成破解
      await ctx.model.Task.update(
        { status: TaskStatus.success, password: hashInfo.password },
        { where: { id } }
      );
      // 发送成功邮件
      await sendPasswordEmail(
        info.email,
        !isEmpty(info.fileName)
          ? `您的文件：${info.fileName}，已恢复完成，密码为：`
          : `您的Hash：${info.hash}，已恢复完成，密码为：`,
        info.password
      );
    } else {
      await ctx.model.Task.update(
        { status: TaskStatus.inProgress },
        { where: { id } }
      );
      const pm2Name = `crack_${info.id}`;
      const pm2Result = execSync('pm2 list');
      if (pm2Result.toString().indexOf(pm2Name) !== -1) {
        return this.error({ message: '该进程已存在!' });
      }
      // 创建一个独立进程运行脚本
      const exec = spawn(
        `pm2 start ${path.join(
          __dirname,
          './../crack/crack.js'
        )} --name='${pm2Name}' -- --uuid='${info.id}' --hash='${
          info.hash
        }' --dictDir='${dir.dict}' --logDir='${dir.logs}' --mysqlHost='${
          config.sequelize.host
        }' --mysqlUsername='${config.sequelize.username}' --mysqlPassword='${
          config.sequelize.password
        }' --redisHost='${config.redis.client.host}' --redisPassword='${
          config.redis.client.password
        }' --type='file' --fileName='${info.fileName}' --email='${
          info.email
        }' --useRule='${info.useRule}'`,
        {
          detached: true,
          stdio: 'ignore',
          shell: true,
        }
      );

      exec.unref();
    }
    return this.success({ message: '操作成功!' });
  }
}
module.exports = CrackService;
