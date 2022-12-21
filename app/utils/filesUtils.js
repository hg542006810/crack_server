'use strict';

const fs = require('fs');
const path = require('path');
const isEmpty = require('lodash/isEmpty');

// 递归创建目录 同步方法
const mkdirsSync = dirname => {
  if (fs.existsSync(dirname)) {
    return true;
  }
  if (mkdirsSync(path.dirname(dirname))) {
    fs.mkdirSync(dirname);
    return true;
  }
};

// 移除文件
const removeFile = dir => {
  if (isEmpty(dir)) {
    return;
  }
  // 不能移除默认目录
  if (dir.includes('default')) {
    return;
  }
  try {
    // 判断文件是否存在
    fs.accessSync(dir);
    fs.unlinkSync(dir);
  } catch (err) {
    return false;
  }
};


module.exports = {
  mkdirsSync,
  removeFile,
};
