'use strict';

const Response = require('../dto/response');
const { UniqueID } = require('nodejs-snowflake');
const moment = require('moment');
const Service = require('egg').Service;

/**
 * service 基类
 */
class BaseService extends Service {

  async success(params) {
    return Response.success(params);
  }

  async error(params) {
    return Response.error(params);
  }

  // 数据库新增
  async create(model, data) {
    return model.create({
      id: this.getSnowflakeId(),
      ...data,
    });
  }

  // 批量添加
  async bulkCreate(model, data) {
    return model.bulkCreate(data.map(item => {
      return {
        id: this.getSnowflakeId(),
        ...item,
      };
    }));
  }

  // 获得雪花算法id
  getSnowflakeId() {
    const uid = new UniqueID();
    return uid.getUniqueID();
  }

  // 格式化时间
  formatDate(str, format) {
    format = format || 'YYYY-MM-DD HH:mm:ss';
    return moment(str).format(format);
  }

  // 获得当前时间
  getNow() {
    return moment().format('YYYY-MM-DD HH:mm:ss');
  }
}

module.exports = BaseService;
