var mongoose = require('mongoose');
var config = require('../config');

mongoose.connect(config.db, function (err) {
  if (err) {
    console.error('connect to %s error: ', config.db, err.message);
    process.exit(1);
  }
});

// models
require('./user');
require('./topic');
require('./reply');
require('./topic_collect');
require('./message');
require('./invite'); 
require('./team');
require('./evernote');
require('./marktang');
require('./follow');
require('./draft');
require('./issue');
require('./banner');
require('./activity');

exports.User = mongoose.model('User');
exports.Topic = mongoose.model('Topic');
exports.Reply = mongoose.model('Reply');
exports.TopicCollect = mongoose.model('TopicCollect');
exports.Message = mongoose.model('Message');
exports.Invite = mongoose.model('Invite');
exports.Team = mongoose.model('Team');
exports.Evernote = mongoose.model('Evernote');
exports.Marktang = mongoose.model('Marktang');
exports.Follow = mongoose.model('Follow');
exports.Draft = mongoose.model('Draft');
exports.Issue = mongoose.model('Issue');
exports.Banner = mongoose.model('Banner');
exports.Activity = mongoose.model('Activity');
