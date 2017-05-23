var _ = require('lodash');
var models = require('../models');
var Team = models.Team;

/**
 * 保存
 * Callback:
 * - err, 数据库异常
 * @param {Object} teams 团队
 * @param {function(Object)} callback 回调函数 
 */ 
exports.saveTeams = function(teams, callback) {
    var items = _.map(teams, function(item) {
        return {
            company: item.company,
            team: item.team || ''
        };
    });
    var errors = [];
    function saveOne() {
        var one = items.shift();
        if (!one) {
            callback(errors.length ? errors : null);
            return;
        }
        Team.find(one, function(err, exists) {
            if (!err && !exists.length) {
                new Team(one).save(function(err) {
                    err && errors.push(err);
                    saveOne();
                });    
            } else {
                errors.push(err);
                saveOne();
            }
        });
    }
    saveOne();
};

/**
 * 获取公司匹配
 * @param {String} companyLike
 * @param {function(Object, Array.<String>)} callback
 */
exports.findCompanyComplete = function(companyLike, callback) {
    Team.find({
        company: new RegExp(_.escapeRegExp(companyLike), 'i')
    }).distinct('company', callback);
};

/**
 * 获取公司的team匹配
 * @param {String} company
 * @param {String} teamLike team like
 * @param {function(Object, Array.<String>)} callback
 */
exports.findTeamComplete = function(company, teamLike, callback) {
    Team.find({
        company: company,
        team: new RegExp(_.escapeRegExp(teamLike), 'i')
    }).distinct('team', callback);
};
