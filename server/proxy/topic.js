var EventProxy = require('eventproxy');

var _ = require('lodash');
var moment = require('moment');
var models = require('../models');
var Topic = models.Topic;
var User = require('./user');
var Reply = require('./reply');
var tools = require('../common/tools');
var at = require('../common/at');
var config = require('../config');
/**
 * 根据主题ID获取主题
 * Callback:
 * - err, 数据库错误
 * - topic, 主题
 * - author, 作者
 * - lastReply, 最后回复
 * @param {String} id 主题ID
 * @param {Function} callback 回调函数
 */
exports.getTopicById = function(id, callback) {
    var proxy = new EventProxy();
    var events = ['topic', 'author', 'last_reply'];
    proxy.assign(events, function(topic, author, last_reply) {
        if (!author) {
            return callback(null, null, null, null);
        }
        return callback(null, topic, author, last_reply);
    }).fail(callback);

    Topic.findOne({
        _id: id
    }, proxy.done(function(topic) {
        if (!topic) {
            proxy.emit('topic', null);
            proxy.emit('author', null);
            proxy.emit('last_reply', null);
            return;
        }
        proxy.emit('topic', topic);

        User.getUserById(topic.author_id, proxy.done('author'));

        if (topic.last_reply) {
            Reply.getReplyById(topic.last_reply, proxy.done(function(last_reply) {
                proxy.emit('last_reply', last_reply);
            }));
        } else {
            proxy.emit('last_reply', null);
        }
    }));
};

/**
 * 获取关键词能搜索到的主题数量
 * Callback:
 * - err, 数据库错误
 * - count, 主题数量
 * @param {String} query 搜索关键词
 * @param {Function} callback 回调函数
 */
exports.getCountByQuery = function(query, callback) {
    Topic.count(query, callback);
};


/**
 * 获取各个主题的数量
 * Callback:
 * - err, 数据库错误
 * - count, 主题数量
 * @param {String} query 搜索关键词
 * @param {Function} callback 回调函数
 */
exports.getAllTopicCount = function(query, callback) {
    for (var i in config.tabs) {
        var key = config.tabs[i][0];
        var value = config.tabs[i][1];   
    }
    Topic.find(query,'tab', callback);

};

/**
 * 根据关键词，获取主题列表
 * Callback:
 * - err, 数据库错误
 * - count, 主题列表
 * @param {String} query 搜索关键词
 * @param {Object} opt 搜索选项
 * @param {Function} callback 回调函数
 */
exports.getTopicsByQuery = function(query, opt, callback) {
    Topic.find(query, {}, opt, function(err, docs) {
        if (err) {
            return callback(err);
        }
        if (docs.length === 0) {
            return callback(null, []);
        }

        var topics_id = _.pluck(docs, 'id');

        var proxy = new EventProxy();
        proxy.after('topic_ready', topics_id.length, function(topics) {
            // 过滤掉空值
            var filtered = topics.filter(function(item) {
                return !!item;
            });
            return callback(null, filtered);
        });
        proxy.fail(callback);

        topics_id.forEach(function(id, i) {
            exports.getTopicById(id, proxy.group('topic_ready', function(topic, author, last_reply) {
                // 当id查询出来之后，进一步查询列表时，文章可能已经被删除了
                if (topic) {
                    topic.author = author;
                    topic.reply = last_reply;
                    topic.friendly_create_at = tools.formatDate(topic.create_at, true);
                }

                return topic;
            }));
        });
    });
};

// for sitemap
exports.getLimit5w = function(callback) {
    Topic.find({}, '_id', {
        limit: 50000,
        sort: '-create_at'
    }, callback);
};

/**
 * 获取所有信息的主题
 * Callback:
 * - err, 数据库异常
 * - message, 消息
 * - topic, 主题
 * - author, 主题作者
 * - replies, 主题的回复
 * @param {String} id 主题ID
 * @param {Function} callback 回调函数
 */
