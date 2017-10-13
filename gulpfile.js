'use strict';

const gulp = require('gulp');
const concat = require('gulp-concat');
const babel = require('gulp-babel');
const sass = require('gulp-sass');
const wait = require('gulp-wait');
const uglify = require('gulp-uglify');
const rename = require('gulp-rename');
const header = require('gulp-header');
const minifyCSS = require('gulp-minify-css');
const angularTemplates = require('gulp-angular-templates');

const runSequence = require('run-sequence');
const del = require('del');
const karma = require('karma').Server;
const pkg = require('./package');

let BANNER = [
  '/**',
  ' * <%= pkg.name %> v<%= pkg.version %> (<%= pkg.homepage %>)',
  ' * Copyright <%= new Date().getFullYear() %> <%= pkg.author %>',
  ' * Licensed under <%= pkg.license %>',
  ' */',
  ''
].join('\n');

let PATH = {
  SOURCE: './src/',
  TEST: './test/',
  DIST: './dist/',
  TEMP: './tmp/'
};

let filename = 'autocomplete';
let ckModule = 'ck-autocomplete';

gulp.task('default', ['build']);

gulp.task('build', ['clean-dist'], function(cb) {
  runSequence(
    'sass',
    'html',
    'move',
    'convert-and-concat',
    'uglify',
    'minify',
    'banner',
    'clean-tmp',
    cb);
});

gulp.task('clean-dist', function(cb) {
  return del([PATH.DIST], cb);
});

gulp.task('clean-temp', function(cb) {
  return del([PATH.TEMP], cb);
});

gulp.task('sass', function() {
  return gulp.src(`${PATH.SOURCE}*.scss`)
    .pipe(sass()).on('error', handleErr)
    .pipe(gulp.dest(PATH.DIST))
    .pipe(wait(500));
});

gulp.task('html', function () {
  return gulp.src(`${PATH.SOURCE}/**/*.html`)
      .pipe(angularTemplates({ module: ckModule, standalone: false }))
      .pipe(gulp.dest(PATH.TEMP));
});

gulp.task('move', function() {
  return gulp.src([
      `${PATH.SOURCE}/**/*.js`,
      
    ])
    .pipe(gulp.dest(PATH.TEMP));
});

gulp.task('convert-and-concat', function() {
  return gulp.src([
      `${PATH.TEMP}/**/*.js`
    ])
    .pipe(babel())
    .pipe(concat(filename + '.js'))
    .pipe(gulp.dest(PATH.DIST));
});

gulp.task('uglify', function() {
  return gulp.src(PATH.DIST + filename + '.js')
    .pipe(uglify()).on('error', handleErr)
    .pipe(rename({
      basename: filename,
      suffix: '.min'
    }))
    .pipe(gulp.dest(PATH.DIST));
});

gulp.task('minify', function() {
  return gulp.src(PATH.DIST + filename + '.css')
    .pipe(minifyCSS())
    .pipe(rename({
      basename: filename,
      suffix: '.min'
    }))
    .pipe(gulp.dest(PATH.DIST));
});

gulp.task('banner', function() {
  return gulp.src(PATH.DIST + '*')
    .pipe(header(BANNER, {
      pkg: pkg
    }))
    .pipe(gulp.dest(PATH.DIST));
});

gulp.task('test', function (done) {
  new karma({
    configFile: __dirname + '/karma.conf.js',
    singleRun: true
  }, done).start();
});

let handleErr = function(err) {
  console.error('ERROR' + (err.fileName ? ' in ' + err.fileName : ':'));
  console.error(err.message);
  this.end();
};