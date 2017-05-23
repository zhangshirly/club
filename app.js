/*!
 * nodeclub - app.js
 */

/**
 * Module dependencies.
 */

var config = require('./server/config');


var path = require('path');
var express = require('express');
var session = require('express-session');
var passport = require('passport');
var models = require('./server/models');
var GitHubStrategy = require('passport-github').Strategy;
var githubStrategyMiddleware = require('./server/middlewares/github_strategy');
var webRouter = require('./server/web_router');
var apiRouterV1 = require('./server/api_router_v1');
var auth = require('./server/middlewares/auth');
var bannerMiddlewares = require('./server/middlewares/banners');
var MongoStore = require('connect-mongo')(session);
var _ = require('lodash');
var csurf = require('csurf');
var compress = require('compression');
var bodyParser = require('body-parser');
var busboy = require('connect-busboy');
var errorhandler = require('errorhandler');
var cors = require('cors');
var schedule = require('node-schedule');
var scheduleTask = require('./server/controllers/schedule');
var wechat = require('wechat');
var wechatCenter = require('./server/controllers/wechatCenter');


// assets
var assets = {};
if (config.mini_assets) {
    try {
        assets = require('./assets.json');
    } catch (e) {
        console.log('You must execute `make build` before start app when mini_assets is true.');
        throw e;
    }
}

var urlinfo = require('url').parse(config.host);
config.hostname = urlinfo.hostname || config.host;

var app = express();

// configuration in all env
app.set('views', path.join(__dirname, '/public/views'));
app.set('view engine', 'html');
app.engine('html', require('ejs-mate'));
app.locals._layoutFile = 'layout.html';

app.use(require('response-time')());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(require('method-override')());
app.use(require('cookie-parser')(config.session_secret));
app.use(compress());
app.use(session({
    secret: config.session_secret,
    store: new MongoStore({
        url: config.db
    }),
    resave: true,
    saveUninitialized: true,
}));

app.use(passport.initialize());

// custom middleware
app.use(csurf({
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS', 'POST']
}));
app.use(auth.authUser);
app.use(auth.blockUser());
app.use(bannerMiddlewares.getBanners);

app.use('/public/views', function(req, res) {
    res.status(404).send('Not found');
});
app.use(/\/public\/.*.less$/, function(req, res, next) {
    res.header('Content-Type', 'text/css');
    next();
});
// 正式环境使用nginx管理静态资源
if (config.debug) {
    app.use('/public/upload', express.static(path.join(__dirname, 'upload')));
    app.use('/public', express.static(path.join(__dirname, 'public')));
}

app.use(function(req, res, next) {
    if (req.path.indexOf('/api') === -1 && req.path.indexOf('topic/create') === -1 && req.path.indexOf('marktang/html') === -1 && req.path.indexOf('auth/github') === -1 && req.path.indexOf('/wechat') === -1 && req.path.indexOf('/wechatBind') === -1) {
        csurf()(req, res, next);
        return;
    }
    next();
});

if (!config.debug) {
    app.set('view cache', true);
}

// set static, dynamic helpers
_.extend(app.locals, {
    config: config,
    assets: assets
});

_.extend(app.locals, require('./server/common/render_helper'));
app.use(function(req, res, next) {
    if (!(/webauth/.test(req.url))) {
        res.locals.csrf = req.csrfToken ? req.csrfToken() : '';
        next();
    }
});

// github oauth
passport.serializeUser(function(user, done) {
    done(null, user);
});
passport.deserializeUser(function(user, done) {
    done(null, user);
});
passport.use(new GitHubStrategy(config.GITHUB_OAUTH, githubStrategyMiddleware));

app.use(busboy({
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    }
}));

// routes
app.use('/', webRouter);
app.use('/api/v1', cors(), apiRouterV1);

// wechat development
app.use('/wechat', wechat(config.wechat_validate.token, wechatCenter.all));

// error handler
if (config.debug) {
    app.use(errorhandler());
} else {
    //test by henry, remove on release
    app.use(errorhandler());
    /**
  app.use(function (err, req, res, next) {
    return res.status(500).send('500 status');
  });*/
}

app.listen(config.port, function() {
    // 设置定时任务
    schedule.scheduleJob('0 2 * * *', scheduleTask.pushTopic);
    console.log("NodeClub listening on port %d in %s mode", config.port, app.settings.env);
    console.log("God bless love....");
    console.log("You can debug your app with http://" + config.hostname + ':' + config.port);
});


module.exports = app;
