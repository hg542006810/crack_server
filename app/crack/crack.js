'use strict';

const last = require('lodash/last');
const isEmpty = require('lodash/isEmpty');
const moment = require('moment');
const { mkdirsSync, removeFile } = require('../utils/filesUtils');
const { getHashCatCmd } = require('../utils/cmdUtils');
const spawnSync = require('child_process').spawnSync;
const spawn = require('child_process').spawn;
const fs = require('fs');
const { CacheKey, TaskStatus, UseRule } = require('../common/constant');
const Redis = require('ioredis');
const Sequelize = require('sequelize');
const { DataTypes } = require('sequelize');
const cls = require('cls-hooked');
const toNumber = require('lodash/toNumber');
const { sendPasswordEmail, emails } = require('./email');
const { KeyStatus } = require('../common/constant');
const namespace = cls.createNamespace('sequelize-namespace');
const execSync = require('child_process').execSync;
const path = require('path');
const compact = require('lodash/compact');
const head = require('lodash/head');
Sequelize.Sequelize.useCLS(namespace);

// 获得脚本参数
const uuid = last(
  (process.argv.find(item => item.indexOf('--uuid=') !== -1) || '').split('=')
);
const email = last(
  (process.argv.find(item => item.indexOf('--email=') !== -1) || '').split('=')
);
const type = last(
  (process.argv.find(item => item.indexOf('--type=') !== -1) || '').split('=')
);
const fileName = last(
  (process.argv.find(item => item.indexOf('--fileName=') !== -1) || '').split(
    '='
  )
);
const hash = last(
  (process.argv.find(item => item.indexOf('--hash=') !== -1) || '').split('=')
);
// 获得保存的文件路径
const dictDir = last(
  (process.argv.find(item => item.indexOf('--dictDir=') !== -1) || '').split(
    '='
  )
);
const logDir = last(
  (process.argv.find(item => item.indexOf('--logDir=') !== -1) || '').split('=')
);
// 获得数据库配置
const mysqlHost = last(
  (process.argv.find(item => item.indexOf('--mysqlHost=') !== -1) || '').split(
    '='
  )
);
const mysqlUsername = last(
  (
    process.argv.find(item => item.indexOf('--mysqlUsername=') !== -1) || ''
  ).split('=')
);
const mysqlPassword = last(
  (
    process.argv.find(item => item.indexOf('--mysqlPassword=') !== -1) || ''
  ).split('=')
);
const redisHost = last(
  (process.argv.find(item => item.indexOf('--redisHost=') !== -1) || '').split(
    '='
  )
);
const redisPassword = last(
  (
    process.argv.find(item => item.indexOf('--redisPassword=') !== -1) || ''
  ).split('=')
);
let useRule = last(
  (process.argv.find(item => item.indexOf('--useRule=') !== -1) || '').split(
    '='
  )
);

function exit() {
  // 删除pm2 进程
  execSync(`pm2 delete crack_${uuid}`);
}

if (
  isEmpty(uuid) ||
  isEmpty(hash) ||
  isEmpty(dictDir) ||
  isEmpty(logDir) ||
  isEmpty(mysqlHost) ||
  isEmpty(mysqlUsername) ||
  isEmpty(mysqlPassword) ||
  isEmpty(redisHost) ||
  isEmpty(redisPassword) ||
  isEmpty(email) ||
  isEmpty(type) ||
  isEmpty(useRule)
) {
  exit();
}
useRule = toNumber(useRule);
// redis
const redisConfig = {
  port: 6379,
  host: redisHost,
  password: redisPassword,
  db: 8,
};
const redis = new Redis(redisConfig);

