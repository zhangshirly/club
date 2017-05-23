var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var TeamSchema = new Schema({
    company: {type: String},
    team: {type: String, default: ''},
    add_at: { type: Date, default: Date.now }
});

TeamSchema.index({company: 1});

mongoose.model('Team', TeamSchema);
