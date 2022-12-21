'use strict';
const Response = require('../dto/response');

module.exports = () => {
  return async function notFoundHandler(ctx, next) {
    await next();
    if (ctx.status === 404 && !ctx.body) {
      ctx.status = 404;
      ctx.body = Response.error({ message: '404 Not Found' });
    }
  };
};
