var gulp = require('gulp'),
    less = require('gulp-less'),
    template = require("gulp-amd-template"),
    concat = require('gulp-concat'),
    process = require('child_process'),
    webpack = require('gulp-webpack'),
    runSequence = require('run-sequence'),
    uglify = require('gulp-uglify'),
    minifyCss = require('gulp-minify-css'),
    htmlmin = require('gulp-htmlmin');

var config = {
    src: 'source/',
    dist: 'public/',
    webpack:{
        // 页面需要打包的文件进行打包构建
        entry: {
            'tab': './source/javascripts/tab/main.js',
            'index': './source/javascripts/index/main.js',
            'topic': './source/javascripts/topic/main.js',
            'admin': './source/javascripts/admin/main.js',
        },
        output: {
            filename: '[name].js'
        }
    }
}

//复制文件
gulp.task('copy', function() {
    gulp.src([config.src+'**/*.*', '!'+config.src+'**/*.less', '!'+config.src+'**/*.tpl'])
        .pipe(gulp.dest(config.dist));
});

//less解析
gulp.task('build-less', function() {
    gulp.src(config.src+'**/*.less')
        .pipe(less())
        .pipe(gulp.dest(config.dist));
});

//less解析
gulp.task('build-less-minify', function() {
    gulp.src(config.src+'**/*.less')
        .pipe(less())
        .pipe(minifyCss())
        .pipe(gulp.dest(config.dist));
});

//模板编译
gulp.task('tpl', function(){
    gulp.src(config.src+'**/*.tpl')
        .pipe(template())
        .pipe(gulp.dest(config.src));
})

// dist自动执行命令并部署
gulp.task('shell',function(){
    // 执行部署shell脚本，并在部署完成是回调输出脚本结果
    process.exec('sh ./test.sh', function (error,stdout,stderr) {
        if (error !== null) {
          console.log('exec error: ' + error);
        }else{
            console.log(stdout);
        }
    });
});

var js2webpack = config.src + 'javascripts/**/*.js';
var tpl2webpack = config.src + 'tpl/**/*.*';

gulp.task('webpack', function() {
    // !isWebpackInit && initWebpackConfig();
    return gulp.src(js2webpack)
        .pipe(webpack(config.webpack))
        .pipe(gulp.dest(config.dist + 'js/'));
});

gulp.task('webpackUglify', function() {
    // !isWebpackInit && initWebpackConfig();
    return gulp.src(js2webpack)
        .pipe(webpack(config.webpack))
        .pipe(uglify())
        .pipe(gulp.dest(config.dist + 'js/'));
});


/*
 *使用gulp或gulp dev进行开发调试
 */
var fn = function(){};

gulp.task('dev', function() {
    gulp.run('copy', 'build-less', 'tpl', 'webpack');
    gulp.watch(['./source/**/*.js','!./source/javascripts/template/*.js'], ['copy', 'webpack']);
    gulp.watch(['./source/**/*.less'], ['copy', 'build-less']);
    gulp.watch(['./source/**/*.tpl'], ['copy', 'tpl']);
    gulp.watch(['./source/**/*.html'], ['copy', 'tpl']);
});

gulp.task('dist',function(){
    runSequence('copy', 'build-less-minify', 'tpl', 'webpackUglify', fn);
});

gulp.task('default',['dev']);

/*
 *  使用gulp或gulp dev进行开发watch调试
 *  gulp dist发布
 */