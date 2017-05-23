var models = require('../models');
var Invite = models.Invite;
var utility = require('utility');
var uuid = require('node-uuid');

// 邀请的状态值
var STATUS = {
    INVALID: 0, // 无效的
    WAIT_ACCEPT: 1, // 等待接受
    ACCEPED: 2 // 邀请被接受
};
exports.STATUS = STATUS;

/**
 * 保存邀请
 * Callback:
 * - err, 数据库异常
 * - invite, 邀请
 * @param {Object} infos 邀请信息
 * @param {function(Object, Object)} callback 回调函数 
 */ 
exports.newAddSave = function(infos, callback) {
    var invite = new Invite(); 
    invite.author_id = infos.author._id; 
    invite.name = infos.name; 
    invite.email = infos.email; 
    invite.company = infos.company; 
    invite.team = infos.team; 
    invite.phrase = infos.phrase; 
    invite.token = infos.token;
    invite.status = STATUS.WAIT_ACCEPT; 
    invite.save(function(err) {
        callback(err, invite);
    });
};

/**
 * 获取邀请
 * Callback:
 * - err, 数据库异常
 * - invite, 邀请
 * @param {String} token
 * @param {function(Object, Object)} callback 回调函数 
 */
exports.getInviteByToken = function(token, callback) {
    Invite.findOne({token: token}, callback);
};

/**
 * 使用邀请
 * Callback:
 * - err, 数据库异常
 * - invite, 邀请
 * @param {String} token
 * @param {function(Object, Object)} callback 回调函数 
 */
exports.acceptInviteByToken = function(token, callback) {
    Invite.findOne({
        token: token, 
        status: STATUS.WAIT_ACCEPT
    }, function(err, item) {
        if (err || !item) {
            callback(err, item); 
            return; 
        } 
        item.status = STATUS.ACCEPED;
        item.used_at = Date.now();
        item.save(function(err) {
            callback(err, item);
        });
    }); 
}; 
