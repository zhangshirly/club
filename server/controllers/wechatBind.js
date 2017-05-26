var config = require('../config');
var request = require('request');
var EventProxy = require('eventproxy');
var wechatCenter = require('./wechatCenter');
var User = require('../proxy').User;

exports.bind = function(req, res, next) {
    var code = req.query.code;
    var userId = req.query.state;

    wechatCenter.getUserToken({
        code: code
    }, function(err, result) {
        if (!err && result) {
            var wechatId = result.openid;
            var datas = {
                wechatId : wechatId,
                userId : userId
            };
            User.bindWechatById(datas, function(){
                res.redirect("weixin://profile/gh_926c5ad0ddd1");
            });

        } else {
            console.log(err);
        }
    });
};

exports.login = function(req, res, next) {
    var code = req.query.code;
    var userId = req.query.state;

    wechatCenter.getUserToken({
        code: code
    }, function(err, result) {
        if (!err && result) {
            wechatCenter.getUserInfo(result, function(err, result) {
                if (!err && result) {
                    User.getUserByLoginName(result.nickname, function (err, user) {
                        if (err) {
                            return next(err);
                        }

                        if (!user) {
                            User.newAndSaveWithAll({
                                name: result.nickname,
                                loginname: result.nickname,
                                pass: result.nickname,
                                wechatId:  result.openid,
                                active: true,
                                accessToken: uuid.v4()
                            }, function(err, user){
                                user.save(function (err) {
                                    if (err) {
                                        return next(err);
                                    }
                                    authMiddleWare.gen_session(user, res);
                                    return res.redirect('/');
                                });
                            });
                        } else {
                            user.save(function (err) {
                                if (err) {
                                    return next(err);
                                }
                                authMiddleWare.gen_session(user, res);
                                return res.redirect('/');
                            });
                        }
                    });
                } else {
                    console.log(err);
                }
            });
        } else {
            console.log(err);
        }
    });
};