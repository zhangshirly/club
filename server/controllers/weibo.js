/**
 * @file weibo
 * @author fishineyuan(382184760@qq.com)
 * @date 2015-02-12
 */
var _ = require('lodash');
var querystring = require('querystring');
var EventProxy = require('eventproxy');
var request = require('request');
var tools = require('../common/tools');
var config = require('../config');
var User = require('../proxy').User;

/**
 * weibo认证绑定
 */
exports.auth = function(req, res, next) {
    var state = '';
    return res.redirect(
        'https://api.weibo.com/oauth2/authorize?'
            + querystring.stringify({
                redirect_uri: config.weibo.authCallback,
                response_type: 'code',
                client_id: config.weibo.appKey,
                state: state
            })
    );
};

/**
 * weibo认证回调
 */
exports.auth_back = function(req, res, next) {
    var code = req.query.code;
    var state = req.query.state;
    var ep = EventProxy.create();
    ep.fail(next);
    ep.on('fail', function() {
        ep.unbind();
        console.log("haha");
        res.send({error: true});
    });
    User.getUserById(req.session.user._id, ep.done('user'));
    REST.get_access_token({code: code}, ep.done('token'));
    ep.all('token', function(token) {
        REST.get_user_info(token, ep.done('userInfo'));
    });
    ep.all('user', 'token','userInfo', function(user, token, userInfo) {
        user.weibo = {
            uid: token.uid,
            loginname: userInfo.name,
            code: code,
            token: {
                access_token: token.access_token
            }
        }
        user.save(ep.done(function() {
            req.session.user = user;
            res.render('weibo/auth_back');
        }));
    });
};

/**
 * 解邦weibo
 */
exports.unauth = function(req, res, next) {
    var ep = EventProxy.create();
    ep.fail(next);
    User.getUserById(req.session.user._id, ep.done(function(user) {
        REST.revoke_auth(
            {
                access_token: user.weibo.token.access_token
            }, 
            ep.done(function() {
                user.weibo = null;
                user.save(function() {
                    req.session.user = user;
                    res.redirect(config.setting_binding_page);
                });
            })
        );
    }));
};

var REST = {
    /**
     * 获取token
     */
    get_access_token: function(options, callback) {
        request(
            {
                uri: 'https://api.weibo.com/oauth2/access_token',
                method: 'POST',
                followRedirect: false,
                json: true,
                form: {
                    client_id: config.weibo.appKey,
                    client_secret: config.weibo.appSecret,
                    grant_type: 'authorization_code',
                    code: options.code,
                    redirect_uri: config.weibo.authCallback
                }
            },
            function(error, res, data) {
                if (data && data.access_token && !error) {
                    callback(null, data);
                } else {
                    callback(error || {});
                }
            }
        );
    },

    /**
     * 获取用户信息
     */
    get_user_info: function(options, callback) {
        request(
            {
                uri: 'https://api.weibo.com/2/users/show.json',
                method: 'GET',
                followRedirect: false,
                json: true,
                qs: {
                    access_token: options.access_token,
                    uid: options.uid
                }
            },
            function(error, res, data) {
                if (data && data.name && !error) {
                    callback(null, data);
                } else {
                    callback(error || {});
                }
            }
        );
    },
    
    /**
     * 回收授权
     */
    revoke_auth: function(options, callback) {
        request(
            {
                uri: 'https://api.weibo.com/oauth2/revokeoauth2',
                method: 'GET',
                followRedirect: false,
                json: true,
                qs: {
                    access_token: options.access_token
                }
            },
            function(error, res, data) {
                if (data && data.result && !error) {
                    callback(null, true);
                } else {
                    callback(error || {});
                }
            }
        );
    },

    /**
     * 发布微博
     * 参阅: http://open.weibo.com/wiki/2/statuses/update
     * @param {Object} data 请求参数
     *  {
     *      access_token: '',
     *      status: '', // 要发布的微博文本内容，必须做URLencode，内容不超过140个汉字
     *  }
     */
    update: function(data, callback) {
        request(
            {
                uri: 'https://api.weibo.com/2/statuses/update.json',
                method: 'POST',
                followRedirect: false,
                json: true,
                form: _.extend({
                    source: config.weibo.appKey
                }, data)
            },
            function(error, res, data) {
                if (data && data.id && !error) {
                    callback(null, data);
                } else {
                    callback(error || {});
                }
            }
        );
    }
};

exports.REST = REST;

