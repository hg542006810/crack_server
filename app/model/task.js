'use strict';

const { TaskStatus } = require('../common/constant');

module.exports = app => {
  const { BIGINT, STRING, INTEGER, TEXT } = app.Sequelize;

  // 破解任务表
  const Task = app.model.define(
    'task',
    {
      id: { type: BIGINT(64), primaryKey: true, allowNull: false, defaultValue: 0 },
      hash: {
        type: TEXT('long'),
        allowNull: false,
        comment: '破解的hash值',
      },
      email: {
        type: STRING(100),
        allowNull: false,
        comment: '邮箱',
      },
      password: {
        type: STRING(255),
        allowNull: true,
        comment: '破解出来的密码',
      },
      fileName: {
        type: TEXT,
        allowNull: true,
        comment: '文件名',
      },
      filepath: {
        type: STRING(255),
        allowNull: true,
        comment: '文件路径',
      },
      status: {
        type: INTEGER(1),
        allowNull: false,
        comment: '破解状态',
        defaultValue: TaskStatus.notStart,
      },
      reason: {
        type: TEXT,
        allowNull: true,
        comment: '失败原因',
      },
      key: {
        type: STRING(200),
        allowNull: true,
        comment: '破解码',
      },
      useRule: {
        type: INTEGER(2),
        allowNull: false,
        comment: '破解使用的规则',
      },
    },
    {
      freezeTableName: true,
      comment: '破解任务表',
      indexes: [ // 定义索引
        {
          name: 'email',
          method: 'BTREE',
          fields: [ 'email' ],
        },
        {
          name: 'status',
          method: 'BTREE',
          fields: [ 'status' ],
        },
      ],
    }
  );
  return Task;
};

