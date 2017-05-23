var User = require('../proxy').User;
var Topic = require('../proxy').Topic;
var Reply = require('../proxy').Reply;
var TopicCollect = require('../proxy').TopicCollect;
var utility = require('utility');
var util = require('util');
var TopicModel = require('../models').Topic;
var ReplyModel = require('../models').Reply;
var store = require('../common/store');

var tools = require('../common/tools');
var dataAdapter = require('../common/dataAdapter');
var config = require('../config');
var EventProxy = require('eventproxy');
var validator = require('validator');
var utility = require('utility');
var _ = require('lodash');
var qrcode = require('yaqrcode');

exports.index = function(req, res, next) {
    var user_name = req.params.name;
    var ep = EventProxy.create();
    ep.fail(next);
    ep.on('fail', function(code, msg) {
        ep.unbind();
        res.render('notify/notify', {
            error: msg || '',
            code: code
        });
    });
    User.getUserByLoginName(user_name, ep.done(function(user) {
        if (!user) {
            return ep.emit('fail', 404, '这个用户不存在。');
        }
        ep.emit('user', user);
    }));
    ep.all('user', function(user) {
        Topic.getAuthorTopicCount(user._id, ep.done('topic_counts'));
        getUserActivity(user._id, null, 5, ep.done('activity'));
    });
    ep.all(
        'user', 'topic_counts', 'activity',
        function(user, topic_counts, activity) {
            user.friendly_create_at = tools.formatDate(user.create_at, true);
            user.url = (function() {
                if (user.url && user.url.indexOf('http') !== 0) {
                    return 'http://' + user.url;
                }
                return user.url;
            })();
            // 如果用户没有激活，那么管理员可以帮忙激活
            var token = '';
            if (!user.active && req.session.user && req.session.user.is_admin) {
                token =
                    utility.md5(user.email + user.pass + config.session_secret);
            }
            res.render('user/index', {
                user: user,
                outUser: dataAdapter.outUser(user),
                activity: activity,
                topicCounts: topic_counts,
                token: token,
                pageTitle: util.format('%s 的个人主页', user.loginname),
                bodyClass: 'body-sidebar-left'
            });
        }
    );
};

function formatAvatar(url) {
        // www.gravatar.com 被墙
        url = url.replace('//www.gravatar.com', '//gravatar.com');
        // 让协议自适应 protocol
        if (url.indexOf('http:') === 0) {
            url = url.slice(5);
        }

        //如果没有gravatar头像，则用默认
        if (url.indexOf("gravatar.com") >= 0 && url.indexOf("d=retro") < 0) {
            url += "&d=retro";
        }
        // 如果是 github 的头像，则限制大小
        if (url.indexOf('githubusercontent') !== -1) {
            url += '&s=120';
        }
        return url;
    }
    /**
     * 获取用户信息
     */
