var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var ReplySchema = new Schema({
    raw             : { type: String, default: '' }, // 提交的原始raw，不用于任何显示，编辑用
    content         : { type: String },
    text            : { type: String }, // markdown中提取的文本,换行为 \n
    topic_id        : { type: ObjectId, ref: 'Topic'},
    author_id       : { type: ObjectId },
    reply_id        : { type: ObjectId },
    create_at       : { type: Date, default: Date.now },
    update_at       : { type: Date, default: Date.now },
    content_is_html : { type: Boolean },
    ups             : [ Schema.Types.ObjectId ]
});

ReplySchema.index({topic_id: 1});
ReplySchema.index({author_id: 1, create_at: -1});

mongoose.model('Reply', ReplySchema);
