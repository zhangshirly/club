var _ = require('lodash');
var Team = require('../proxy').Team;
var config = require('../config'); 

/**
 * show 导入
 * required admin
 */
exports.showImport = function(req, res, next) {
    res.render('team/import');
};

/**
 * 导入
 * required admin
 */
exports.import = function(req, res, next) {
    var data = req.query.data || req.body.data;
    var items = [];
    _.each(data.split(/[\r\n]+/), function(item) {
        if (/^\s*$/.test(item)) {
            return;
        }
        var parts = item.trim().split(/\s+/);
        var company = parts[0];
        var team = parts[1] || '';
        items.push({
            company: company,
            team: team
        });
    });
    console.log(items);
    Team.saveTeams(items, function(err) {
        res.send({rt: !err});
    });
};

/**
 * get company auto complete
 */
exports.companyComplete = function(req, res, next) {
    var company = req.query.company || '';
    Team.findCompanyComplete(company, function(err, items) {
        if (err) {
            return next(err);
        }
        res.send({
            company: company,
            items: items
        });
    });
};

/**
 * get team auto complete
 */
exports.teamComplete = function(req, res, next) {
    var company = req.query.company || '';
    var team = req.query.team || '';
    Team.findTeamComplete(company, team, function(err, items) {
        if (err) {
            return next(err);
        }
        var rtItems = [];
        _.each(items, function(item) {
            item && rtItems.push(item);
        });
        res.send({
            company: company,
            team: team,
            items: rtItems
        });
    });
};