exports.getUserInfo = function(req, res, next) {
        var user_name = req.params.name 
            || (req.session && req.session.user && req.session.user.loginname);
        var ep = new EventProxy();
        ep.fail(next);

        function html_encode(str) {
            var s = "";
            if (str.length == 0) return "";
            s = str.replace(/&/g, "&gt;");
            s = s.replace(/</g, "&lt;");
            s = s.replace(/>/g, "&gt;");
            s = s.replace(/ /g, "&nbsp;");
            s = s.replace(/\'/g, "&#39;");
            s = s.replace(/\"/g, "&quot;");
            s = s.replace(/\n/g, "<br>");
            return s;
        }

        User.getUserByLoginName(user_name, function(err, user) {
            if (err) {
                return next(err);
            }
            if (!user) {
                res.send({
                    ret: 400,
                    data: null
                });
                return;
            }

            var result = {
                "name": user.name || user.loginname,
                "avatar": formatAvatar(user.avatar).replace("size=48", "size=120"),
                "say": user.say,
                "company": user.company,
                "location": user.location,
                "signature": user.signature,
                "reply_count": user.reply_count,
                "score": user.score,
                "topic_count": user.topic_count,
                "following_count": user.following_count,
                "follower_count": user.follower_count,
                "reprint": user.reprint
            };
            ep.emit('user', result);
            Topic.queryAuthorTopic(user._id, +new Date(), 100, ep.done('topic'));
        });

        ep.all('topic', 'user', function(topic, user) {
            for (var i = 0, len = topic.length; i < len; i++) {
                topic[i].summary = html_encode(topic[i].summary);
            }
            user.topic = topic;
            res.send({
                ret: 0,
                data: user
            });

        });
    }
    /**
     * 获取动态
     */
exports.getUserActivity = function(req, res, next) {
    var beforeTime = req.query.beforeTime || +new Date();
    var limit = req.query.limit || 10;
    limit = limit > 0 && limit <= 100 ? limit : 10;
    var user_name = req.params.name;
    User.getUserByLoginName(user_name, function(err, user) {
        if (err) {
            return next(err);
        }
        if (!user) {
            res.send({
                ret: 400,
                data: null
            });
            return;
        }
        getUserActivity(user._id, beforeTime, limit, function(err, data) {
            if (err) {
                return next(err);
            }
            res.send({
                ret: 0,
                data: data
            });
        });
    });
};

function getUserActivity(userId, beforeTime, limit, callback) {
    beforeTime = beforeTime || Date.now();
    var ep = new EventProxy();
    ep.fail(callback);

    Topic.queryAuthorTopic(userId, beforeTime, limit + 1, ep.done('topic'));
    Reply.queryAuthorReply(userId, beforeTime, limit + 1, ep.done('reply'));

    ep.all('topic', 'reply', function(topic, reply) {
        var outTopic = _.map(topic, function(item) {
            var out = dataAdapter.outTopic(item);
            out._type = 'topic';
            return out;
        });
        var outReply = _.map(reply, function(item) {
            var out = dataAdapter.outReply(item);
            out._type = 'reply';
            out.topic = dataAdapter.outTopic(item.topic_id);
            return out;
        });
        var list = _.sortBy([].concat(outTopic, outReply), function(obj) {
            return 0 - obj.create_at;
        });
        var rtList = list.slice(0, limit);
        callback(null, {
            list: rtList,
            hasMore: list.length > limit,
            nextBeforeTime: rtList.length && list.length > limit ? +rtList[rtList.length - 1].create_at : -1
        });
    });
}

function setUserWechatLink (account) {
    var APPID = "appid=" + config.wechat_validate.appid;
    var REDIRECT_URI = "&redirect_uri=http://imweb.io/wechatBind";
    var STATE = "&state=" + account;
    return "https://open.weixin.qq.com/connect/oauth2/authorize?" + APPID + REDIRECT_URI + "&response_type=code&scope=snsapi_userinfo" + STATE + "#wechat_redirect";
}

exports.show_stars = function(req, res, next) {
    User.getUsersByQuery({
        is_star: true
    }, {}, function(err, stars) {
        if (err) {
            return next(err);
        }
        res.render('user/stars', {
            stars: stars
        });
    });
};

exports.showSetting = function(req, res, next) {
    User.getUserById(req.session.user._id, function(err, user) {
        if (err) {
            return next(err);
        }
        user.accessTokenBase64 = qrcode(user.accessToken);
        user.wechat_bind_link = setUserWechatLink(user._id);
        var data = {
            user: user,
            group: req.params.group || 'account'
        };
        if (req.query.save === 'success') {
            data.success = '保存成功。';
        }
        console.log(32);
        res.render('user/setting', data);
    });
};

exports.upload = function(req, res, next) {
    req.busboy.on(
        'file', 
        function(fieldname, file, filename, encoding, mimetype) {
            store.upload(file, {
                filename: filename
            }, function(err, result) {
                if (err) {
                    return next(err);
                }
                res.json({
                    success: true,
                    url: result.url
                });
            });
        }
    );
    req.pipe(req.busboy);
};

exports.setting = function(req, res, next) {
    var updated = {};
    _.each(
        ['url', 'location', 'signature', 'company', 'team', 'pass', 'avatar'],
        function(item) {
            if (req.body[item] !== undefined) {
                updated[item] = validator.trim(req.body[item]);
            }
        }
    );
    var oldPass = req.body.old_pass || '';
    var requirePassCheck = updated.pass !== undefined;
    var ep = new EventProxy();
    ep.fail(next);
    ep.on('fail', function(ret, msg) {
        ep.unbind();
        var data = _.extend({}, updated, dataAdapter.outUserAll(req.session.user), {
            error: msg,
            ret: ret,
            group: req.params.group || 'account',
            pass: ''
        });
        res.render('user/setting', data);
    });

    // input check
    if (updated.company !== undefined && !updated.company) {
        return ep.emit('fail', 300, '');
    }
    if (updated.pass !== undefined && !config.regExps.pass.test(updated.pass)) {
        return ep.emit('fail', 300, '');
    }
    if (updated.avatar !== undefined) {
        // eturn ep.emit('fail', 300, '');
    }

    User.getUserById(req.session.user._id, ep.done(function(user) {
        if (requirePassCheck) {
            tools.bcompare(oldPass, user.pass, ep.done(function(bool) {
                if (!bool) {
                    return ep.emit('fail', 300, '当前密码不正确。');
                }
                tools.bhash(updated.pass, ep.done(function(passhash) {
                    updated.pass = passhash;
                    ep.emit('user', user);
                }));
            }));
        } else {
            ep.emit('user', user);
        }
    }));
    ep.all('user', function(user) {
        _.extend(user, updated);
        user.save(ep.done('user_save'));
    });
    ep.all('user_save', function(user) {
        ep.unbind();
        req.session.user = user.toObject({
            virtual: true
        });
        var url = '/setting';
        if (req.params.group) {
            url = url + '/' + req.params.group;
        }
        return res.redirect(url + '?save=success');
    });

};

exports.toggle_star = function(req, res, next) {
    var user_id = req.body.user_id;
    User.getUserById(user_id, function(err, user) {
        if (err) {
            return next(err);
        }
        if (!user) {
            return next(new Error('user is not exists'));
        }
        user.is_star = !user.is_star;
        user.save(function(err) {
            if (err) {
                return next(err);
            }
            res.json({
                status: 'success'
            });
        });
    });
};

exports.get_collect_topics = function(req, res, next) {
    var name = req.params.name;
    User.getUserByLoginName(name, function(err, user) {
        if (err || !user) {
            return next(err);
        }

        var page = Number(req.query.page) || 1;
        var limit = config.list_topic_count;

        var render = function(topics, pages) {
            res.render('user/collect_topics', {
                topics: topics,
                current_page: page,
                pages: pages,
                user: user
            });
        };

        var proxy = EventProxy.create('topics', 'pages', render);
        proxy.fail(next);

        TopicCollect.getTopicCollectsByUserId(user._id, proxy.done(function(docs) {
            var ids = [];
            for (var i = 0; i < docs.length; i++) {
                ids.push(docs[i].topic_id);
            }
            var query = {
                _id: {
                    '$in': ids
                }
            };
            var opt = {
                skip: (page - 1) * limit,
                limit: limit,
                sort: '-create_at'
            };
            Topic.getTopicsByQuery(query, opt, proxy.done('topics'));
            Topic.getCountByQuery(query, proxy.done(function(all_topics_count) {
                var pages = Math.ceil(all_topics_count / limit);
                proxy.emit('pages', pages);
            }));
        }));
    });
};

exports.top100 = function(req, res, next) {
    var opt = {
        limit: 100,
        sort: '-score'
    };
    User.getUsersByQuery({
        '$or': [{
            is_block: {
                '$exists': false
            }
        }, {
            is_block: false
        }, ]
    }, opt, function(err, tops) {
        if (err) {
            return next(err);
        }
        res.render('user/top100', {
            users: tops,
            pageTitle: 'top100',
        });
    });
};

exports.list_topics = function(req, res, next) {
    var user_name = req.params.name;
    var page = Number(req.query.page) || 1;
    var limit = config.list_topic_count;

    User.getUserByLoginName(user_name, function(err, user) {
        if (!user) {
            res.render('notify/notify', {
                error: '这个用户不存在。'
            });
            return;
        }

        var render = function(topics, pages) {
            user.friendly_create_at = tools.formatDate(user.create_at, true);
            res.render('user/topics', {
                user: user,
                topics: topics,
                current_page: page,
                pages: pages
            });
        };

        var proxy = new EventProxy();
        proxy.assign('topics', 'pages', render);
        proxy.fail(next);

        var query = {
            'author_id': user._id
        };
        var opt = {
            skip: (page - 1) * limit,
            limit: limit,
            sort: '-create_at'
        };
        Topic.getTopicsByQuery(query, opt, proxy.done('topics'));

        Topic.getCountByQuery(query, proxy.done(function(all_topics_count) {
            var pages = Math.ceil(all_topics_count / limit);
            proxy.emit('pages', pages);
        }));
    });
};

exports.list_replies = function(req, res, next) {
    var user_name = req.params.name;
    var page = Number(req.query.page) || 1;
    var limit = 50;

    User.getUserByLoginName(user_name, function(err, user) {
        if (!user) {
            res.render('notify/notify', {
                error: '这个用户不存在。'
            });
            return;
        }

        var render = function(topics, pages) {
            user.friendly_create_at = tools.formatDate(user.create_at, true);
            res.render('user/replies', {
                user: user,
                topics: topics,
                current_page: page,
                pages: pages
            });
        };

        var proxy = new EventProxy();
        proxy.assign('topics', 'pages', render);
        proxy.fail(next);

        var opt = {
            skip: (page - 1) * limit,
            limit: limit,
            sort: '-create_at'
        };
        Reply.getRepliesByAuthorId(user._id, opt, proxy.done(function(replies) {
            // 获取所有有评论的主题
            var topic_ids = replies.map(function(reply) {
                return reply.topic_id;
            });
            topic_ids = _.uniq(topic_ids);
            var query = {
                '_id': {
                    '$in': topic_ids
                }
            };
            Topic.getTopicsByQuery(query, {}, proxy.done('topics'));
        }));

        Reply.getCountByAuthorId(user._id, proxy.done('pages', function(count) {
            var pages = Math.ceil(count / limit);
            return pages;
        }));
    });
};

exports.block = function(req, res, next) {
    var loginname = req.params.name;
    var action = req.body.action;

    var ep = EventProxy.create();
    ep.fail(next);

    User.getUserByLoginName(loginname, ep.done(function(user) {
        if (!user) {
            return next(new Error('user is not exists'));
        }
        if (action === 'set_block') {
            ep.all('block_user',
                function(user) {
                    res.json({
                        status: 'success'
                    });
                });
            user.is_block = true;
            user.save(ep.done('block_user'));

        } else if (action === 'cancel_block') {
            user.is_block = false;
            user.save(ep.done(function() {

                res.json({
                    status: 'success'
                });
            }));
        }
    }));
};

exports.deleteAll = function(req, res, next) {
    var loginname = req.params.name;

    var ep = EventProxy.create();
    ep.fail(next);

    User.getUserByLoginName(loginname, ep.done(function(user) {
        if (!user) {
            return next(new Error('user is not exists'));
        }
        ep.all('del_topics', 'del_replys', 'del_ups',
            function() {
                res.json({
                    status: 'success'
                });
            });
        TopicModel.remove({
            author_id: user._id
        }, ep.done('del_topics'));
        ReplyModel.remove({
            author_id: user._id
        }, ep.done('del_replys'));
        // 点赞数也全部干掉
        ReplyModel.update({}, {
            $pull: {
                'ups': user._id
            }
        }, {
            multi: true
        }, ep.done('del_ups'));
    }));
};
