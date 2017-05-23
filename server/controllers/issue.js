/*!
 * nodeclub - controllers/issue.js
 */

/**
 * Module dependencies.
 */

var validator = require('validator');

var at = require('../common/at');
var User = require('../proxy').User;
var Topic = require('../proxy').Topic;
var Issue = require('../proxy').Issue;
var EventProxy = require('eventproxy');
var cache = require('../common/cache');
var tools = require('../common/tools');
var store = require('../common/store');
var dataAdapter = require('../common/dataAdapter');
var html2markdown = require('html2markdown');
var config = require('../config');
var renderHelper = require('../common/render_helper');
var request = require('request');
var _ = require('lodash');

exports.activity = function(req, res, next) {
    var page = parseInt(req.query.page, 10) || 1;
    page = page > 0 ? page : 1;
    var tab = req.params.tab || 'all';

    var proxy = new EventProxy();
    proxy.fail(next);

    // 取主题
    var query = {};
    if (tab && tab !== 'all') {
        if (tab === 'good') {
            query.good = true;
        } else {
            query.tab = tab;
        }
    }

    var limit = config.list_issue_count;
    var options = {
        skip: (page - 1) * limit,
        limit: limit,
        sort: '-create_at'
    };

    cache.get('issues_list', proxy.done(function(topics) {
        if (topics) {
            return proxy.emit('issues_list', topics);
        }
        Issue.getIssueByQuery({top: true}, options, proxy.done('issues_list', function(issues_list) {
            // cache.set('issues_list', issues_list, 1000 * 60 * 1);
            return issues_list;
        }));
    }));
    // END 取主题

    // 取排行榜上的用户
    cache.get('tops', proxy.done(function(tops) {
        if (tops) {
            proxy.emit('tops', tops);
        } else {
            User.getUsersByQuery({
                    '$or': [{
                        is_block: {
                            '$exists': false
                        }
                    }, {
                        is_block: false
                    }]
                }, {
                    limit: 10,
                    sort: '-topic_count'
                },
                proxy.done('tops', function(tops) {
                    cache.set('tops', tops, 1000 * 60 * 1);
                    return tops;
                })
            );
        }
    }));

    // 取会议文章等信息
    cache.get('issues', proxy.done(function(issues) {
        if (issues) {
            proxy.emit('issues', issues);
        } else {
            Issue.getIssueByQuery(
                {
                    top: true
                }, {
                    skip: 0,
                    limit: 10,
                    sort: '-create_at'
                }, proxy.done('issues', function(issues) {
                    cache.set('issues', issues, 1000 * 60 * 1);
                    return issues;
                })
            );
        }
    }));

    // 取排行榜上的用户
    cache.get('topic_caculate', proxy.done(function(topics) {
        if (topics) {
            proxy.emit('topic_caculate', topics);
        } else {
            var topic_caculate = {};
            Topic.getAllTopicCount({
                tab: {
                    $in: config.tabKeys
                }
            }, proxy.done('topic_caculate', function(res) {
                for (var i in res) {
                    topic_caculate['all'] = typeof(topic_caculate['all']) === 'number' ? (topic_caculate['all'] + 1) : 1;
                    topic_caculate[res[i].tab] = typeof(topic_caculate[res[i].tab]) === 'number' ? (topic_caculate[res[i].tab] + 1) : 1;
                }
                return topic_caculate;
            }));

        }

    }));

    // 取0回复的主题
    cache.get('no_reply_topics', proxy.done(function(no_reply_topics) {
        if (no_reply_topics) {
            proxy.emit('no_reply_topics', no_reply_topics);
        } else {
            Topic.getTopicsByQuery({
                    reply_count: 0
                }, {
                    limit: 5,
                    sort: '-visit_count'
                },
                proxy.done('no_reply_topics', function(no_reply_topics) {
                    cache.set('no_reply_topics', no_reply_topics, 1000 * 60 * 1);
                    return no_reply_topics;
                }));
        }
    }));

    // 取分页数据
    cache.get('pages', proxy.done(function(pages) {
        if (pages) {
            proxy.emit('pages', pages);
        } else {
            Issue.getCountByQuery({top: true}, proxy.done(function(issues_count) {
                var pages = Math.ceil(issues_count / limit);
                cache.set(JSON.stringify(query) + 'pages', pages, 1000 * 60 * 1);
                proxy.emit('pages', pages);
            }));
        }
    }));


    var tabName = renderHelper.tabName(tab);

    proxy.all('issues_list', 'tops', 'no_reply_topics', 'pages', 'topic_caculate', 'issues',
        function(issues_list, tops, no_reply_topics, pages, topic_caculate, issues) {

            res.render('activity/index', {
                issues_list: issues_list,
                current_page: page,
                list_topic_count: limit,
                tops: tops,
                showSignIn: true,
                no_reply_topics: no_reply_topics,
                pages: pages,
                tabs: config.tabs,
                tab: tab,
                issues: issues,
                topic_caculate: topic_caculate,
                pageTitle: tabName && (tabName + '版块')
            });
        });

};
