'use strict';

// 缓存Key
const CacheKey = {
  TaskProgress: 'TASK:PROGRESS', // 任务进度
};

// 任务状态
const TaskStatus = {
  notStart: 0, // 未开始
  inProgress: 1, // 进行中
  success: 2, // 破解成功
  failure: 3, // 破解失败
  over: 4, // 手动结束
  queueing: 5, // 排队中
};

const KeyStatus = {
  unused: 0, // 未使用
  used: 1, // 已使用
  exhaust: 2, // 已用完
};

const KeyType = {
  rule: 0, // 按现有规则破解
  all: 1, // 使用全部规则破解
  ruleOrAll: 2, // 选择规则或全部规则破解
};

// 破解使用的规则
const UseRule = {
  free: 0, // 免费规则
  pureNumber: 1, // 纯数字
  lowerLetterAndNumber: 2, // 小字母加数字
  lowerLetterAndUpperLetterAndNumber: 3, // 大小写字母加数字
  dictionary: 4, // 密码字典
  commonCombination: 5, // 常用组合
  all: 20, // 所有规则
};

module.exports = { CacheKey, TaskStatus, KeyStatus, KeyType, UseRule };
