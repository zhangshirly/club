/*!
 * nodeclub - site index controller.
 * Copyright(c) 2012 fengmk2 <fengmk2@gmail.com>
 * Copyright(c) 2012 muyuan
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var User = require('../proxy').User;
var Topic = require('../proxy').Topic;
var Issue = require('../proxy').Issue;
var Activity = require('../proxy').Activity;
var config = require('../config');
var eventproxy = require('eventproxy');
var cache = require('../common/cache');
var xmlbuilder = require('xmlbuilder');
var renderHelper = require('../common/render_helper');


// 主页的缓存工作。主页是需要主动缓存的
function indexCache() {
    if (config.debug) {
        return;
    }
    var limit = config.list_topic_count;
    // 为所有版块（tab）做缓存
    [
        ['', '全部']
    ].concat(config.tabs).forEach(function(pair) {
        // 只缓存第一页, page = 1。options 之所以每次都生成是因为 mongoose 查询时，
        // 会改动它
        var options = {
            skip: (1 - 1) * limit,
            limit: limit,
            sort: '-top -last_reply_at'
        };
        var tabValue = pair[0];
        var query = {};
        if (tabValue) {
            query.tab = tabValue;
        }
        var optionsStr = JSON.stringify(query) + JSON.stringify(options);
        Topic.getTopicsByQuery(query, options, function(err, topics) {
            cache.set(optionsStr, topics);
        });
    });
}
setInterval(indexCache, 1000 * 5); // 五秒更新一次
indexCache();
// END 主页的缓存工作

exports.baidu_verify = function(req, res, next){
    res.end('KputUQ9DeD');
    // res.render('./baidu_verify_4PbywkCOZU');
}

exports.google_verify = function(req, res, next){
    res.end('google-site-verification: googlee6712631ad5156c9.html');
}

exports.index = function(req, res, next) {
    var page = parseInt(req.query.page, 10) || 1;
    page = page > 0 ? page : 1;
    var tab = req.params.tab || 'all';
    var sort =  req.params.sort || 'default';  // 根据不同的参数决定文章排序方式
    var sortMap = {
        'reply': '-top -good -last_reply_at',
        'create': '-top -create_at',
        'good': '-good -visit_count',
        'good_top': '-good -top -visit_count',
        'top_good': '-top -good -visit_count',
        'default': '-top -good -create_at'
    };
    var sortType = sortMap[sort] || sortMap['default'];

    var proxy = new eventproxy();
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

    var limit = config.list_topic_count;
    var options = {
        skip: (page - 1) * limit,
        limit: limit,
        sort: sortType
    };
    var optionsStr = JSON.stringify(query) + JSON.stringify(options);

    cache.get(optionsStr, proxy.done(function(topics) {
        if (topics) {
            return proxy.emit('topics', topics);
        }
        Topic.getTopicsByQuery(query, options, proxy.done('topics', function(topics) {
            return topics;
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
                    sort: '-create_at'
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
            Topic.getCountByQuery(query, proxy.done(function(all_topics_count) {
                var pages = Math.ceil(all_topics_count / limit);
                cache.set(JSON.stringify(query) + 'pages', pages, 1000 * 60 * 1);
                proxy.emit('pages', pages);
            }));
        }
    }));

    //topic类型过滤器
    var topicFormat = function(topics) {
        var arr = [];
        for (var i = 0, len = topics.length; i < len; i++) {
            if (topics[i].type && topics[i].type == 1) {
                var proArr = topics[i].title.replace("https://", "").replace("http://", "").split("/");
                if (proArr.length >= 3) {
                    topics[i].proName = proArr[2];
                    topics[i].proAuthor = proArr[1];
                    arr.push(topics[i]);
                }
            } else {
                arr.push(topics[i]);
            }
        }
        return topics;
    }

    var tabName = renderHelper.tabName(tab);
    if (!tabName) {
        proxy.all('topics', 'tops', 'no_reply_topics', 'pages', 'topic_caculate','issues',
            function(topics, tops, no_reply_topics, pages, topic_caculate, issues) {
                res.render('index', {
                    topics: topicFormat(topics),
                    current_page: page,
                    base: '/sort/' + sort,
                    list_topic_count: limit,
                    tops: tops,
                    showSignIn: true,
                    // no_reply_topics: no_reply_topics,
                    activity_panel_show: true,
                    pages: pages,
                    tabs: config.tabs,
                    tab: tab,
                    issues: issues,
                    topic_caculate: topic_caculate,
                    pageTitle: tabName && (tabName + '版块')
                });
            });
    } else {
        proxy.all('topics', 'tops', 'no_reply_topics', 'pages', 'topic_caculate', 'issues',
            function(topics, tops, no_reply_topics, pages, topic_caculate, issues) {
                res.render('tab/index', {
                    topics: topicFormat(topics),
                    current_page: page,
                    base: '/sort/' + sort,
                    list_topic_count: limit,
                    tops: tops,
                    showSignIn: true,
                    // no_reply_topics: no_reply_topics,
                    activity_panel_show: true,
                    pages: pages,
                    tabs: config.tabs,
                    tab: tab,
                    issues: issues,
                    topic_caculate: topic_caculate,
                    pageTitle: tabName && (tabName + '版块')
                });
            });
    }
};

exports.issue = function(req, res, next) {
    var page = parseInt(req.query.page, 10) || 1;
    page = page > 0 ? page : 1;
    var tab = req.params.tab || 'all';

    var proxy = new eventproxy();
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
                    sort: '-create_at'
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

            res.render('issue/index', {
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

exports.activity = function(req, res, next) {
    var page = parseInt(req.query.page, 10) || 1;
    page = page > 0 ? page : 1;
    var tab = req.params.tab || 'all';

    var proxy = new eventproxy();
    proxy.fail(next);

    // 取活动
    var limit = config.list_activity_count;
    var options = {
        skip: (page - 1) * limit,
        limit: limit,
        sort: '-create_at'
    };

    cache.get('activity_list'+JSON.stringify(options), proxy.done(function(topics) {
        if (topics) {
            return proxy.emit('activity_list', topics);
        }
        Activity.getActivityByQuery({}, options, proxy.done('activity_list', function(activity_list) {
            cache.set('activity_list' + JSON.stringify(options), activity_list, 1000 * 60 * 1);
            return activity_list;
        }));
    }));
    // END 取活动
    
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
                    sort: '-create_at'
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
            Activity.getCountByQuery({}, proxy.done(function(activity_list) {
                var pages = Math.ceil(activity_list / limit);
                proxy.emit('pages', pages);
            }));
        }
    }));


    var tabName = renderHelper.tabName(tab);

    proxy.all('issues', 'tops', 'no_reply_topics', 'pages', 'topic_caculate', 'activity_list',
        function(issues, tops, no_reply_topics, pages, topic_caculate, activity_list) {
            res.render('activity/index', {
                activity_list: activity_list,
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

exports.sitemap = function(req, res, next) {
    var urlset = xmlbuilder.create('urlset', {
        version: '1.0',
        encoding: 'UTF-8'
    });
    urlset.att('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9');

    var ep = new eventproxy();
    ep.fail(next);

    ep.all('sitemap', function(sitemap) {
        res.type('xml');
        res.send(sitemap);
    });

    cache.get('sitemap', ep.done(function(sitemapData) {
        if (sitemapData) {
            ep.emit('sitemap', sitemapData);
        } else {
            Topic.getLimit5w(function(err, topics) {
                if (err) {
                    return next(err);
                }
                topics.forEach(function(topic) {
                    urlset.ele('url').ele('loc', 'http://imweb.io/topic/' + topic._id);
                });

                var sitemapData = urlset.end();
                // 缓存一天
                cache.set('sitemap', sitemapData, 1000 * 3600 * 24);
                ep.emit('sitemap', sitemapData);
            });
        }
    }));
};

// top topics
exports.latestTopics = function(req, res, next) {

    var proxy = new eventproxy();
    proxy.fail(next);

    // 取主题
    var query = {};

    var sort =  req.params.sort || 'default';  // 根据不同的参数决定文章排序方式
    var sortMap = {
        'reply': '-top -good -last_reply_at',
        'create': '-top -create_at',
        'good': '-good -visit_count',
        'good_top': '-good -top -visit_count',
        'top_good': '-top -good -visit_count',
        'default': '-top -good -create_at'
    };
    var sortType = sortMap[sort] || sortMap['default'];

    var options = {
        skip: 0,
        limit: 6,
        sort: sortType
    };
    var optionsStr = JSON.stringify(query) + JSON.stringify(options);

    cache.get(optionsStr, proxy.done(function(topics) {
        if (topics) {
            return proxy.emit('topics', topics);
        }
        Topic.getTopicsByQuery(query, options, proxy.done('topics', function(topics) {
            return topics;
        }));
    }));


    proxy.all('topics', function(topics) {
        res.end('callback(' + JSON.stringify(topics) +')');
        return true;
    });

};

//全站搜索

exports.search = function(req, res, next) {
   var search = req.body.search;

   var page = parseInt(req.query.page, 10) || 1;
    page = page > 0 ? page : 1;
    var tab = req.params.tab || 'all';

    var proxy = new eventproxy();
    proxy.fail(next);

    // 取主题
    var query = {};
    if(search){
    query.title = new RegExp(search,'i');
    }
    if (tab && tab !== 'all') {
        if (tab === 'good') {
            query.good = true;
        } else {
            query.tab = tab;
        }
    }

    var limit = config.list_topic_count;
    var options = {
        skip: (page - 1) * limit,
        limit: limit,
        sort: '-top -last_reply_at'

    };
    var optionsStr = JSON.stringify(query) + JSON.stringify(options);
    cache.get(optionsStr, proxy.done(function(topics) {
        if (topics) {
            return proxy.emit('topics', topics);
        }
        Topic.getTopicsByQuery(query, options, proxy.done('topics', function(topics) {
            return topics;
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
            Topic.getCountByQuery(query, proxy.done(function(all_topics_count) {
                var pages = Math.ceil(all_topics_count / limit);
                cache.set(JSON.stringify(query) + 'pages', pages, 1000 * 60 * 1);
                proxy.emit('pages', pages);
            }));
        }
    }));

    //topic类型过滤器
    var topicFormat = function(topics) {
        var arr = [];
        for (var i = 0, len = topics.length; i < len; i++) {
            if (topics[i].type && topics[i].type == 1) {
                var proArr = topics[i].title.replace("https://", "").replace("http://", "").split("/");
                if (proArr.length >= 3) {
                    topics[i].proName = proArr[2];
                    topics[i].proAuthor = proArr[1];
                    arr.push(topics[i]);
                }
            } else {
                arr.push(topics[i]);
            }
        }
        return topics;
    }

    var tabName = renderHelper.tabName(tab);
    if (!tabName) {
        proxy.all('topics', 'tops', 'no_reply_topics', 'pages', 'topic_caculate','issues',
            function(topics, tops, no_reply_topics, pages, topic_caculate, issues) {
                res.render('index', {
                    topics: topicFormat(topics),
                    current_page: page,
                    base: '/',
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
    } else {
        proxy.all('topics', 'tops', 'no_reply_topics', 'pages', 'topic_caculate', 'issues',
            function(topics, tops, no_reply_topics, pages, topic_caculate, issues) {

                res.render('tab/index', {
                    topics: topicFormat(topics),
                    current_page: page,
                    base: '/',
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
    }
}
