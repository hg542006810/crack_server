'use strict';

const { KeyStatus, KeyType } = require('../common/constant');

module.exports = app => {
  const { STRING, INTEGER } = app.Sequelize;

  // key
  const Key = app.model.define(
    'key',
    {
      key: {
        type: STRING(200),
        primaryKey: true,
        allowNull: false,
        comment: 'key值',
      },
      times: {
        type: INTEGER,
        allowNull: false,
        comment: '可破解次数',
      },
      timeout: {
        type: INTEGER,
        allowNull: false,
        comment: '可用时长',
      },
      type: {
        type: INTEGER(1),
        allowNull: false,
        comment: '破解码类型',
        defaultValue: KeyType.rule,
      },
      status: {
        type: INTEGER(1),
        allowNull: false,
        comment: '状态',
        defaultValue: KeyStatus.accept,
      },
    },
    {
      freezeTableName: true,
      comment: '破解码',
    }
  );
  return Key;
};

