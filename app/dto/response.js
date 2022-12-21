'use strict';

// 返回给前端的格式
class Response {

  static success({ data, message, code }) {
    return { success: true, message: message || '操作成功!', data, code };
  }

  static error({ data, message, code }) {
    return { success: false, message, data, code };
  }

  static notLoginResult() {
    return { success: false, message: '未登录授权!', data: null, code: 401 };
  }
}

module.exports = Response;
