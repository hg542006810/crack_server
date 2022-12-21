'use strict';

module.exports = app => {
  const { STRING, BIGINT, BOOLEAN } = app.Sequelize;

  // 破解码使用记录
  const KeyRecord = app.model.define(
    'key_record',
    {
      id: { type: BIGINT(64), primaryKey: true, allowNull: false, defaultValue: 0 },
      key: {
        type: STRING(200),
        primaryKey: true,
        allowNull: false,
        comment: 'key值',
      },
      taskId: {
        type: BIGINT(64),
        allowNull: false,
        comment: '任务id',
      },
      isBack: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否退回',
      },
    },
    {
      freezeTableName: true,
      comment: '破解码使用记录',
    }
  );

  return KeyRecord;
};

