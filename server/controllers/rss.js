var config = require('../config');
var convert = require('data2xml')();
var Topic = require('../proxy').Topic;
var cache = require('../common/cache');
var renderHelper = require('../common/render_helper');
var eventproxy = require('eventproxy');
var User = require('../proxy').User;

exports.index = function (req, res, next) {
  if (!config.rss) {
    res.statusCode = 404;
    return res.send('Please set `rss` in config.js');
  }
  res.contentType('application/xml');

  var ep = new eventproxy();
  ep.fail(next);

  cache.get('rss', ep.done(function (rss) {
    if (!config.debug && rss) {
      res.send(rss);
    } else {
      var opt = { limit: config.rss.max_rss_items, sort: '-create_at'};
      Topic.getTopicsByQuery({}, opt, function (err, topics) {
        if (err) {
          return next(err);
        }
        var rss_obj = {
          _attr: { version: '2.0' },
          channel: {
            title: config.rss.title,
            link: config.rss.link,
            language: config.rss.language,
            description: config.rss.description,
            item: []
          }
        };

        topics.forEach(function (topic) {
          rss_obj.channel.item.push({
            title: topic.title,
            link: config.rss.link + '/topic/' + topic._id,
            guid: config.rss.link + '/topic/' + topic._id,
            description: renderHelper.markdown(topic.content),
            author: topic.author.loginname,
            pubDate: topic.create_at.toUTCString()
          });
        });

        var rssContent = convert('rss', rss_obj);

        cache.set('rss', rssContent, 1000 * 60 * 5); // 五分钟
        res.send(rssContent);
      });
    }
  }));
};

exports.user = function (req, res, next) {
  if (!config.rss) {
    res.statusCode = 404;
    return res.send('Please set `rss` in config.js');
  }

  var user_name = req.params.name;
  User.getUserByLoginName(user_name, function (err, user) {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.send('User does not exist');
    }

    res.contentType('application/xml');
    var ep = new eventproxy();
    ep.fail(next);

    cache.get('rss/'+user_name, ep.done(function (rss) {
      if (!config.debug && rss) {
        res.send(rss);
      } else {
        var query = {author_id: user._id};
        var opt = { limit: config.rss.max_rss_items, sort: '-create_at'};
        Topic.getTopicsByQuery(query, opt, function (err, topics) {
          if (err) {
            return next(err);
          }

          var rss_obj = {
            _attr: { version: '2.0' },
            channel: {
              title: config.rss.title+'/'+user_name+'个人主页',
              link: config.rss.link+'/user/'+user_name,
              language: config.rss.language,
              description: config.rss.description+'/'+user_name+'个人主页',
              item: []
            }
          };

          topics.forEach(function (topic) {
            rss_obj.channel.item.push({
              title: topic.title,
              link: config.rss.link + '/topic/' + topic._id,
              guid: config.rss.link + '/topic/' + topic._id,
              description: renderHelper.markdown(topic.content),
              author: topic.author.loginname,
              pubDate: topic.create_at.toUTCString()
            });
          });

          var rssContent = convert('rss', rss_obj);

          cache.set('rss/'+user_name, rssContent, 1000 * 60 * 5); // 五分钟
          res.send(rssContent);
        });
      }

    }));

  });
};