'use strict';

const Controller = require('egg').Controller;
const Response = require('../dto/response');
const isEmpty = require('lodash/isEmpty');

// 破解码相关
class KeyController extends Controller {
  // 生成破解码
  async generateKey() {
    const { ctx } = this;
    const { request } = ctx;
    const { times, timeout, count, type } = request.body;
    if (
      !ctx.helper.validate({
        times: {
          type: 'int',
          required: true,
          message: '可用次数不正确!',
        },
        timeout: {
          type: 'int',
          required: true,
          message: '可用时长不正确!',
        },
        count: {
          type: 'int',
          required: true,
          message: '生成数量不正确!',
        },
        type: {
          type: 'enum',
          values: [ 0, 1, 2 ],
          required: true,
          message: '破解码类型不正确!',
        },
      })
    ) {
      return;
    }
    ctx.body = await ctx.service.key.generateKey(times, timeout, count, type);
  }

  // 获得所有key
  async getKey() {
    const { ctx } = this;
    if (
      !ctx.helper.validate(
        {
          status: {
            type: 'enum',
            values: [ '0', '1', '2' ],
            required: false,
            errorMessage: '状态不正确!',
          },
          times: {
            type: 'number',
            required: false,
            errorMessage: '可用次数不正确!',
          },
          timeout: {
            type: 'number',
            required: false,
            message: '可用时长不正确!',
          },
          createdAt: {
            type: 'string',
            required: false,
            errorMessage: '创建时间不正确!',
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
            values: [ 'createdAt', 'times', 'timeout' ],
            required: false,
            errorMessage: '排序字段不正确',
          },
          orderBy: {
            type: 'enum',
            values: [ 'DESC', 'ASC' ],
            required: false,
            errorMessage: '排序规则不正确',
          },
          type: {
            type: 'enum',
            values: [ '0', '1', '2' ],
            required: false,
            message: '破解码类型不正确!',
          },
        },
        'query'
      )
    ) {
      return;
    }
    const {
      times,
      status,
      timeout,
      pageSize,
      createdAt,
      page,
      sortBy,
      orderBy,
      type,
    } = ctx.query;
    const queryCreatedAt = ctx.helper.checkDateFormat(createdAt);
    // 验证传入的时间
    if (!isEmpty(createdAt)) {
      if (!queryCreatedAt) {
        ctx.body = Response.error({ message: '时间参数错误!' });
        return;
      }
    }
    ctx.body = await ctx.service.key.getKey({
      times,
      status,
      timeout,
      pageSize,
      createdAt: queryCreatedAt,
      page,
      sortBy,
      orderBy,
      type,
    });
  }

  // 导出key
  async exportKey() {
    const { ctx } = this;
    if (
      !ctx.helper.validate(
        {
          status: {
            type: 'enum',
            values: [ '0', '1', '2' ],
            required: false,
            errorMessage: '状态不正确!',
          },
          times: {
            type: 'number',
            required: false,
            errorMessage: '可用次数不正确!',
          },
          timeout: {
            type: 'number',
            required: false,
            message: '可用时长不正确!',
          },
          createdAt: {
            type: 'string',
            required: false,
            errorMessage: '创建时间不正确!',
          },
        },
        'query'
      )
    ) {
      return;
    }
    const { times, status, timeout, createdAt } = ctx.query;
    const queryCreatedAt = ctx.helper.checkDateFormat(createdAt);
    // 验证传入的时间
    if (!isEmpty(createdAt)) {
      if (!queryCreatedAt) {
        ctx.body = Response.error({ message: '时间参数错误!' });
        return;
      }
    }
    await ctx.service.key.exportKey({
      times,
      status,
      timeout,
      createdAt: queryCreatedAt,
    });
  }
}
module.exports = KeyController;
