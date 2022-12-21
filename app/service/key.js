'use strict';

const BaseService = require('../core/baseService');
const { customAlphabet } = require('nanoid');
const isEmpty = require('lodash/isEmpty');
const sequelize = require('sequelize');
const isNil = require('lodash/isNil');
const ExcelJS = require('exceljs');
const moment = require('moment');
const { KeyStatus } = require('../common/constant');

const { Op } = sequelize;

// 破解码
class KeyService extends BaseService {
  // 生成破解码
  async generateKey(times, timeout, count, type) {
    const { ctx } = this;
    const result = await ctx.model.transaction(async () => {
      const array = [];
      for (let i = 0; i < count; i++) {
        array.push({
          key: customAlphabet(
            '123456789QWERTYUIOPASDFGHJKLZXCVBNMqqwertyuiopasdfghjklzxcvbnm',
            10
          )(),
          times,
          timeout,
          type,
          status: KeyStatus.unused,
        });
      }
      this.bulkCreate(ctx.model.Key, array);
      return this.success({ message: '生成成功!' });
    });
    return result;
  }

  // 获得所有key
  async getKey({
    times,
    status,
    timeout,
    pageSize,
    createdAt,
    page,
    sortBy,
    orderBy,
    type,
  }) {
    const { ctx } = this;
    const where = {};
    if (!isEmpty(createdAt)) {
      where.createdAt = {
        [Op.gte]: createdAt[0],
        [Op.lte]: createdAt[1],
      };
    }
    if (!isNil(status)) {
      where.status = status;
    }
    if (!isNil(type)) {
      where.type = type;
    }
    if (!isNil(times)) {
      where.times = times;
    }
    if (!isNil(timeout)) {
      where.timeout = timeout;
    }
    // 需要分页
    const { limit, offset } = ctx.helper.getPageParams(page, pageSize);
    const result = await ctx.model.Key.findAndCountAll({
      attributes: [
        'key',
        'times',
        'timeout',
        'status',
        'type',
        'createdAt',
        [
          sequelize.literal(
            '(SELECT COUNT(1) FROM key_record AS record WHERE record.key = key.key AND record.is_back = 0)'
          ),
          'usedCount',
        ],
        [
          sequelize.literal(
            '(SELECT COUNT(1) FROM key_record AS record WHERE record.key = key.key AND record.is_back = 1)'
          ),
          'backCount',
        ],
      ],
      where,
      limit,
      offset,
      order:
        sortBy && orderBy
          ? [[ sortBy, orderBy ]]
          : [
            [ 'status', 'ASC' ],
            [ 'createdAt', 'DESC' ],
          ],
    });
    return this.success({ data: result, message: '查询成功!' });
  }

  // 导出key
  async exportKey({ times, status, timeout, createdAt }) {
    const { ctx } = this;
    const where = {};
    if (!isEmpty(createdAt)) {
      where.createdAt = {
        [Op.gte]: createdAt[0],
        [Op.lte]: createdAt[1],
      };
    }
    if (!isNil(status)) {
      where.status = status;
    }
    if (!isNil(times)) {
      where.times = times;
    }
    if (!isNil(timeout)) {
      where.timeout = timeout;
    }
    const result = await ctx.model.Key.findAll({
      attributes: [
        'key',
        'times',
        'timeout',
        'status',
        'type',
        [
          sequelize.literal(
            '(SELECT COUNT(1) FROM key_record AS record WHERE record.key = key.key AND record.is_back = 0)'
          ),
          'usedCount',
        ],
        [
          sequelize.literal(
            '(SELECT COUNT(1) FROM key_record AS record WHERE record.key = key.key AND record.is_back = 1)'
          ),
          'backCount',
        ],
      ],
      where,
      order: [[ 'createdAt', 'DESC' ]],
    });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('破解码');
    sheet.columns = [
      { header: '破解码', key: 'key', width: 30 },
      { header: '使用次数', key: 'times', width: 20 },
      { header: '使用时长', key: 'timeout', width: 20 },
      { header: '破解码类型', key: 'type', width: 20 },
      { header: '状态', key: 'status', width: 20 },
    ];
    for (let i = 0; i < result.length; i++) {
      const row = sheet.getRow(i + 2);
      const item = result[i];
      row.values = [
        item.key,
        `${item.times}次`,
        `${item.timeout}个月`,
        `${item.type === 0 ? '选择固定规则' : item.type === 1 ? '全部规则' : '选择固定规则或全部规则'}`,
        item.status === KeyStatus.used
          ? `已使用：(有效：${item.dataValues.usedCount}, 无效：${item.dataValues.backCount})`
          : item.status === KeyStatus.unused
            ? '未使用'
            : item.status === KeyStatus.exhaust
              ? '全部使用完'
              : '',
      ];
    }
    const buffer = await workbook.xlsx.writeBuffer();
    this.ctx.attachment(`破解码_${moment().format('YYYYMMDDHHmmss')}.xlsx`);
    this.ctx.set('Content-Type', 'application/octet-stream');
    this.ctx.body = buffer;
  }
}
module.exports = KeyService;
