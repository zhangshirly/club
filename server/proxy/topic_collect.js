var TopicCollect = require('../models').TopicCollect;

exports.getTopicCollect = function (userId, topicId, callback) {
  TopicCollect.findOne({user_id: userId, topic_id: topicId}, callback);
};

exports.getTopicCollectsByUserId = function (userId, callback) {
  TopicCollect.find({user_id: userId}, callback);
};

exports.newAndSave = function (userId, topicId, callback) {
  var topic_collect = new TopicCollect();
  topic_collect.user_id = userId;
  topic_collect.topic_id = topicId;
  topic_collect.save(callback);
};

exports.remove = function (userId, topicId, callback) {
  TopicCollect.remove({user_id: userId, topic_id: topicId}, callback);
};

/**
 * 获取文章的收藏数目
 */
exports.getTopicCollectCount = function (topicId, callback) {
    TopicCollect.count({topic_id: topicId}, callback);
};

/**
 * 获取用户收藏文章数
 */
exports.getUserCollectCount = function (userId, callback) {
    TopicCollect.count({user_id: userId}, callback);
};
