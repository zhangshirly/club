var mongoose = require('mongoose');
var UserModel = mongoose.model('User');
var Message = require('../proxy').Message;
var config = require('../config');
var eventproxy = require('eventproxy');
var UserProxy = require('../proxy').User;

/**
 * 需要管理员权限
 */
exports.adminRequired = function(req, res, next) {
    if (!req.session.user) {
        return res.render('notify/notify', {
            error: '你还没有登录。'
        });
    }
    if (!req.session.user.is_admin) {
        return res.render('notify/notify', {
            error: '需要管理员权限。'
        });
    }
    next();
};

/**
 * 需要登录
 * TODO: 这里需要加上对原来路径信息的处理 henry
 */
exports.userRequired = function(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.redirect('/signin');
        //return res.status(403).send('forbidden!');
    }
    next();
};

exports.blockUser = function() {
    return function(req, res, next) {
        if (req.path === '/signout') {
            return next();
        }
        if (req.session.user && req.session.user.is_block && req.method !== 'GET') {
            return res.status(403).send('您已被管理员屏蔽了。有疑问请联系 @webryan。');
        }
        next();
    };
};


function gen_session(user, res) {
    var auth_token = user._id + '$$$$'; // 以后可能会存储更多信息，用 $$$$ 来分隔
    var opts = {
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 30, //cookie 有效期30天
        signed: true,
        httpOnly: true
    };
    if (!config.debug) {
        var host = config.host.split('.').slice(-2).join('.');
        opts.domain = host;
    }
    res.cookie(config.auth_cookie_name, auth_token, opts);
}

function gen_auth(key, token, res) {
    // var auth_token = user._id + '$$$$'; // 以后可能会存储更多信息，用 $$$$ 来分隔
    var opts = {
        path: 'tuateam.org',
        // maxAge: 1000 * 60 * 60 * 24 * 30, //cookie 有效期30天
        httpOnly: true,
        domain: '.tuateam.org',
        secret: config.secretKey
    };

    res.cookie(key, token, opts);
}

function clear_auth(key, res) {
    // var auth_token = user._id + '$$$$'; // 以后可能会存储更多信息，用 $$$$ 来分隔
    var opts = {
        domain: '.tuateam.org'
    };

    res.clearCookie(key, opts);
}

exports.gen_auth = gen_auth;
exports.gen_session = gen_session;
exports.clear_auth = clear_auth;

// 验证用户是否登录
exports.authUser = function(req, res, next) {
    var ep = new eventproxy();
    ep.fail(next);

    if (config.debug && req.cookies['mock_user']) {
        var mockUser = JSON.parse(req.cookies['mock_user']);
        req.session.user = new UserModel(mockUser);
        if (mockUser.is_admin) {
            req.session.user.is_admin = true;
        }
        return next();
    }

    ep.all('get_user', function(user) {
        if (!user) {
            return next();
        }

        user = res.locals.current_user = req.session.user = new UserModel(user);

        if (config.admins.hasOwnProperty(user.loginname)) {
            user.is_admin = true;
        }
        Message.getMessagesCount(user._id, ep.done(function(count) {
            user.messages_count = count;
            next();
        }));

    });

    if (req.session.user) {
        ep.emit('get_user', req.session.user);
    } else {
        var auth_token = req.signedCookies[config.auth_cookie_name];
        if (!auth_token) {
            return next();
        }

        var auth = auth_token.split('$$$$');
        var user_id = auth[0];
        UserProxy.getUserById(user_id, ep.done('get_user'));
    }
};
