/* eslint valid-jsdoc: "off" */

'use strict';
const Response = require('../app/dto/response');
const isEmpty = require('lodash/isEmpty');
const head = require('lodash/head');

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = appInfo => {
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
  const config = exports = {};

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1635227429532_3407';

  // add your middleware config here
  config.middleware = [ 'notfoundHandler' ];

  // 配置安全相关
  config.security = {
    csrf: false,
  };

  config.onerror = {
    appErrorFilter: () => true,
    json(err, ctx) {
      if (!isEmpty(err.errors)) {
        ctx.body = Response.error({ message: head(err.errors).message });
        return;
      }
      ctx.logger.error(err);
      ctx.body = Response.error({ message: '服务器发生错误!', data: `${err}` });
      ctx.status = 500;
    },
  };

  config.multipart = {
    fileSize: '500mb',
    files: 10,
    mode: 'file',
    fields: 100,
    whitelist: [
      '.zip', '.rar', '.xlsx', 'xls', '.doc', '.docx', '.ppt', '.pptx', '.7z', '.pdf',
    ],
  };

  // add your user config here
  const userConfig = {
    // myAppName: 'egg',
  };

  return {
    ...config,
    ...userConfig,
  };
};
