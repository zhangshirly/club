var through = require('through2');
var gulp = require('gulp');
var useref = require('gulp-useref');
var less = require('gulp-less');
var uglify = require('gulp-uglify');
var minifyCss = require('gulp-minify-css');
var htmlmin = require('gulp-htmlmin');
var gulpif = require('gulp-if');
var rev = require('gulp-rev');
var rename = require('gulp-rename');
var revReplace = require('gulp-rev-replace');
var del = require('del');


var DIST = 'public_dist';

gulp.task('clean', function(cb) {
    del([DIST, '!' + DIST + '/upload'], cb);
});

//复制文件
gulp.task('copy', ['clean'], function() {
    return gulp.src([
            'public/**',
            '!public/**/*.less'
        ])
        .pipe(gulpif(['*.js', '!*.min.js'], uglify()))
        .pipe(gulpif(['*.css', '!*.min.css'], minifyCss()))
        .pipe(gulp.dest(DIST));
});

gulp.task('less', ['clean'], function() {
    return gulp.src('public/**/*.less')
        .pipe(less())
        .pipe(rename(function(path) {
            path.extname = '.less';
        }))
        .pipe(gulp.dest(DIST));
});

gulp.task('useref', ['clean'], function() {
    var assets = useref.assets({
        searchPath: './'
    });
    return gulp.src('views/**/*.html', {
            base: './'
        })
        .pipe(assets)
        .pipe(gulpif('*.js', uglify()))
        .pipe(gulpif('*.css', less()))
        .pipe(gulpif('*.css', minifyCss()))
        .pipe(rev())
        .pipe(assets.restore())
        .pipe(useref())
        .pipe(revReplace({
            prefix: '/public/'
        }))
        .pipe(gulp.dest(DIST));
});

gulp.task('default', ['clean', 'copy', 'less', 'useref']);

gulp.task('less:dev', function() {
    return gulp.src('public/**/*.less')
        .pipe(less())
        .pipe(rename(function(path) {
            path.extname = '.less';
        }))
        .pipe(gulp.dest(DIST));
});

gulp.task('copy:dev', function() {
    return gulp.src([
            'public/**',
            '!public/**/*.less'
        ])
        .pipe(gulp.dest(DIST));
});

gulp.task('copy:dev:html', function() {
    return gulp.src('views/**/*.html', {
            base: './'
        })
        .pipe(gulp.dest(DIST));
});

// 定义dev任务在日常开发中使用
gulp.task('dev', ['clean'], function() {
    gulp.run(['less:dev', 'copy:dev', 'copy:dev:html']);
    gulp.watch('public/**', ['less:dev', 'copy:dev']);
    gulp.watch('views/**', ['copy:dev:html']);
});
