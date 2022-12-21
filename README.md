# crack_server

- 基于Eggjs的后台服务
- 破解服务基于HashCat和John the Ripper
- 支持zip、rar、7z、word、excel、ppt、pdf破解
- 可按照不同规则进行破解：纯数字、通用密码字典、掩码表组合、暴力破解
- 每个破解程序都是一个单进程
- 可使用破解码功能限制前端用户必须使用破解码才能进行破解
- 破解成功后可以设置邮件通知
  
## 运行事项

- 需安装HashCat和John the Ripper、并配置环境变量
- 确保office2john.py、pdf2john.pl、7z2john.pl、zip2john、rar2john命令能使用
- 需安装mysql和redis

## 快速开始

```bash
$ npm i
$ npm run dev
$ open http://localhost:7001/
```