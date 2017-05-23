var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var InviteSchema = new Schema({
    author_id: { type: ObjectId }, // 发送邀请user id
    token: {type: String },
    status: {type: Number}, // 状态值定义在proxy中
    used_at: { type: Date, default: null },
    create_at: { type: Date, default: Date.now },
    // 被邀请者信息 
    email: {type: String}, 
    name: {type: String},
    company: {type: String}, 
    team: {type: String}, 
    phrase: {type: String} 
});

InviteSchema.index({token: 1}, {unique: true});
InviteSchema.index({status: 1});

mongoose.model('Invite', InviteSchema);
