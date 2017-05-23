var config = require('../config');

exports.github = function (req, res, next) {
  if (config.GITHUB_OAUTH.clientID === 'your GITHUB_CLIENT_ID') {
  	console.log("call the admin to set github oauth.");
    return res.send('call the admin to set github oauth.');
  }
  next();
};
