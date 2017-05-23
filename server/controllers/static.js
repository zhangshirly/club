var multiline = require('multiline');
// static page
// About
exports.about = function (req, res, next) {
  res.render('static/about', {
    pageTitle: '关于我们'
  });
};

// FAQ
exports.faq = function (req, res, next) {
  res.render('static/faq');
};

exports.getstart = function (req, res) {
  res.render('static/getstart');
};

exports.robots = function (req, res, next) {
  res.type('text/plain');
  res.send(multiline(function () {;
/*
User-Agent: *
Disallow: /admin/
*/
  }));
};

exports.api = function (req, res, next) {
  res.render('static/api');
};
