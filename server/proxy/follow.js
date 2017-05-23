var models = require('../models');
var Follow = models.Follow;

/**
 * 获取master fans的个数
 */
exports.getFollowerCount = function(master_id, callback) {
    Follow.find({master: master_id}).count(callback);
};

/**
 * 获取fans master的个数
 */
exports.getMasterCount = function(follower_id, callback) {
    Follow.find({follower: follower_id}).count(callback);
};

/**
 * 关注master
 */
exports.follow = function(follower_id, master_id, callback) {
    Follow.findOne(
        {master: master_id, follower: follower_id},
        function(err, item) {
            if (err) {
                return callback(err);
            }
            if (item) {
                return callback(null);
            }
            var kiss = new Follow();
            kiss.master = master_id;
            kiss.follower = follower_id;
            kiss.save(callback);
        }
    );
};

/**
 * 取消关注
 */
exports.cancel = function(follower_id, master_id, callback) {
    Follow.findOne(
        {master: master_id, follower: follower_id},
        function(err, item) {
            if (err) {
                return callback(err);
            }
            if (item) {
                item.remove(callback);
            } else {
                callback(null);
            }
        }
    );
};

/**
 * 是否已关注
 */
exports.hasFollowed = function(follower_id, master_id, callback) {
    Follow.findOne(
        {master: master_id, follower: follower_id},
        function(err, item) {
            if (err) {
                return callback(err);
            }
            callback(null, !!item);
        }
    );
};
