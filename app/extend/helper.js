'use strict';
const isEmpty = require('lodash/isEmpty');
const toNumber = require('lodash/toNumber');
const Response = require('../dto/response');
const first = require('lodash/first');
const moment = require('moment');
const { mkdirsSync } = require('../utils/filesUtils');
const { customAlphabet } = require('nanoid');
const { md5 } = require('../utils/crypto');
const path = require('path');
const fs = require('fs');
const last = require('lodash/last');

module.exports = {
  // 获得分页参数
  getPageParams(page, pageSize) {
    return {
      limit: pageSize,
      offset: (page - 1) * pageSize,
    };
  },
  /**
   * 检查传入的date格式是否正确 正确的格式为： YYYY-MM-DD HH:MM:SS,YYYY-MM-DD HH:MM:SS
   * @param dateString 需要检查的date字符串
   */
  checkDateFormat(dateString) {
    if (isEmpty(dateString)) {
      return [];
    }
    const date = dateString.split(',');
    if (date.length !== 2) {
      return [];
    }
    return date;
  },
  validate(rules, dataType) {
    const { ctx } = this;
    let data = {};
    switch (dataType) {
      case 'body':
        data = ctx.request.body;
        break;
      case 'query':
        data = ctx.query;
        break;
      case 'params':
        data = ctx.params;
        break;
      default:
        data = ctx.request.body;
        break;
    }
    for (const key in rules) {
      if (
        rules[key].type === 'number' &&
        (rules[key].required || !isEmpty(data[key]))
      ) {
        data[key] = toNumber(data[key]);
      }
      if (
        rules[key].type === 'boolean' &&
        (rules[key].required || !isEmpty(data[key]))
      ) {
        if (data[key] === 'true') {
          data[key] = true;
        }
        if (data[key] === 'false') {
          data[key] = false;
        }
      }
      if (
        (rules[key].type === 'array' || rules[key].type === 'object') &&
        (rules[key].required || !isEmpty(data[key]))
      ) {
        if (typeof data[key] === 'string') {
          try {
            data[key] = JSON.parse(data[key]);
          } catch (err) {
            ctx.body = Response.error({
              message: 'JSON解析异常!',
            });
            return false;
          }
        }
      }
    }
    const errors = ctx.app.validator.validate(rules, data);
    if (errors) {
      errors.forEach(err => {
        // 去除数组的括号
        err.field = err.field.replace(/\[.*?\]/g, '');
        // 去除所有点后面的数据
        if (err.field.indexOf('.') !== -1) {
          err.field = err.field.substr(0, err.field.indexOf('.'));
        }
      });
      ctx.body = Response.error({
        message:
          rules[first(errors) ? first(errors).field : 0].errorMessage ||
          (first(errors) ? first(errors).field : ''),
      });
      return false;
    }
    return true;
  },
  // 上传文件
  async uploadFile(file) {
    const { ctx, config } = this;
    const { logger } = ctx;
    try {
      const dir = `/${moment().format('YYYYMMDD')}`;
      // 创建文件夹
      mkdirsSync(`${config.dir.file}${dir}`);
      // 生成写入路径
      // 随机生成一个字符 以免重复
      const random = customAlphabet(
        '123456789QWERTYUIOPASDFGHJKLZXCVBNMqqwertyuiopasdfghjklzxcvbnm',
        6
      );
      const filename = `${md5(file.filename)}_${random()}.${last(
        file.filename.split('.')
      )}`;
      fs.writeFileSync(
        path.join(config.dir.file, dir, filename),
        fs.readFileSync(file.filepath)
      );
      return path.join(dir, filename);
    } catch (err) {
      logger.error(`上传发生了错误：${err}`);
      return null;
    }
  },
};
