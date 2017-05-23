var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var config = require('../config');
var _ = require('lodash');

var IssueSchema = new Schema({
    title           : { type: String },
    desc            : { type: String },
    link            : { type: String },
    pic             : { type: String },
    md5             : { type: String },
    city             : { type: String },
    time             : { type: String },
    source          : { type: String },
    type            : { type: Number, default: 3 }, //0-文章; 1-github组件; 2-讨论; 3-外部文章或入口
    top             : { type: Boolean, default: true }, // 置顶帖
    good            : { type: Boolean, default: true }, // 精华帖
    create_at       : { type: Date, default: Date.now }
});

IssueSchema.index({create_at: -1});
IssueSchema.index({last_reply_at: -1});

mongoose.model('Issue', IssueSchema);
