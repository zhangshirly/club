var _ = require('lodash');
var validator = require('validator');
var eventproxy = require('eventproxy');
var utility = require('utility');
var uuid = require('node-uuid');
var mail = require('../common/mail');
var tools = require('../common/tools');
var authMiddleWare = require('../middlewares/auth');
var Invite = require('../proxy').Invite;
var User = require('../proxy').User;
var config = require('../config'); 

/**
 * get 发送邀请页
 */
exports.showSend = function(req, res, next) {
    res.render('invite/send');
};

/**
 * post 发送邀请
 */
exports.send = function(req, res, next) {
    var author = req.session.user;
    var inviteInfo = {
        author: author, 
        email: validator.trim(req.body.email).toLowerCase(), 
        name: validator.trim(req.body.name),  
        company: validator.trim(req.body.company), 
        team: validator.trim(req.body.team), 
        phrase: validator.escape(validator.trim(req.body.phrase))
    }; 
    var ep = new eventproxy();
    ep.fail(next);
    ep.on('prop_err', function (msg) {
        res.status(422);
        res.render('invite/send', _.extend({
            error: msg
        }, inviteInfo));
    });

    // 验证信息的正确性
    if (!validator.isEmail(inviteInfo.email)
        || !config.regExps.name.test(inviteInfo.name)
    ) {
        return ep.emit('prop_err', '');
    }
    User.getUserByMail(inviteInfo.email, function(err, user) {
        if (err) {
            return next(err); 
        }
        if (user) {
            return ep.emit('prop_err', '邮箱已被注册');
        }
        inviteInfo.token = uuid.v4();
        Invite.newAddSave(inviteInfo, function(err) {
            if (err) {
                return next(err); 
            }
            mail.sendInviteMail(
                inviteInfo.email,
                inviteInfo.token, 
                author.name || author.loginname,
                inviteInfo.phrase
            );
            res.render('invite/send', _.extend({
                success: [
                    '邀请已成功发送给',
                    inviteInfo.email, 
                    inviteInfo.name ? '(' + inviteInfo.name + ')' : ''
                ].join('')
            })); 
        }); 
    });
};

/**
 * get 接受邀请页
 */
exports.showAccept = function(req, res, next) {
    var token = req.query.key || '';
    var ep = new eventproxy();
    ep.fail(next);
    ep.on('prop_err', function (msg) {
        res.status(422);
        res.render('invite/acceptInvalid', {
            error: msg
        });
    });
    // 已登录
    if (req.session.user) {
        return ep.emit('prop_err', '您已登录');
    }
    Invite.getInviteByToken(token, function(err, invite) {
        if (err) {
            return next(err);
        }
        if (!invite || invite.status !== Invite.STATUS.WAIT_ACCEPT) {
            return ep.emit('prop_err', '无效邀请');
        } else {
            res.render('invite/accept', _.extend({
                key: token
            }, invite.toObject()));
        }
    });
};

/**
 * post 接受邀请
 */
exports.accept = function(req, res, next) {
    var token = req.body.key || '';
    var userInfo = {
        email: validator.trim(req.body.email || '').toLowerCase(), 
        name: validator.trim(req.body.name || ''),  
        company: validator.trim(req.body.company || ''), 
        team: validator.trim(req.body.team || ''), 
        loginname: validator.trim(req.body.loginname || ''),
        pass: validator.trim(req.body.pass || '')
    }; 
    var ep = new eventproxy();
    ep.fail(next);
    ep.on('prop_err', function (msg) {
        res.status(422);
        res.render('invite/accept', _.extend({
            key: token,
            error: msg
        }, userInfo));
    });
    ep.on('fatal_err', function (msg) {
        res.status(422);
        res.render('invite/acceptInvalid', {
            error: msg
        });
    });
    // 验证信息的正确性
    if (!validator.isEmail(userInfo.email)
        || !config.regExps.name.test(userInfo.name)
        || !config.regExps.loginname.test(userInfo.loginname)
        || !config.regExps.pass.test(userInfo.pass)
        || !config.regExps.company.test(userInfo.company)
        || !config.regExps.team.test(userInfo.team)
    ) {
        return ep.emit('prop_err', '');
    }
    Invite.acceptInviteByToken(token, function(err, invite) {
        if (err) {
           return next(err); 
        }
        if (!invite) {
            return ep.emit('fatal_err', '无效邀请。');
        }
        User.getUsersByQuery(
            {
                '$or': [
                    {'loginname': userInfo.loginname},
                    {'email': userInfo.email}
                ]
            }, 
            {}, 
            function (err, users) {
                if (err) {
                  return next(err);
                }
                if (users.length > 0) {
                  return ep.emit('prop_err', '用户名或邮箱已被使用。');
                }
                tools.bhash(userInfo.pass, ep.done(function(passhash) {
                    userInfo.pass = passhash; 
                    userInfo.avatar_url =  User.makeGravatar(userInfo.email);
                    saveUser();
                })); 
            }
        );
    });
    function saveUser() {
        userInfo.active = true; // 不需要激活
        User.newAndSaveWithAll(userInfo, function (err, user) {
            if (err) {
                return next(err);
            }
            // store session cookie
            authMiddleWare.gen_session(user, res);
            req.session.user = user; 
            var refer = '/';  // 始终去首页
            res.redirect(refer);
        });
    }
};
