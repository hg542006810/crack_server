'use strict';

const nodemailer = require('nodemailer');
const sample = require('lodash/sample');

const emails = [{
  user: '', // 账号
  pass: '', // 授权码,
}];

// 验证码模板
const passwordTemplate = (auth, text, password) => {
  return {
    from: `"解密" <${auth.user}>`,
    subject: '您的密码已恢复成功',
    html: `
    <head>
    <base target="_blank" />
    <style type="text/css">::-webkit-scrollbar{ display: none; }</style>
    <style id="cloudAttachStyle" type="text/css">#divNeteaseBigAttach, #divNeteaseBigAttach_bak{display:none;}</style>
    <style id="blockquoteStyle" type="text/css">blockquote{display:none;}</style>
    <style type="text/css">
        body{font-size:14px;font-family:arial,verdana,sans-serif;line-height:1.666;padding:0;margin:0;overflow:auto;white-space:normal;word-wrap:break-word;min-height:100px}
        td, input, button, select, body{font-family:Helvetica, 'Microsoft Yahei', verdana}
        pre {white-space:pre-wrap;white-space:-moz-pre-wrap;white-space:-pre-wrap;white-space:-o-pre-wrap;word-wrap:break-word;width:95%}
        th,td{font-family:arial,verdana,sans-serif;line-height:1.666}
        img{ border:0}
        header,footer,section,aside,article,nav,hgroup,figure,figcaption{display:block}
        blockquote{margin-right:0px}
    </style>
</head>
<body tabindex="0" role="listitem">
<table width="700" border="0" align="center" cellspacing="0" style="width:700px;">
    <tbody>
    <tr>
        <td>
            <div style="width:700px;margin:0 auto;border-bottom:1px solid #ccc;margin-bottom:30px;">
                <table border="0" cellpadding="0" cellspacing="0" width="700" height="39" style="font:12px Tahoma, Arial, 宋体;">
                    <tbody><tr><td width="210"></td></tr></tbody>
                </table>
            </div>
            <div style="width:680px;padding:0 10px;margin:0 auto;">
                <div style="line-height:1.5;font-size:14px;margin-bottom:25px;color:#4d4d4d;">
                    <strong style="display:block;margin-bottom:15px;">尊敬的用户：<span style="color:#f60;font-size: 16px;"></span>您好！</strong>
                    <strong style="display:block;margin-bottom:15px;">
                        ${text}<span style="color:#f60;font-size: 24px">${password}</span>
                    </strong>
                </div>
            </div>
        </td>
    </tr>
    </tbody>
</table>
</body>`,
  };
};

// 发送密码
const sendPasswordEmail = async (email, text, password, callback, count = 0) => {
  try {
    const auth = sample(emails);
    const transporter = nodemailer.createTransport({
      host: 'smtp.qq.com',
      secure: false,
      port: 587,
      auth,
    });
    await transporter.sendMail({
      to: email,
      ...passwordTemplate(
        auth,
        text,
        password
      ),
    });
    if (callback) {
      callback();
    }
  } catch (err) {
    // 尝试5次
    if (count >= 5) {
      if (callback) {
        callback();
      }
      throw err;
    }
    // 发送失败 重复发送
    await sendPasswordEmail(email, text, password, callback, count + 1);
  }
};

module.exports = {
  sendPasswordEmail,
  emails,
};
