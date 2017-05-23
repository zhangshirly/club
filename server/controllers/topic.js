/*!
 * nodeclub - controllers/topic.js
 */

/**
 * Module dependencies.
 */

var _ = require('lodash');
var validator = require('validator');
var request = require('request');
var escapeHtml = require('escape-html');

var at = require('../common/at');
var User = require('../proxy').User;
var Topic = require('../proxy').Topic;
var TopicCollect = require('../proxy').TopicCollect;
var EventProxy = require('eventproxy');
var tools = require('../common/tools');
var store = require('../common/store');
var mail = require('../common/mail');
var dataAdapter = require('../common/dataAdapter');
var html2markdown = require('html2markdown');
var config = require('../config');

//todo: 放tool里
function html_encode(str){
    var s = "";
    if (str.length == 0) return "";
    s = str.replace(/&/g, ">");
    s = s.replace(/</g, "<");
    s = s.replace(/>/g, ">");
    s = s.replace(/ /g, " ");
    s = s.replace(/\'/g, "\'");
    s = s.replace(/\"/g, "\"");
    s = s.replace(/\n/g, "<br>");
    return s;
}
/**
 * Topic page
 *
 * @param  {HttpRequest} req
 * @param  {HttpResponse} res
 * @param  {Function} next
 */
exports.index = function (req, res, next) {
  function isUped(user, reply) {
    if (!reply.ups) {
      return false;
    }
    return reply.ups.indexOf(user._id) !== -1;
  }

  var topic_id = req.params.tid;
  if (topic_id.length !== 24) {
    return res.render('notify/notify', {
      error: '此话题不存在或已被删除。'
    });
  }
  var events = ['topic', 'other_topics', 'no_reply_topics'];
  var ep = EventProxy.create(events, function (topic, other_topics, no_reply_topics) {
    res.render('topic/index', {
      topic: topic,
      tabs: config.tabs,
      showSignIn: true,
      author_other_topics: other_topics,
      no_reply_topics: no_reply_topics,
      isUped: isUped,
      isUped: isUped
    });
  });

  ep.fail(next);

  Topic.getFullTopic(topic_id, ep.done(function (message, topic, author, replies) {
    if (message) {
      ep.unbind();
      return res.render('notify/notify', { error: message });
    }

    topic.visit_count += 1;
    topic.save();

    // format date
    topic.friendly_create_at = tools.formatDate(topic.create_at, true);
    topic.friendly_update_at = tools.formatDate(topic.update_at, true);

    topic.author = author;

    var mainReplies = dataAdapter.appendSubRepliesToReplies(replies); 
    topic.replies = dataAdapter.outReplies(mainReplies);

    // 点赞数排名第三的回答，它的点赞数就是阈值
    topic.reply_up_threshold = (function () {
      var allUpCount = replies.map(function (reply) {
        return reply.ups && reply.ups.length || 0;
      });
      allUpCount = _.sortBy(allUpCount, Number).reverse();

      return allUpCount[2] || 0;
    })();

    if (!req.session.user) {
      ep.emit('topic', topic);
    } else {
      TopicCollect.getTopicCollect(req.session.user._id, topic._id, ep.done(function (doc) {
        topic.in_collection = doc;
        ep.emit('topic', topic);
      }));
    }

    // get other_topics
    var options = { limit: 5, sort: '-last_reply_at'};
    var query = { author_id: topic.author_id, _id: { '$nin': [ topic._id ] } };
    Topic.getTopicsByQuery(query, options, ep.done('other_topics'));

    // get no_reply_topics
    var options2 = { limit: 5, sort: '-create_at'};
    Topic.getTopicsByQuery({reply_count: 0}, options2, ep.done('no_reply_topics'));
  }));
};

exports.create = function (req, res, next) {
    res.render('topic/edit', {
        tabs: config.tabs,
        content_from_marktang : req.body.content || ''
    });
};

exports.put = function (req, res, next) {
    var json = req.body.json === 'true';
    //for marktang
    if (!json && req.body.content){
        res.render('topic/edit', {
            tabs: config.tabs,
            content_from_marktang : req.body.content || ''
        });
        return;
    }
    saveTopic(req, next, function(err, topic) {
        if (!json) {
            if (err || !topic) {
                return res.render('topic/edit', {
                    edit_error: err,
                    title: topic.title,
                    content: topic.content,
                    tabs: config.tabs
                });
            } else {
                res.redirect('/topic/' + topic._id);
            }
        } else {
            if (err || !topic) {
                res.send({
                    ret: 400
                });
            } else {
                res.send({
                    ret: 0,
                    data: dataAdapter.outTopic(topic)
                });
            }
        }
    });
};

/*转载文章*/
exports.reprint = function (req, res, next) {
    var url = req.body.link;
    var parserUrl =  'https://readability.com/api/content/v1/parser';
    request({
        url : parserUrl+'?url='+url+'&token=f1aa7f8c46e7255170fb00ff90248fbcdc8f9c77'
    }, function(err , result , body){
        if(err){
            console.log('readability request error', err);
        }else{
            if(result.statusCode == 200){
                var json = JSON.parse(result.body);

                var title = json.title;
                var content = html2markdown(json.content);
                var short_url = json.short_url;

                //针对几个大博客的标题修正
                if(json.domain == "www.cnblogs.com"){
                    title = title.substr(0, title.indexOf(" - 【"));
                }

                req.body.title = title;
                req.body.content = content;
                
                saveTopic(req, next, function(err, topic) {
                    if (err || !topic) {
                        return res.render('topic/edit', {
                            edit_error: err,
                            title: topic.title,
                            content: topic.content,
                            tabs: config.tabs
                        });
                    } else {
                        res.writeHead(200, {"content-type":'application/json'});
                        res.end(JSON.stringify({
                            'title': topic.title, 
                            'tid': topic.id
                        }));
                    }
                });

            }else{
                console.log(result.statusCode);
            }
        }
    });
};

function saveTopic(req, next, callback) {
    var title = escapeHtml(validator.trim(req.body.title));
    var tab = validator.escape(validator.trim(req.body.tab));
    var content = validator.trim(req.body.content || req.body.t_content);
    var type = escapeHtml(req.body.type || 0);
    var reprint = req.body.reprint;
    if(reprint && reprint.length != 0 && reprint != "false"){
        reprint = req.body.link;
    }else{
        reprint = "";
    }
    
    // 得到所有的 tab, e.g. ['ask', 'share', ..]
    var allTabs = config.tabs.map(function (tPair) {
        return tPair[0];
    });
    // if (!config.regExps.topicTitle.test(title)
    //     || !config.regExps.topicContent.test(content)
    //     || !_.contains(allTabs, tab)
    // ) {
    //     return callback('param error', null);
    // }

    var user = req.session.user;
    var ep = new EventProxy();
    ep.fail(next);

    // console.log(title+"is done !");

    Topic.newAndSave(title, type, content, tab, reprint, user._id, ep.done('topic'));
    ep.all('topic', function(topic) {
        User.getUserById(user._id, ep.done(function (user) {
            user.score += 5;
            user.topic_count += 1;
            user.save();
            req.session.user = user;
            ep.emit('score_saved', user);
        }));
        // 给team成员发送
        //if (user.company) {
            //User.getTeamMember(
                //user.company, 
                //user.team || '' , 
                //ep.done(function(members) {
                    //mail.sendNewTopicToTeamMembers({
                        //members: members,
                        //user: user,
                        //topic: topic
                    //});
                //})
            //);
        //}
        if(type == 0){
            User.listOrderByTeam(0, 1000, function(err, members) {
                if (err) {
                    return;
                }
                mail.sendNewTopicToTeamMembers({
                    members: members,
                    user: user,
                    topic: topic
                });
            }); 
            //发送at消息
            at.sendMessageToMentionUsers(content, topic._id, req.session.user._id);
        }
    });

    ep.all('topic', 'score_saved', function (topic, user) {
        callback(null, topic);
    });
};

exports.showEdit = function (req, res, next) {
  var topic_id = req.params.tid;

  Topic.getTopicById(topic_id, function (err, topic, tags) {
    if (!topic) {
      res.render('notify/notify', {error: '此话题不存在或已被删除。'});
      return;
    }

    if (String(topic.author_id) === String(req.session.user._id) || req.session.user.is_admin) {
      res.render('topic/edit', {
        action: 'edit',
        topic_id: topic._id,
        title: topic.title,
        content: topic.content,
        tab: topic.tab,
        tabs: config.tabs
      });
    } else {
      res.render('notify/notify', {error: '对不起，你不能编辑此话题。'});
    }
  });
};

exports.update = function (req, res, next) {
    var json = req.body.json === 'true';
    var topic_id = req.params.tid;
    var title = escapeHtml(validator.trim(req.body.title));
    var tab = validator.escape(validator.trim(req.body.tab));
    var content = validator.trim(req.body.content || req.body.t_content);

    var ep = new EventProxy();
    ep.fail(next);
    ep.on('done', function(topic) {
        ep.unbind();
        if (json) {
            res.send({
                ret: 0,
                data: dataAdapter.outTopic(topic)
            });
        } else {
            //res.redirect('/topic/' + topic._id);
            res.redirect('/');
        }
    });
    ep.on('fail', function(msg, topic) {
        ep.unbind()
        topic = topic || {};
        if (json) {
            res.send({
                ret: 400,
                msg: msg
            });
        } else {
            return res.render('topic/edit', {
                action: 'edit',
                edit_error: msg,
                topic_id: topic._id || '',
                content: topic.content || '',
                tabs: config.tabs
            });
        }
    });
    var user = req.session.user;
    Topic.getTopicById(topic_id, ep.done(function(topic, tags) {
        if (!topic) {
            return ep.emit('faile',  '此话题不存在或已被删除。');
        }
        if (!tools.idEqual(topic.author_id, user._id) && !user.is_admin) {
            return ep.emit('faile', '无操作权限。', topic);
        }
        // 得到所有的 tab, e.g. ['ask', 'share', ..]
        var allTabs = config.tabs.map(function (tPair) {
            return tPair[0];
        });
        if (!config.regExps.topicTitle.test(title)
            || !config.regExps.topicContent.test(content)
            || !_.contains(allTabs, tab)
        ) {
            return ep.emit('fail', 'param error', topic);
        }
        topic.title = title;
        topic.content = content;
        topic.summary = html_encode(tools.genTopicSummary(content, config.topic_summary_len)); 
        topic.tab = tab;
        topic.update_at = new Date();
        topic.save(ep.done(function() {
            at.sendMessageToMentionUsers(content, topic._id, user._id);
            ep.emit('done', topic);
        }));
    }));
};

exports.delete = function (req, res, next) {
    //删除话题, 话题作者topic_count减1
    //删除回复，回复作者reply_count减1
    //删除topic_collect，用户collect_topic_count减1
    var topic_id = req.params.tid;
    var ep = tools.createJsonEventProxy(res, next); 
    Topic.getTopic(topic_id, ep.done(function(topic) {
        if (!topic) {
            return ep.emit('done');
        }
        if (!req.session.user.is_admin 
            && !(topic.author_id.equals(req.session.user._id))
        ){
            return ep.emit('fail', 403, '无权限');
        }
        topic.remove(ep.done('done'));
    }));
};

// 设为置顶
exports.top = function (req, res, next) {
  var topic_id = req.params.tid;
  var is_top = req.params.is_top;
  var referer = req.get('referer');
  if (topic_id.length !== 24) {
    res.render('notify/notify', {error: '此话题不存在或已被删除。'});
    return;
  }
  Topic.getTopic(topic_id, function (err, topic) {
    if (err) {
      return next(err);
    }
    if (!topic) {
      res.render('notify/notify', {error: '此话题不存在或已被删除。'});
      return;
    }
    topic.top = is_top;
    topic.save(function (err) {
      if (err) {
        return next(err);
      }
      var msg = topic.top ? '此话题已经被置顶。' : '此话题已经被取消置顶。';
      res.render('notify/notify', {success: msg, referer: referer});
    });
  });
};

// 设为精华
exports.good = function (req, res, next) {
  var topicId = req.params.tid;
  var isGood = req.params.is_good;
  var referer = req.get('referer');
  Topic.getTopic(topicId, function (err, topic) {
    if (err) {
      return next(err);
    }
    if (!topic) {
      res.render('notify/notify', {error: '此话题不存在或已被删除。'});
      return;
    }
    topic.good = isGood;
    topic.save(function (err) {
      if (err) {
        return next(err);
      }
      var msg = topic.good ? '此话题已加精。' : '此话题已经取消加精。';
      res.render('notify/notify', {success: msg, referer: referer});
    });
  });
};

exports.collect = function (req, res, next) {
    var topic_id = req.body.topic_id;
    var cancel = req.body.cancel === 'true';
    var ep = EventProxy.create();
    ep.fail(next);
    ep.on('fail', function() {
        res.send({
            ret: 1
        });
    });

    Topic.getTopic(topic_id, ep.done(function(topic) {
        if (!topic) {
            return ep.emit('fail');
        }
        return ep.emit('topic', topic);
    }));

    User.getUserById(req.session.user._id, ep.done(function(user) {
        if (!user) {
            return ep.emit('fail');
        }
        return ep.emit('user', user);
    }));
    ep.all('topic', 'user', function(topic, user) {
        TopicCollect.getTopicCollect(user._id, topic._id, ep.done(function(c) {
            if (cancel && c) {
                c.remove(ep.done('collect'));
            } else if (!cancel && !c) {
                TopicCollect
                    .newAndSave(user._id, topic._id, ep.done('collect'));
            } else {
                ep.emit('collect');
            }
        })); 
    });

    ep.all('topic', 'user', 'collect', function(topic, user) {
        TopicCollect.getTopicCollectCount(topic._id, ep.done(function(count) {
            topic.collect_count = count;
            topic.save(ep.done('topic_updated'));
        })); 
        TopicCollect.getUserCollectCount(user._id, ep.done(function(count) {
            user.collect_topic_count = count;
            user.save(ep.done('user_updated'));
        }));
    });

    ep.all(
        'topic', 'user', 'topic_updated', 'user_updated', 
        function(topic, user) {
            res.send({
                ret: 0,
                data: {
                    topicCollectCount: topic.collect_count,
                    userCollectCount: user.collect_topic_count
                }
            });
        }
    );
};

exports.upload = function(req, res, next) {
    req.busboy.on(
        'file', 
        function(fieldname, file, filename, encoding, mimetype) {
            store.upload(file, {
                filename: filename
            }, function(err, result) {
                if (err) {
                    return next(err);
                }
                res.json({
                    success: true,
                    url: result.url,
                });
            });
        }
    );
    req.pipe(req.busboy);
};

/**
 * ajax 获取topic
 */
exports.get = function(req, res, next) {
    var topic_id = req.params.tid;
    var ep = tools.createJsonEventProxy(res, next); 
    Topic.getFullTopic(topic_id, ep.done(function (message, topic, author, replies) {
        if (message) {
            return ep.emit('fail');
        }
        ep.emit('done', {
            data: {
                topic: dataAdapter.outTopic(topic, {
                    content: true
                })
            }
        });
    }));
};

/**
 * km 导入使用
 */
exports.listmyforkm = function(req, res, next) {
    var userId = req.session.user._id;
    var limit = req.query.limit ? +req.query.limit : 100;
    if (limit < 0 || limit > 1000) {
        limit = 100;
    }
    var beforeTime = req.query.beforeTime || Date.now();
    var ep = tools.createJsonEventProxy(res, next); 
    Topic.queryAuthorTopic(userId, beforeTime, limit, ep.done(function(list) {
        list = _.map(list || [], function(item) {
            return dataAdapter.outTopic(item, {
                content: true, 
                contentHTML: true
            });
        });
        ep.emit('done', {
            data: list
        });
    }));
};

/**
 * 查询用户的文章列表
 */
exports.listmy = function(req, res, next) {
    var userId = req.session.user._id;
    var limit = req.query.limit ? +req.query.limit : 100;
    if (limit < 0 || limit > 1000) {
        limit = 100;
    }
    var beforeTime = req.query.beforeTime || Date.now();
    var ep = tools.createJsonEventProxy(res, next); 
    Topic.queryAuthorTopic(userId, beforeTime, limit, ep.done(function(list) {
        list = _.map(list, function(item) {
            var out =  dataAdapter.outTopic(item);
            if (item.draft) {
                out.draft = dataAdapter.outDraft(item.draft);
            }
            return out;
        });
        ep.emit('done', {
            data: list
        });
    }));
};

/**
 * 为所有文章生成summary
 * admin_required
 */
exports.genAllSummary = function(req, res, next) {

    Topic.getAllTopic(function(err, list) {
        function task(err) {
            if (err) {
                res.send({
                    ret: 1,
                    error: err.toString()
                });
                return;
            }
            if (!list.length) {
                res.send({
                    ret: 0
                });
                return;
            }
            var item = list.pop();
            item.summary = html_encode(tools.genTopicSummary(item.content, config.topic_summary_len)); 
            item.save(task);
        };
        task(err);
    });
};
