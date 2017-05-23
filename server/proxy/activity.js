var models = require('../models');
var Activity = models.Activity ;
var EventProxy = require('eventproxy');

exports.newAndSave = function (param, callback) {
  var activity = new Activity();
  activity.image = param.image;
  activity.link = param.link;
  activity.title = param.title;
  activity.desc = param.desc;
  activity.pptlink = param.pptlink;
  activity.save(callback);
};

exports.getActivityById = function(id, callback) {
  Activity.findOne({_id: id}, function(err, activity) {
    if (err) {
      return callback(err);
    }
    if (!activity) {
      return callback(err, null);
    }
    return callback(activity);
  });
};

exports.getActivityByQuery = function(query, opt, callback) {
  Activity.find(query, {}, opt, callback);
};

exports.getCountByQuery = function(query, callback) {
  Activity.count(query, callback);
};

exports.list = function(callback) {
  Activity.find({}).exec(function (err, result) {
    if (!err) {
      callback(result);
    }
  });
};
