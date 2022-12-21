'use strict';

const sequelize = require('sequelize');
const cls = require('cls-hooked');
const namespace = cls.createNamespace('sequelize-namespace');
sequelize.Sequelize.useCLS(namespace);

module.exports = () => {

  const config = exports = {};

  // mysql配置
  config.sequelize = {
    Sequelize: sequelize,
    dialect: 'mysql',
    username: 'root',
    password: '123456',
    host: 'localhost',
    port: 3306,
    database: 'crack_main',
    timezone: '+08:00',
    dialectOptions: {
      charset: 'utf8mb4',
      dateStrings: true,
      typeCast: true,
      supportBigNumbers: true,
      bigNumberStrings: true,
    },
  };

  // redis配置
  config.redis = {
    client: {
      port: 6379,
      host: 'localhost',
      password: '123456',
      db: 8,
      maxRetriesPerRequest: 0,
    },
  };

  // 目录
  config.dir = {
    file: '', // 保存的文件目录
    dict: '', // 字典目录
    logs: '', // 日志目录
  };

  return config;
};