// sequelize
const sequelize = new Sequelize('crack_main', mysqlUsername, mysqlPassword, {
  host: mysqlHost,
  port: 3306,
  dialect: 'mysql',
  timezone: '+08:00',
  dialectOptions: {
    charset: 'utf8mb4',
    dateStrings: true,
    typeCast: true,
    supportBigNumbers: true,
    bigNumberStrings: true,
  },
});
const TaskModel = sequelize.define(
  'task',
  {
    id: {
      type: DataTypes.BIGINT(64),
      primaryKey: true,
      allowNull: false,
      defaultValue: 0,
    },
    hash: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
      comment: '破解的hash值',
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '邮箱',
    },
    fileName: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '文件名',
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '破解出来的密码',
    },
    status: {
      type: DataTypes.INTEGER(1),
      allowNull: false,
      comment: '破解状态',
      defaultValue: TaskStatus.inProgress,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '失败原因',
    },
    key: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: '破解码',
    },
  },
  {
    freezeTableName: true,
    underscored: true,
  }
);

const KeyRecordModel = sequelize.define(
  'key_record',
  {
    id: {
      type: DataTypes.BIGINT(64),
      primaryKey: true,
      allowNull: false,
      defaultValue: 0,
    },
    key: {
      type: DataTypes.STRING(200),
      primaryKey: true,
      allowNull: false,
      comment: 'key值',
    },
    taskId: {
      type: DataTypes.BIGINT(64),
      allowNull: false,
      comment: '任务id',
    },
    isBack: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '是否退回',
    },
  },
  {
    freezeTableName: true,
    underscored: true,
  }
);

const KeyModel = sequelize.define(
  'key',
  {
    key: {
      type: DataTypes.STRING(200),
      primaryKey: true,
      allowNull: false,
      comment: 'key值',
    },
    times: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '可破解次数',
    },
    timeout: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '可用时长',
    },
    status: {
      type: DataTypes.INTEGER(1),
      allowNull: false,
      comment: '状态',
      defaultValue: KeyStatus.accept,
    },
  },
  {
    freezeTableName: true,
    underscored: true,
  }
);

// 获得日志和密码输出路径
const output = `${moment().format('YYYYMMDD')}/${uuid}_result.txt`;
// 日志保存路径
const logPath = `${moment().format('YYYYMMDD')}/${uuid}.log`;
// 创建文件夹
mkdirsSync(`${logDir}/${moment().format('YYYYMMDD')}`);
// 如果是pkzip 获得其mode
const hashArray = compact(hash.split('$'));
let mode = null;
if (head(hashArray) === 'pkzip2') {
  const exec = spawnSync(`hashcat --force '${hash}'`, {
    shell: true,
  });
  const result = exec.stdout.toString();
  if (result.indexOf('17200') !== -1 && mode === null) {
    mode = 17200;
  }
  if (result.indexOf('17210') !== -1 && mode === null) {
    mode = 17210;
  }
  if (result.indexOf('17220') !== -1 && mode === null) {
    mode = 17220;
  }
  if (result.indexOf('17225') !== -1 && mode === null) {
    mode = 17225;
  }
}

if (head(hashArray) === 'RAR3' || head(hashArray) === 'rar3') {
  const exec = spawnSync(`hashcat --force '${hash}'`, {
    shell: true,
  });
  const result = exec.stdout.toString();
  if (result.indexOf('23700') !== -1 && mode === null) {
    mode = 23700;
  }
  if (result.indexOf('23800') !== -1 && mode === null) {
    mode = 23800;
  }
  if (result.indexOf('12500') !== -1 && mode === null) {
    mode = 12500;
  }
}

// 生成hashcat命令
// 纯1-9位数数字
const numberCmd = getHashCatCmd(
  hash,
  3,
  `${logDir}/${output}`,
  `${logDir}/${logPath}`,
  "--increment --increment-min=1 --increment-max=9 '?d?d?d?d?d?d?d?d?d'",
  `${uuid}_number`,
  mode
);
// 通用密码字典
const commonCmd = getHashCatCmd(
  hash,
  0,
  `${logDir}/${output}`,
  `${logDir}/${logPath}`,
  `${dictDir}/通用密码字典/final_pass.txt`,
  `${uuid}_common`,
  mode
);
// 掩码表组合
const hcmaskCmd = getHashCatCmd(
  hash,
  3,
  `${logDir}/${output}`,
  `${logDir}/${logPath}`,
  path.join(__dirname, './common.hcmask'),
  `${uuid}_hcmask`,
  mode
);

