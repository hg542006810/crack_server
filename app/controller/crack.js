'use strict';

const Controller = require('egg').Controller;
const Response = require('../dto/response');
const head = require('lodash/head');
const isEmpty = require('lodash/isEmpty');
const path = require('path');
const { getJohnCmd } = require('../utils/cmdUtils');
const spawnSync = require('child_process').spawnSync;

// 破解相关
class CrackController extends Controller {
  // 破解文件
  async startCrackFile() {
    const { ctx } = this;
    const { request } = ctx;
    const { email } = request.body;
    const file = head(request.files.filter(item => item.field === 'file'));
    if (isEmpty(file)) {
      ctx.body = Response.error({ message: '请上传文件!' });
      return;
    }
    try {
      if (
        !ctx.helper.validate({
          email: {
            type: 'email',
            required: true,
            message: '邮箱号不正确!',
          },
        })
      ) {
        return;
      }
      // 获得文件后缀名
      const fileSuffix = path.extname(file.filename);
      const johnCmd = getJohnCmd(fileSuffix, file.filepath);
      if (isEmpty(johnCmd)) {
        ctx.body = Response.error({ message: '文件上传失败!' });
        return;
      }
      // 执行john命令
      const johnResult = spawnSync(johnCmd, { encoding: 'utf-8', shell: true });
      const fileHash = johnResult.stdout
        .split(':')[1]
        .trim()
        .split(/[\s\n]/)[0]
        .trim();
      ctx.body = await ctx.service.crack.startCrack(email, fileHash, file);
    } catch (err) {
      ctx.body = Response.error({ message: `发生了错误：${err}` });
    } finally {
      await ctx.cleanupRequestFiles();
    }
  }

  // 破解Hash
  async startCrackHash() {
    const { ctx } = this;
    const { request } = ctx;
    const { email, hash } = request.body;
    if (
      !ctx.helper.validate({
        email: {
          type: 'email',
          required: true,
          message: '邮箱号不正确!',
        },
        hash: {
          type: 'string',
          required: true,
          message: 'hash不正确!',
        },
      })
    ) {
      return;
    }
    ctx.body = await ctx.service.crack.startCrack(email, hash);
  }

  // 获得所有任务
  async getTask() {
    const { ctx } = this;
    if (
      !ctx.helper.validate(
        {
          email: {
            type: 'string',
            required: false,
            errorMessage: '邮箱号不正确!',
          },
          createdAt: {
            type: 'string',
            required: false,
            errorMessage: '创建时间不正确!',
          },
          hash: {
            type: 'string',
            required: false,
            errorMessage: 'Hash值不正确!',
          },
          status: {
            type: 'enum',
            values: [ '0', '1', '2', '3', '4' ],
            required: false,
            errorMessage: '状态不正确!',
          },
          page: {
            type: 'number',
            required: true,
            errorMessage: '页数不正确!',
          },
          pageSize: {
            type: 'number',
            required: true,
            errorMessage: '最大页数不正确!',
          },
          sortBy: {
            type: 'enum',
            values: [ 'createdAt' ],
            required: false,
            errorMessage: '排序字段不正确',
          },
          orderBy: {
            type: 'enum',
            values: [ 'DESC', 'ASC' ],
            required: false,
            errorMessage: '排序规则不正确',
          },
        },
        'query'
      )
    ) {
      return;
    }
    const { email, page, pageSize, hash, createdAt, sortBy, orderBy, status } =
      ctx.query;
    const queryCreatedAt = ctx.helper.checkDateFormat(createdAt);
    // 验证传入的时间
    if (!isEmpty(createdAt)) {
      if (!queryCreatedAt) {
        ctx.body = Response.error({ message: '时间参数错误!' });
        return;
      }
    }
    ctx.body = await ctx.service.crack.getTask({
      page,
      pageSize,
      email,
      hash,
      createdAt: queryCreatedAt,
      sortBy,
      orderBy,
      status,
    });
  }

  // 获得任务进度
  async getProgress() {
    const { ctx } = this;
    if (
      !ctx.helper.validate(
        {
          id: {
            type: 'string',
            required: true,
            errorMessage: 'id不能为空!',
          },
        },
        'query'
      )
    ) {
      return;
    }
    const { id } = ctx.query;
    ctx.body = await ctx.service.crack.getProgress(id);
  }

  // 杀掉进程
  async killProcess() {
    const { ctx } = this;
    const { request } = ctx;
    if (
      !ctx.helper.validate({
        id: {
          type: 'string',
          required: true,
          message: 'id不正确!',
        },
      })
    ) {
      return;
    }
    const { id } = request.body;
    ctx.body = await ctx.service.crack.killProcess(id);
  }

  // 发送邮件
  async sendEmail() {
    const { ctx } = this;
    const { request } = ctx;
    if (
      !ctx.helper.validate({
        id: {
          type: 'string',
          required: true,
          message: 'id不正确!',
        },
      })
    ) {
      return;
    }
    const { id } = request.body;
    ctx.body = await ctx.service.crack.sendEmail(id);
  }

  // 排完队 开始任务
  async queued() {
    const { ctx } = this;
    const { request } = ctx;
    if (
      !ctx.helper.validate({
        id: {
          type: 'string',
          required: true,
          message: 'id不正确!',
        },
      })
    ) {
      return;
    }
    const { id } = request.body;
    ctx.body = await ctx.service.crack.queued(id);
  }
}
module.exports = CrackController;
