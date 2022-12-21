'use strict';

const crypto = require('crypto');
const isInteger = require('lodash/isInteger');

/**
 * md5加密
 */
const md5 = (str, times) => {
  // 默认加密5次
  times = (times && isInteger(times)) ? times : 5;
  const hash = crypto.createHash('md5');
  for (let i = 0; i < times; i++) {
    hash.update(str);
  }
  return hash.digest('hex');
};

// Base64
function base64(value) {
  return Buffer.from(value).toString('base64');
}

// hmacsha1
function hmacsha1(secret, value) {
  return crypto.createHmac('sha1', secret).update(value, 'utf8').digest()
    .toString('base64');
}

module.exports = {
  md5,
  base64,
  hmacsha1,
};