// 暴力破解 1-10位大小写字母+数字
const violenceCmd = getHashCatCmd(
  hash,
  3,
  `${logDir}/${output}`,
  `${logDir}/${logPath}`,
  "--increment --increment-min=1 --increment-max=10 -1 '?d?l?u' '?1?1?1?1?1?1?1?1?1?1'",
  `${uuid}_violence`,
  mode
);
if (
  isEmpty(commonCmd) ||
  isEmpty(hcmaskCmd) ||
  isEmpty(numberCmd) ||
  isEmpty(violenceCmd)
) {
  exit();
}

// 破解完毕 保存密码
function savePassword(notfoundCallback) {
  // 读取密码文件
  fs.readFile(
    `${logDir}/${output}`,
    {
      encoding: 'utf-8',
    },
    async (err, password) => {
      if (err) {
        notfoundCallback();
        return;
      }
      // 完成后 删除日志
      removeFile(`${logDir}/${logPath}`);
      // 破解成功 入库
      const passwordText = last(password.split(':')).trim();
      redis.del(`${CacheKey.TaskProgress}:${uuid}`);
      await TaskModel.update(
        { password: passwordText, status: TaskStatus.success },
        { where: { id: uuid } }
      );
      const taskInfo = await TaskModel.findOne({ where: { id: uuid } });
      // 发送邮件给自己人 不用判断
      if (!isEmpty(emails.find(item => item.user === taskInfo.email))) {
        // 发送邮件提醒
        sendPasswordEmail(
          email,
          type === 'file'
            ? `您的文件：${fileName}，已恢复完成，密码为：`
            : `您的Hash：${hash}，已恢复完成，密码为：`,
          passwordText,
          () => {
            exit();
          }
        );
      } else {
        if (isEmpty(taskInfo.key)) {
          sendPasswordEmail(
            email,
            `您的文件：${fileName}，已恢复完成，购买破解码可立即查看密码`,
            '',
            () => {
              exit();
            }
          );
        } else {
          sendPasswordEmail(
            email,
            `您的文件：${fileName}，已恢复完成，密码为：`,
            passwordText,
            () => {
              exit();
            }
          );
        }
      }
    }
  );
}

// 执行进度
function onData(data, useMode, currentProcess) {
  fs.readFile(
    `${logDir}/${output}`,
    {
      encoding: 'utf-8',
    },
    async err => {
      if (!err) {
        return;
      }
      try {
        const array = data.split(/[\n]/);
        let progress = '';
        let speed = '';
        let progressText = '';
        array.forEach(item => {
          if (item.indexOf('Progress.........:') !== -1) {
            progress = last(item.match(/\(([^)]*)\)/));
          }
          const speedStr = 'Speed.#2.........:';
          if (item.indexOf(speedStr) !== -1) {
            speed = item.substring(item.indexOf(speedStr) + speedStr.length, item.indexOf('H/s') + 3).trim();
          }
          const queueStr = 'Guess.Queue......:';
          if (item.indexOf(queueStr) !== -1) {
            progressText = `总进度：${item.substring(item.indexOf(queueStr) + queueStr.length, item.indexOf('(')).trim()}`;
          }
        });
        if (!isEmpty(progress) && !isEmpty(progressText)) {
          // 保存进度
          const result = {
            speed,
            hash,
            progress, // 进度
            progressText,
            message: `使用模式：${useMode}`,
            spawnargs: currentProcess.spawnargs,
          };
          redis.set(
            `${CacheKey.TaskProgress}:${uuid}`,
            JSON.stringify(result),
            'EX',
            60 * 30
          );
        }

      } catch (err1) {
        // json解析异常
      }
    }
  );
}

