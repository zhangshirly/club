var EventProxy = require('eventproxy');

var _ = require('lodash');
var moment = require('moment');
var models = require('../models');
var Issue = models.Issue;
var tools = require('../common/tools');
var at = require('../common/at');
var config = require('../config');

exports.newAndSave = function(data, callback){

    var issue = new Issue();
    type = data.type || 3;
    issue.title = data.title;
    issue.desc = data.desc;
    issue.link = data.link;
    issue.pic = data.pic;
    issue.md5 = data.md5;
    issue.type = data.type || '';
    issue.tab = data.tab;
    issue.top = data.top;
    issue.good = data.good;
    issue.city = data.city;
    issue.time = data.time;
    issue.source = data.source;
    issue.save(callback);

}

/**
 * 根据记录是否存在更新数据库
 * Callback:
 * - err, 数据库错误
 * - data, 要插入的数据对象
 * - md5, 主题唯一对应的md5值
 * @param {Object} data json对象
 * @param {Function} callback 回调函数
 */
exports.updateAndSave = function(data, callback){
    var ep = new EventProxy();
    Issue.count({ md5: data.md5 }, ep.done(function(count){

        // 根据MD5判断是否存在记录，如果不存在则添加新记录，否则不做处理
        if(count <= 0){
            var issue = new Issue();
            type = data.type || 3;
            issue.title = data.title;
            issue.desc = data.desc;
            issue.link = data.link;
            issue.pic = data.pic;
            issue.md5 = data.md5;
            issue.city = data.city;
            issue.time = data.time;
            issue.source = data.source;
            issue.type = data.type || 3;
            issue.tab = data.tab || true;
            issue.top = data.top || true;
            issue.good = data.good || true;
            issue.save(callback);
        }else{
            callback();
        }
    }))
}

/**
 * 根据关键词，获取主题列表
 * Callback:
 * - err, 数据库错误
 * - count, 主题列表
 * @param {object} query 搜索关键词
 * @param {Object} opt 搜索选项
 * @param {Function} callback 回调函数
 */
exports.getIssueByQuery = function(query, opt, callback) {

    Issue.find(query, {}, opt, callback);
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
    Issue.count(query, callback);
};