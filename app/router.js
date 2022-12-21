'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;

  // 破解文件
  router.post('/api/crack/startCrackFile', controller.crack.startCrackFile);
  // 破解Hash
  router.post('/api/crack/startCrackHash', controller.crack.startCrackHash);
  // 获得所有任务
  router.get('/api/crack/getTask', controller.crack.getTask);
  // 获得任务进度
  router.get('/api/crack/getProgress', controller.crack.getProgress);
  // 杀掉进程
  router.post('/api/crack/killProcess', controller.crack.killProcess);
  // 发送邮件
  router.post('/api/crack/sendEmail', controller.crack.sendEmail);
  // 结束排队
  router.post('/api/crack/queued', controller.crack.queued);

  // 批量生产key
  router.post('/api/key/generateKey', controller.key.generateKey);
  // 获得key
  router.get('/api/key/getKey', controller.key.getKey);
  // 导出key
  router.get('/api/key/exportKey', controller.key.exportKey);

};
