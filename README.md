Nodeclub
=

[![build status][travis-image]][travis-url]
[![Coverage Status](https://img.shields.io/coveralls/cnodejs/nodeclub.svg?style=flat-square)](https://coveralls.io/r/cnodejs/nodeclub?branch=master)
[![David deps][david-image]][david-url]
[![node version][node-image]][node-url]

[![Gitter](https://badges.gitter.im/Join Chat.svg)](https://gitter.im/cnodejs/nodeclub?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[travis-image]: https://img.shields.io/travis/cnodejs/nodeclub.svg?style=flat-square
[travis-url]: https://travis-ci.org/cnodejs/nodeclub
[david-image]: https://img.shields.io/david/cnodejs/nodeclub.svg?style=flat-square
[david-url]: https://david-dm.org/cnodejs/nodeclub
[node-image]: https://img.shields.io/badge/node.js-%3E=_0.10-green.svg?style=flat-square
[node-url]: http://nodejs.org/download/

## 介绍

Nodeclub 是使用 **Node.js** 和 **MongoDB** 开发的社区系统，界面优雅，功能丰富，小巧迅速，
已在Node.js 中文技术社区 [CNode(http://cnodejs.org)](http://cnodejs.org) 得到应用，但你完全可以用它搭建自己的社区。

## 安装部署

*不保证 Windows 系统的兼容性*

```
1. install `node.js` `mongodb`
2. run mongod
3. `$ make install` 安装 Nodeclub 的依赖包
4. `$ make test` 确保各项服务都正常
5. `$ node app.js`
6. visit `localhost:3000`
7. done!
```
note: mathmode depends on texlive texlive-latex-extra graphicsmagick

## 开发调试
```bash
$gulp dev 或 gulp 	//启动watch开发调试
$gulp dist //构建打包并自动部署发布
```
### 开发环境管理员账号： aaa   密码： 123456

## 其他

跑测试

```bash
$ make test
```

跑覆盖率测试

```bash
$ make test-cov
```


## 目录结构说明
**api** : 目前系统是支持用户或者第三方通过token进行读写操作的，这个目录即提供对应公开的API方法

**bin**: 本地的命令行集合，目前里面只有一个为老用户产生token的bin，暂时不做其他用户。

**common**: 公共文件目录

**controller**: 控制层代码，基本逻辑编写均在这里

**middleware**: 中间件，提供通用能力

**models**: 数据模型层

**proxy**:  工具代理，暂未使用

**public**:  静态资源目录 

**views**:  HTML模板目录

> views里面目录基本是按照模块来划分子目录，其中static比较特殊，是用于纯静态展示的；marktang适用于和md.imweb.io相结合的

**test**:  测试目录


## 需要注意的问题

**layout.html**: 默认情况下，所有的res.render都会包裹在layout.html里，可以通过 _layoutFile:false清除，eg:  res.render('marktang/index', {title:"欢迎使用马克糖",_id:'',_layoutFile:false});