// 破解失败的操作
async function crackFail(reason) {
  // 破解失败
  await TaskModel.update(
    { status: TaskStatus.failure, reason },
    { where: { id: uuid } }
  );
  redis.del(`${CacheKey.TaskProgress}:${uuid}`);
  // 删除日志
  removeFile(`${logDir}/${logPath}`);
  exit();
}

async function backKey() {
  // 退回次数
  TaskModel.findOne({ where: { id: uuid } }).then(data => {
    if (!isEmpty(data.key)) {
      KeyRecordModel.update(
        {
          isBack: true,
        },
        {
          where: { taskId: uuid, key: data.key },
        }
      );
      KeyModel.update({ status: KeyStatus.used }, { where: { key: data.key } });
    }
  });
}

try {
  // 全部规则
  if (useRule === UseRule.all) {
    // 执行命令
    const numberExec = spawn(numberCmd, {
      shell: true,
    });
    numberExec.on('close', () => {
      savePassword(() => {
        // 如果没有破解成功 则执行常用密码破解
        const hcmaskExec = spawn(hcmaskCmd, {
          shell: true,
        });
        hcmaskExec.on('close', () => {
          // 如果没有破解成功 则执行通用密码破解
          savePassword(() => {
            const commonExec = spawn(commonCmd, {
              shell: true,
            });
            commonExec.on('close', () => {
              // 如果没有破解成功 则执行暴力破解
              savePassword(() => {
                const violenceExec = spawn(violenceCmd, { shell: true });
                violenceExec.on('close', () => {
                  savePassword(() => {
                    crackFail('没有找到对应的密码!');
                  });
                });
                violenceExec.stdout.on('data', function(data) {
                  onData(
                    data.toString(),
                    '1-10位大小写字母+数字暴力破解',
                    violenceExec
                  );
                });
                violenceExec.stderr.on('data', function(err) {
                  if (err.toString().indexOf('Already an instance') !== -1) {
                    return;
                  }
                  // 破解失败
                  crackFail('发生了未知错误');
                  backKey();
                });
              });
            });
            commonExec.stdout.on('data', function(data) {
              onData(data.toString(), '密码字典', commonExec);
            });
            commonExec.stderr.on('data', function(err) {
              if (err.toString().indexOf('Already an instance') !== -1) {
                return;
              }
              // 破解失败
              crackFail('发生了未知错误');
              backKey();
            });
          });
        });
        hcmaskExec.stdout.on('data', function(data) {
          onData(data.toString(), '常用密码组合', hcmaskExec);
        });
        hcmaskExec.stderr.on('data', function(err) {
          if (err.toString().indexOf('Already an instance') !== -1) {
            return;
          }
          // 破解失败
          crackFail('发生了未知错误');
          backKey();
        });
      });
    });
    numberExec.stdout.on('data', function(data) {
      onData(data.toString(), '纯1-9位数数字', numberExec);
    });
    numberExec.stderr.on('data', function(err) {
      if (err.toString().indexOf('Already an instance') !== -1) {
        return;
      }
      // 破解失败
      crackFail('发生了未知错误');
      backKey();
    });
    return;
  }
  // 免费规则 只跑1-8位纯数字
  if (useRule === UseRule.free) {
    const freeRuleCmd = getHashCatCmd(
      hash,
      3,
      `${logDir}/${output}`,
      `${logDir}/${logPath}`,
      "--increment --increment-min=1 --increment-max=8 '?d?d?d?d?d?d?d?d'",
      `${uuid}_free`,
      mode
    );
    const numberExec = spawn(freeRuleCmd, {
      shell: true,
    });
    numberExec.on('close', () => {
      savePassword(() => {
        crackFail('没有找到对应的密码，您可以联系淘宝人工客服，获得更专业的破解服务');
      });
    });
    numberExec.stdout.on('data', function(data) {
      onData(data.toString(), '纯1-8位数数字', numberExec);
    });
    numberExec.stderr.on('data', function(err) {
      if (err.toString().indexOf('Already an instance') !== -1) {
        return;
      }
      // 破解失败
      crackFail('发生了未知错误');
      backKey();
    });
    return;
  }
  // 纯数字规则
  if (useRule === UseRule.pureNumber) {
    const exec = spawn(numberCmd, {
      shell: true,
    });
    exec.on('close', () => {
      savePassword(() => {
        crackFail('没有找到对应的密码!');
      });
    });
    exec.stdout.on('data', function(data) {
      onData(data.toString(), '纯1-9位数数字', exec);
    });
    exec.stderr.on('data', function(err) {
      if (err.toString().indexOf('Already an instance') !== -1) {
        return;
      }
      // 破解失败
      crackFail('发生了未知错误');
      backKey();
    });
    return;
  }
  // 字典规则
  if (useRule === UseRule.dictionary) {
    const exec = spawn(commonCmd, {
      shell: true,
    });
    exec.on('close', () => {
      savePassword(() => {
        crackFail('没有找到对应的密码!');
      });
    });
    exec.stdout.on('data', function(data) {
      onData(data.toString(), '密码字典', exec);
    });
    exec.stderr.on('data', function(err) {
      if (err.toString().indexOf('Already an instance') !== -1) {
        return;
      }
      // 破解失败
      crackFail('发生了未知错误');
      backKey();
    });
    return;
  }
  // 9位小写字母+数字
  if (useRule === UseRule.lowerLetterAndNumber) {
    const cmd = getHashCatCmd(
      hash,
      3,
      `${logDir}/${output}`,
      `${logDir}/${logPath}`,
      "--increment --increment-min=1 --increment-max=9 -1 '?d?l' '?1?1?1?1?1?1?1?1?1'",
      `${uuid}_lowerLetterAndNumber`,
      mode
    );
    const exec = spawn(cmd, {
      shell: true,
    });
    exec.on('close', () => {
      savePassword(() => {
        crackFail('没有找到对应的密码!');
      });
    });
    exec.stdout.on('data', function(data) {
      onData(data.toString(), '9位小写字母+数字', exec);
    });
    exec.stderr.on('data', function(err) {
      if (err.toString().indexOf('Already an instance') !== -1) {
        return;
      }
      // 破解失败
      crackFail('发生了未知错误');
      backKey();
    });
    return;
  }
  // 9位大小写字母+数字
  if (useRule === UseRule.lowerLetterAndUpperLetterAndNumber) {
    const cmd = getHashCatCmd(
      hash,
      3,
      `${logDir}/${output}`,
      `${logDir}/${logPath}`,
      "--increment --increment-min=1 --increment-max=9 -1 '?d?l?u' '?1?1?1?1?1?1?1?1?1'",
      `${uuid}_lowerLetterAndUpperLetterAndNumber`,
      mode
    );
    const exec = spawn(cmd, {
      shell: true,
    });
    exec.on('close', () => {
      savePassword(() => {
        crackFail('没有找到对应的密码!');
      });
    });
    exec.stdout.on('data', function(data) {
      onData(data.toString(), '9位大小写字母+数字', exec);
    });
    exec.stderr.on('data', function(err) {
      if (err.toString().indexOf('Already an instance') !== -1) {
        return;
      }
      // 破解失败
      crackFail('发生了未知错误');
      backKey();
    });
    return;
  }
  // 常用组合 掩码表
  if (useRule === UseRule.commonCombination) {
    const exec = spawn(hcmaskCmd, {
      shell: true,
    });
    exec.on('close', () => {
      savePassword(() => {
        crackFail('没有找到对应的密码!');
      });
    });
    exec.stdout.on('data', function(data) {
      onData(data.toString(), '常用密码组合', exec);
    });
    exec.stderr.on('data', function(err) {
      if (err.toString().indexOf('Already an instance') !== -1) {
        return;
      }
      // 破解失败
      crackFail('发生了未知错误');
      backKey();
    });
    return;
  }
  crackFail('发生未知错误!');
  backKey();
} catch (err) {
  crackFail('当前文件不支持破解!');
  backKey();
}