exports.getFullTopic = function(id, callback) {
    var proxy = new EventProxy();
    var events = ['topic', 'author', 'replies'];
    proxy
        .assign(events, function(topic, author, replies) {
            callback(null, '', topic, author, replies);
        })
        .fail(callback);

    Topic.findOne({
        _id: id
    }, proxy.done(function(topic) {
        if (!topic) {
            proxy.unbind();
            return callback(null, '此话题不存在或已被删除。');
        }
        at.linkUsers(topic.content, proxy.done('topic', function(str) {
            topic.linkedContent = str;
            return topic;
        }));

        User.getUserById(topic.author_id, proxy.done(function(author) {
            if (!author) {
                proxy.unbind();
                return callback(null, '话题的作者丢了。');
            }
            proxy.emit('author', author);
        }));

        Reply.getRepliesByTopicId(topic._id, proxy.done('replies'));
    }));
};

/**
 * 更新主题的最后回复信息
 * @param {String} topicId 主题ID
 * @param {String} replyId 回复ID
 * @param {Function} callback 回调函数
 */
exports.updateLastReply = function(topicId, replyId, callback) {
    Topic.findOne({
        _id: topicId
    }, function(err, topic) {
        if (err || !topic) {
            return callback(err);
        }
        topic.last_reply = replyId;
        topic.last_reply_at = new Date();
        topic.reply_count += 1;
        topic.save(callback);
    });
};

/**
 * 根据主题ID，查找一条主题
 * @param {String} id 主题ID
 * @param {Function} callback 回调函数
 */
exports.getTopic = function(id, callback) {
    Topic.findOne({
        _id: id
    }, callback);
};

/**
 * 将当前主题的回复计数减1，删除回复时用到
 * @param {String} id 主题ID
 * @param {Function} callback 回调函数
 */
exports.reduceCount = function(id, callback) {
    Topic.findOne({
        _id: id
    }, function(err, topic) {
        if (err) {
            return callback(err);
        }

        if (!topic) {
            return callback(new Error('该主题不存在'));
        }

        topic.reply_count -= 1;
        topic.save(callback);
    });
};

exports.newAndSave = function(title, type, content, tab, reprint, authorId, callback) {
    type = type || 0;
    var topic = new Topic();
    topic.type = type;
    topic.title = title;
    topic.content = content;
    topic.pic = tools.genTopicPic(content);
    topic.summary = tools.genTopicSummary(content, config.topic_summary_len);
    topic.tab = tab;
    topic.reprint = reprint;
    topic.author_id = authorId;
    topic.save(callback);
};

/**
 * 查询用户某时间点之前创建的topic
 */
exports.queryAuthorTopic = function(authorId, beforeTime, limit, callback) {
    Topic.find({
            author_id: authorId,
            create_at: {
                $lt: beforeTime
            }
        })
        .populate('draft')
        .sort('-create_at')
        .limit(limit)
        .exec(callback);
};

/**
 * 获取用户文章数目
 * @return {Object} counts
 *  {
 *      total: 0, //总数
 *      tab1: 0 // 分类
 *  }
 */
exports.getAuthorTopicCount = function(authorId, callback) {
    Topic.aggregate({
            $match: {
                author_id: authorId
            }
        }, {
            $group: {
                _id: '$tab',
                count: {
                    $sum: 1
                }
            }
        },
        function(err, res) {
            if (err) {
                return callback(err, null);
            }
            var counts = {
                total: 0
            };
            _.map(res, function(item) {
                counts[item._id] = item.count;
                counts.total += item.count;
            });
            callback(null, counts);
        }
    );
};

/**
 * 查询所有的文章
 */
exports.getAllTopic = function(callback) {
    Topic.find({}, callback);
};

/**
 * 获取当日团队topic
 */
exports.getDailyUserTopic = function(userIds, callback) {
    var today = moment(moment().format('L'), 'L');
    var yestoday = today.clone().add(-1, 'days');
    Topic.find()
        .where('create_at').gt(yestoday.toDate()).lt(today.toDate())
        .where('author_id').in(userIds)
        .exec(callback);
};
