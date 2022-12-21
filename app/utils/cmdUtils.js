'use strict';
const compact = require('lodash/compact');
const head = require('lodash/head');

// 获得john的命令
const getJohnCmd = (suffix, path) => {
  switch (suffix) {
    case '.xlsx':
    case '.xls':
    case '.doc':
    case '.docx':
    case '.ppt':
    case '.pptx':
      return `office2john.py ${path}`;
    case '.zip':
      return `zip2john ${path}`;
    case '.rar':
      return `rar2john ${path}`;
    case '.pdf':
      return `pdf2john.pl ${path}`;
    case '.7z':
      return `7z2john.pl ${path}`;
    default:
      return null;
  }
};

const getHashCatMode = hash => {
  // hash模式
  let mode = 0;
  const hashArray = compact(hash.split('$'));
  switch (head(hashArray)) {
    case 'RAR5':
    case 'rar5':
      mode = 13000;
      break;
    case 'RAR3':
    case 'rar3':
      mode = 23700;
      break;
    case 'pkzip2':
      mode = 17200;
      break;
    case 'zip2':
      mode = 13600;
      break;
    case 'office': {
      // 获得office版本
      const version = head(compact(hashArray[1].split('*')));
      if (version === '2007') {
        mode = 9400;
      }
      if (version === '2010') {
        mode = 9500;
      }
      if (version === '2013') {
        mode = 9600;
      }
      break;
    }
    case 'pdf':
      mode = 10700;
      break;
    case '7z':
      mode = 11600;
      break;
    default:
      mode = 0;
      break;
  }
  if (mode === 0) {
    return null;
  }
  return mode;
};

// 获得hashCat命令
const getHashCatCmd = (
  hash,
  attackMode = 3,
  output,
  logPath,
  extra = '',
  session,
  mode
) => {
  return `hashcat --force -m ${mode || getHashCatMode(hash)} -a ${attackMode} --session=${session} '${hash}' ${extra} --potfile-disable --quiet --status --status-timer 1 -o ${output} | tee ${logPath}`;
};

module.exports = {
  getJohnCmd,
  getHashCatCmd,
  getHashCatMode,
};
