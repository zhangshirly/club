var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var ActivitySchema = new Schema({
    image           : {type: String},
    link            : {type: String},
    title           : {type: String},
    desc            : {type: String},
    pptlink         : {type: String},   // ppt 地址
    status          : {type: Number, default: 1},
    create_at       : {type: Date, default: Date.now },
    top             : {type: Boolean, default: false }, // 置顶
});

ActivitySchema.index({create_at: -1});

mongoose.model('Activity', ActivitySchema);
