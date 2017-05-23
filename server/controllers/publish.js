var validator = require('validator');
var at = require('../common/at');
var User = require('../proxy').User;
var Topic = require('../proxy').Topic;
var TopicCollect = require('../proxy').TopicCollect;
var EventProxy = require('eventproxy');
var tools = require('../common/tools');
var store = require('../common/store');
var mail = require('../common/mail');
var dataAdapter = require('../common/dataAdapter');
var config = require('../config');
var _ = require('lodash');

/**
 * 转载
 * admin_required
 */
exports.reprint = function(req, res, next) {
    res.render('publish/reprint', {
    });
};