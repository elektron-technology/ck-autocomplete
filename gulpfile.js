'use strict';

const gulp = require('gulp');
const sass = require('gulp-sass');
const wait = require('gulp-wait');
const del = require('del');
const karma = require('karma').Server;

let PATH = {
  SOURCE: './src/',
  TEST: './test/',
  DIST: './dist/'
};

let handleErr = function(err) {
  console.error('ERROR' + (err.fileName ? ' in ' + err.fileName : ':'));
  console.error(err.message);
  this.end();
};

gulp.task('sass', function() {
  return gulp.src(`${PATH.SOURCE}*.scss`)
    .pipe(sass()).on('error', handleErr)
    .pipe(gulp.dest(PATH.DIST))
    .pipe(wait(500));
});

gulp.task('clean', function(cb) {
  del([PATH.DIST], cb);
});

gulp.task('test', function (done) {
  new karma({
    configFile: __dirname + '/karma.conf.js',
    singleRun: true
  }, done).start();
});