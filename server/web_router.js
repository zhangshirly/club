/*!
 * nodeclub - route.js
 * Copyright(c) 2012 fengmk2 <fengmk2@gmail.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var express = require('express');
var sign = require('./controllers/sign');
var site = require('./controllers/site');
var user = require('./controllers/user');
var message = require('./controllers/message');
var topic = require('./controllers/topic');
var publish = require('./controllers/publish');
var draft = require('./controllers/draft');
var reply = require('./controllers/reply');
var rss = require('./controllers/rss');
var invite = require('./controllers/invite');
var issue = require('./controllers/issue');
var schedule = require('./controllers/schedule');
var importlink = require('./controllers/importlink');
var staticController  = require('./controllers/static');
var auth = require('./middlewares/auth');
var limit = require('./middlewares/limit');
var github = require('./controllers/github');
var search = require('./controllers/search');
var marktang = require('./controllers/marktang');
var team = require('./controllers/team');
var follow = require('./controllers/follow');
var weibo = require('./controllers/weibo');
var admin = require('./controllers/admin');
var passport = require('passport');
var passportWeibo = require('passport-weibo');
var passportWechat = require('passport-wechat');
var WeiboStrategy = passportWeibo.Strategy;
var WechatStrategy = passportWechat.Strategy;
var configMiddleware = require('./middlewares/conf');
var config = require('./config');
var wechatBind = require('./controllers/wechatBind');

var router = express.Router();

// home page
router.get('/', site.index);
router.get('/baidu_verify_KputUQ9DeD.html', site.baidu_verify);
router.get('/googlee6712631ad5156c9.html', site.google_verify);
router.get('/tab/:tab', site.index);
router.get('/issue', site.issue);
router.get('/activity', site.activity);
router.get('/topics/latestTopics', site.latestTopics);
router.post('/search', site.search);  // 全站搜索
router.get('/sort/:sort', site.index);
router.get('/topics/latestTopics/sort/:sort', site.latestTopics);

// sitemap
router.get('/sitemap.xml', site.sitemap);

// sign controller
if (config.allow_sign_up) {
  router.get('/signup', sign.showSignup);  // 跳转到注册页面
  router.post('/signup', sign.signup);  // 提交注册信息
} else if (config.allow_sign_up === "github"){
  router.get('/signup', configMiddleware.github, passport.authenticate('github'));  // 进行github验证
} else {
  router.get('/signup', sign.showLogin);  // 跳转到注册页面
  router.post('/signup', sign.showLogin);  // 提交注册信息
}
router.get('/signout', sign.signout);  // 登出
router.get('/signin', sign.showLogin);  // 进入登录页面
router.post('/signin', sign.login);  // 登录校验
router.get('/domainauth/:uin/:skey/:accessToken', sign.loginByCookie);  // 登录校验
router.get('/active_account', sign.active_account);  //帐号激活

router.get('/search_pass', sign.showSearchPass);  // 找回密码页面
router.post('/search_pass', sign.updateSearchPass);  // 更新密码
router.get('/reset_pass', sign.reset_pass);  // 进入重置密码页面
router.post('/reset_pass', sign.update_pass);  // 更新密码

// user controller
router.get('/user/:name', user.index); // 用户个人主页
router.get('/setting', auth.userRequired, user.showSetting); // 用户个人设置页
router.get('/setting/:group', auth.userRequired, user.showSetting); // 用户个人设置页
router.post('/setting', auth.userRequired, user.setting); // 提交个人信息设置
router.post('/setting/upload', auth.userRequired, user.upload); // 提交上传头像
router.post('/setting/:group', auth.userRequired, user.setting); // 提交个人信息设置
router.get('/stars', user.show_stars); // 显示所有达人列表页
router.get('/users/top100', user.top100);  // 显示积分前一百用户页
router.get('/user/:name/collections', user.get_collect_topics);  // 用户收藏的所有话题页
router.get('/user/:name/topics', user.list_topics);  // 用户发布的所有话题页
router.get('/user/:name/replies', user.list_replies);  // 用户参与的所有回复页
router.post('/user/set_star', auth.adminRequired, user.toggle_star); // 把某用户设为达人
router.post('/user/cancel_star', auth.adminRequired, user.toggle_star);  // 取消某用户的达人身份
router.post('/user/:name/block', auth.adminRequired, user.block);  // 禁言某用户
router.post('/user/:name/delete_all', auth.adminRequired, user.deleteAll);  // 删除某用户所有发言
router.get('/user/:name/activity', auth.userRequired, user.getUserActivity); // 用户动态
router.get('/user/:name/get_user_info', user.getUserInfo); // 用户动态
// message controler
router.get('/my/messages', auth.userRequired, message.index); // 用户个人的所有消息页

// topic

// 新建文章界面
router.get('/topic/create', auth.userRequired, topic.create);
router.post('/topic/create', auth.userRequired, topic.create);
// 转载
router.post('/topic/reprint', auth.userRequired, topic.reprint);

router.get('/topic/listmy', auth.userRequired, topic.listmy);
router.get('/topic/listmyforkm', auth.userRequired, topic.listmyforkm);
router.get('/topic/:tid', topic.index);  // 显示某个话题
router.post('/topic/:tid/top/:is_top?', auth.adminRequired, topic.top);  // 将某话题置顶
router.post('/topic/:tid/good/:is_good?', auth.adminRequired, topic.good); // 将某话题加精
router.get('/topic/:tid/edit', auth.userRequired, topic.showEdit);  // 编辑某话题
router.get('/topic/:tid/get', auth.userRequired, topic.get); // ajax get topic detail

router.post('/topic/:tid/delete', auth.userRequired, topic.delete);

// 保存新建的文章
router.post('/topic/save', auth.userRequired, limit.postInterval, topic.put);

router.post('/topic/:tid/edit', auth.userRequired, topic.update);
router.post('/topic/collect', auth.userRequired, topic.collect); // 关注某话题

router.post('/draft/autosave', auth.userRequired, draft.autosave); 
router.get('/draft/countmy', auth.userRequired, draft.countmy); 
router.get('/draft/listmy', auth.userRequired, draft.listmy); 
router.post('/draft/delete/:id', auth.userRequired, draft.delete); 
router.get('/draft/get/:id', auth.userRequired, draft.get); 

//marktang相关
router.get('/marktang/', auth.userRequired, marktang.index); // 马克糖首页
router.get('/marktang/index', auth.userRequired, marktang.index); // 马克糖首页
router.post('/marktang/html', auth.userRequired, marktang.md2html); // gen html content
router.post('/marktang/save', auth.userRequired, marktang.save); // gen html content
router.get('/marktang/evernote', auth.userRequired, marktang.evernote); // 获取auth uri for evernote
router.get('/marktang/evernote_callback', auth.userRequired, marktang.evernote_callback); // 获取access_token for evernote
router.post('/marktang/evernote_save', auth.userRequired, marktang.evernote_save); // save evernote 
router.get('/marktang/evernote_getnote', auth.userRequired, marktang.evernote_getnote); //

// reply controller
router.post('/:topic_id/reply', auth.userRequired, limit.postInterval, reply.add); // 提交一级回复
router.get('/reply/:reply_id/edit', auth.userRequired, reply.showEdit); // 修改自己的评论页
router.post('/reply/:reply_id/edit', auth.userRequired, reply.update); // 修改某评论
router.post('/reply/:reply_id/delete', auth.userRequired, reply.delete); // 删除某评论
router.post('/reply/:reply_id/up', auth.userRequired, reply.up); // 为评论点赞
router.post('/upload', auth.userRequired, topic.upload); //上传图片

// static
router.get('/about', staticController.about);
router.get('/faq', staticController.faq);
router.get('/getstart', staticController.getstart);
router.get('/robots.txt', staticController.robots);
router.get('/api', staticController.api);

//rss
router.get('/rss', rss.index);
router.get('/rss/:name', rss.user);

//importlink
router.get('/importlink/getPageInfo', importlink.getPageInfo);


// github oauth
router.get('/auth/github', configMiddleware.github, passport.authenticate('github'));
router.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/signin' }),
  github.callback);
router.get('/auth/github/new', github.new);
router.post('/auth/github/create', github.create);

router.get('/search', search.index);

router.get('/invite/send', auth.userRequired, invite.showSend);
router.post('/invite/send', auth.userRequired, invite.send);
router.get('/invite/accept', invite.showAccept);
router.post('/invite/accept', invite.accept);

router.get('/team/import', team.showImport);
router.post('/team/import', team.import);
router.get('/team/companyComplete', team.companyComplete);
router.get('/team/teamComplete', team.teamComplete);

router.post('/follow/follow', follow.follow);
router.post('/follow/masterFollowInfo', follow.masterFollowInfo);

// admin
router.get('/admin/topic/gen_summary', topic.genAllSummary );
router.get('/admin/reply/gen_text', reply.genAllText); 

passport.use(new WeiboStrategy({
    clientID: config.weibo.appKey,
    clientSecret: config.weibo.appSecret,
    callbackURL: config.weibo.authCallback
  },
  function(accessToken, refreshToken, profile, done) {
  	console.log(profile);
    // User.findOrCreate({ weiboId: profile.id }, function (err, user) {
    //   return done(err, user);
    // });
  }
));

// weibo auth
router.get('/auth/weibo/auth', passport.authenticate('weibo'));
router.get('/auth/weibo/unauth', weibo.unauth);
router.get('/auth/weibo/auth_back', passport.authenticate('weibo', { failureRedirect: '/sigin' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  });

passport.use(new WechatStrategy({
        appID: config.wechat_validate.appid,
        name: 'wechat',
        appSecret: config.wechat_validate.encodingAESKey,
        client: 'web',
        callbackURL: 'http://tuateam.org/auth/wechat/auth_back',
        scope: 'snsapi_userinfo',
        state: 'wechat'
    },
    function(accessToken, refreshToken, profile, done) {
        return done(err,profile);
    }
));

// wechat auth
router.get('/auth/wechat/auth', passport.authenticate('wechat'));
// router.get('/auth/wechat/unauth', wechat.unauth);
router.get('/auth/wechat/auth_back', passport.authenticate('wechat', { failureRedirect: '/sigin' }),
    function(req, res) {
        // Successful authentication, redirect home.
        res.redirect('/');
    });

//wechatBind
router.get('/wechatBind', wechatBind.bind);

//admin
router.get('/admin/topic/all', auth.adminRequired, admin.topic);  //  话题管理
router.get('/admin/user/all', auth.adminRequired, admin.user);  //  用户管理
router.get('/admin/reply/all', auth.adminRequired, admin.reply);  //  评论管理
router.get('/admin/topic/:tab', auth.adminRequired, admin.topic);  //  话题分类
router.get('/admin/:name/edit', auth.adminRequired, admin.editUser);  //  编辑用户信息
router.post('/admin/user/save', auth.adminRequired, admin.saveUser);  //  保存用户信息
router.get('/admin/reply/:tid', auth.adminRequired, admin.replyForTopic);  //  某个话题下的评论
router.get('/admin/banner/all', auth.adminRequired, admin.banner); // 获取banner
router.get('/admin/banner/add', auth.adminRequired, admin.addBanner); // 增加banner
router.post('/admin/banner/save', auth.adminRequired, admin.saveBanner); // 保存banner
router.post('/admin/banner/delete', auth.adminRequired, admin.removeBanner); // 删除banner
router.get('/admin/edit/:bid', auth.adminRequired, admin.editBanner); // 编辑banner

router.get('/admin/activity/all', auth.adminRequired, admin.activity);
router.get('/admin/activity/add', auth.adminRequired, admin.addActivity);
router.post('/admin/activity/save', auth.adminRequired, admin.saveActivity); 
router.get('/activity/edit/:acid', auth.adminRequired, admin.editActivity); 
router.post('/admin/activity/delete', auth.adminRequired, admin.removeActivity); // 删除banner

module.exports = router;
