'use strict';

const { Subscription } = require('egg');
const { TaskStatus } = require('../common/constant');
const spawn = require('child_process').spawn;
const path = require('path');
const sequelize = require('sequelize');
const isEmpty = require('lodash/isEmpty');
const { sendPasswordEmail } = require('../crack/email');
const { KeyStatus } = require('../common/constant');
const execSync = require('child_process').execSync;
const uniqWith = require('lodash/uniqWith');

const { Op } = sequelize;
const maxFreeLimit = 3;

// 运行hashcat任务
class CheckTask extends Subscription {
  static get schedule() {
    return {
      interval: '1m', // 每隔1分钟运行一次
      type: 'all',
    };
  }

  async subscribe() {
    const { ctx } = this;
    let allTasks = [];
    // 开启未开启的任务
    ctx.model.transaction(async t => {
      const tasks = await ctx.model.Task.findAll({
        lock: t.LOCK.UPDATE,
        where: { status: TaskStatus.notStart },
      });
      allTasks = allTasks.concat(tasks);
      // 开启排队任务
      // 获得免费任务
      const freeTask = await ctx.model.Task.findAll({
        where: {
          status: TaskStatus.inProgress,
        },
      });
      if (freeTask.length + tasks.length < maxFreeLimit) {
        // 获得排队任务
        const queueTask = await ctx.model.Task.findAll({
          lock: t.LOCK.UPDATE,
          where: { status: TaskStatus.queueing },
          limit: maxFreeLimit - (freeTask.length + tasks.length),
          offset: 0,
          order: [[ 'createdAt', 'ASC' ]],
        });
        allTasks = allTasks.concat(queueTask);
      }
      allTasks = uniqWith(
        allTasks,
        (arrVal, othVal) => arrVal.id === othVal.id
      );
      await this.startCrack(allTasks);
    });
  }

  async startCrack(tasks) {
    const { ctx, config } = this;
    const { dir } = config;
    for (const item of tasks) {
      const data = await ctx.model.Task.findOne({
        where: {
          hash: item.hash,
          status: TaskStatus.success,
          password: { [Op.ne]: null },
        },
      });

      if (isEmpty(data)) {
        // 进程存在则不继续执行
        const pm2Name = `crack_${item.id}`;
        const pm2Result = execSync('pm2 list');
        if (pm2Result.toString().indexOf(pm2Name) !== -1) {
          return;
        }
        try {
          const exec = spawn(
            `pm2 start ${path.join(
              __dirname,
              './../crack/crack.js'
            )} --name='${pm2Name}' -- --uuid='${item.id}' --hash='${
              item.hash
            }' --dictDir='${dir.dict}' --logDir='${dir.logs}' --mysqlHost='${
              config.sequelize.host
            }' --mysqlUsername='${
              config.sequelize.username
            }' --mysqlPassword='${config.sequelize.password}' --redisHost='${
              config.redis.client.host
            }' --redisPassword='${
              config.redis.client.password
            }' --type='file' --fileName='${item.fileName}' --email='${
              item.email
            }' --useRule='${item.useRule}'`,
            {
              detached: true,
              stdio: 'ignore',
              shell: true,
            }
          );
          exec.unref();
          await ctx.model.Task.update(
            { status: TaskStatus.inProgress },
            { where: { id: item.id } }
          );
        } catch (err) {
          await ctx.model.Task.update(
            {
              status: TaskStatus.failure,
              reason: '当前文件不支持破解!',
            },
            {
              where: { id: item.id },
            }
          );
          if (!isEmpty(item.key)) {
            // 退回次数
            await ctx.model.KeyRecord.update(
              {
                isBack: true,
              },
              {
                where: { key: item.key, taskId: item.id },
              }
            );
            await ctx.model.Key.update(
              { status: KeyStatus.used },
              { where: { key: item.key } }
            );
          }
        }
      } else {
        await ctx.model.Task.update(
          { status: TaskStatus.success, password: data.password },
          { where: { id: item.id } }
        );
        // 发送成功邮件
        if (isEmpty(item.key)) {
          sendPasswordEmail(
            item.email,
            `您的文件：${item.fileName}，已恢复完成，购买破解码可立即查看密码`,
            ''
          );
        } else {
          sendPasswordEmail(
            item.email,
            `您的文件：${item.fileName}，已恢复完成，密码为：`,
            data.password
          );
        }
      }
    }
  }
}

module.exports = CheckTask;
