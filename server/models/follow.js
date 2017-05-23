var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var FollowSchema = new Schema({
    // 被关注的大神
    master: {type: ObjectId, ref: 'User'},
    // 关注小白
    follower: {type: ObjectId, ref: 'User'},
    create_at: { type: Date, default: Date.now }
});

FollowSchema.index({master: 1, follower: -1}, {unique: true});
FollowSchema.index({follower: 1, master: -1});

mongoose.model('Follow', FollowSchema);
