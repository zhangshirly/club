var _ = require('lodash');
var EventProxy = require('eventproxy');
var cacheManager = require('cache-manager');
var async = require('async');
var config = require('../config');
var User = require('../proxy').User;
var Topic = require('../proxy').Topic;
var tools = require('../common/tools');
var mail = require('../common/mail');
var dataAdapter = require('../common/dataAdapter');

/**
 * 每日推送
 */
exports.pushTopic = function() {
    console.log('push topic');
    var ep = new EventProxy();
    ep.fail(function(err) {
        console.log(err);
    });
    var userTeamTopicGetter = getUserTeamTopicGetter();
    // TODO 分批加载user
    User.listOrderByTeam(0, null, ep.done(function(users) {
        async.eachLimit(users, 20, function(user, callback) {
            async.parallel({
                teamTopic: function(callback) {
                    userTeamTopicGetter(user, callback);
                }
            }, function(err, result) {
                console.log(result);
                if (err || !result) {
                    console.log(err);
                    return callback();
                }
                if (result.teamTopic && result.teamTopic.length) {
                    mail.sendDailyPush({
                        user: user,
                        teamTopic: result.teamTopic
                    });
                }
                callback();
            });
        }, function(err) {
            if (err) {
                return console.log(err);
            }
        });
    })); 
};

/**
 * 获取team top topic
 */
function getUserTeamTopicGetter() {
    // 使用缓存加速查询
    var memoryCache = cacheManager.caching({store: 'memory', max: 100});
    var ttl = 5;
    return function(user, callback) {
        var ep = new EventProxy();
        ep.fail(callback);
        ep.on('done', function(topic) {
            ep.unbind();
            callback(null, topic);
        });
        if (!user.company) {
            return ep.emit('done', []);
        }
        user.team = user.team || '';
        var cacheKey = [user.company, user.team || ''].join('$$*********$$');
        memoryCache.get(cacheKey, ep.done(function(obj) {
            if (obj) {
                return ep.emit('done', obj);
            }
            User.getTeamMember(user.company, user.team, ep.done(function(users) {
                var userIds = _.map(users, function(item) {
                    return item._id;
                });
                Topic.getDailyUserTopic(userIds, ep.done(function(topic) {
                    topic = getTopTopic(topic, 5);
                    memoryCache.set(
                        cacheKey, topic, ttl, ep.done(function() {
                            ep.emit('done', topic);
                        })
                    );
                }));
            }));
        }));
    };
}

/**
 * 筛选出优秀的文章
 * @param {Array.<Object>} topic
 * @param {number} count 最大数目
 * @return {Array.<Object>}
 */
function getTopTopic(topic, count) {
    _.each(topic, function(item) {
        item._score = item.visit_count 
            + item.reply_count * 5
            + item.collect_count * 10
            + item.good ? 1000 : 0 
            + item.top ? 1000 : 0;
    });
    topic = _.sortBy(topic, function(item) {
        return 0 - item._score;
    });
    return topic.slice(0, count);
}
