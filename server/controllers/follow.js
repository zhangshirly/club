/**
 * @file 关注
 * @author fishineyuan(382184760@qq.com)
 * @date 2015-02-06
 */
var _ = require('lodash');
var eventproxy = require('eventproxy');
var User = require('../proxy').User;
var Follow = require('../proxy').Follow;
var config = require('../config'); 

/**
 * 关注某个somebody
 */
exports.follow = function(req, res, next) {
    var master_id = req.body.master;
    var cancel = req.body.cancel === 'true';
    var ep = eventproxy.create();
    ep.fail(next);
    ep.on('fail', function(ret, msg) {
        ep.unbind();
        res.send({
            ret: ret,
            msg: msg || ''
        });
    });
    if(!req.session) return;
    User.getUserById(req.session.user._id, ep.done('user'));
    User.getUserById(master_id, ep.done(function(master) {
        if (!master) {
            return ep.emit('fail', 401, 'invalid master');
        }
        ep.emit('master', master);
    }));
    ep.all('user', 'master', function(user, master) {
        var command = cancel ? Follow.cancel : Follow.follow;
        command.call(Follow, user._id, master._id, ep.done('follow_save'));
    });
    ep.all('user', 'master', 'follow_save', function(user, master) {
        Follow.getFollowerCount(master._id, function(err, count) {
            master.follower_count = count;
            master.save();
            ep.emit('master_follower_count', count);
        });
        Follow.getMasterCount(user._id, function(err, count) {
            user.following_count = count;
            user.save();
            ep.emit('user_following_count', count);
        });
    });
    ep.all(
        'master_follower_count',
        'user_following_count', 
        function(master_follower_count, user_following_count) {
            res.send({
                ret: 0,
                data: {
                    masterFollowerCount: master_follower_count,
                    userFollowingCount: user_following_count,
                    hasFollowed: !cancel
                }
            });
        }
    );
};

/**
 * 是否已关注somebody
 */
exports.masterFollowInfo = function(req, res, next) {
    var master_id = req.body.master;
    User.getUserById(master_id, function(err, master) {
        if (err || !master) {
            return next(err);
        }
        if(!req.session || !req.session.user || !req.session.user._id) return;
        Follow.hasFollowed(
            req.session.user._id, 
            master_id, 
            function(err, followed) {
                if (err) {
                    return next(err);
                }
                res.send({
                    ret: 0,
                    data: {
                        hasFollowed: followed,
                        masterFollowerCount: master.follower_count,
                        masterFollowingCount: master.following_count
                    }
                });
            }
        );
    });
};
