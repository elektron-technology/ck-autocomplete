// Karma configuration
// Generated on Thu Oct 12 2017 16:25:17 GMT+0100 (BST)

module.exports = function(config) {

  const puppeteer = require('puppeteer');
  process.env.CHROME_BIN = puppeteer.executablePath();

  config.set({

    // Base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // Frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine'],


    // List of files / patterns to load in the browser
    files: [
      'bower_components/angular/angular.js',
      'bower_components/angular-mocks/angular-mocks.js',
      'bower_components/angucomplete-alt/angucomplete-alt.js',
      'src/autocomplete.component.js',
      'src/autocomplete.config.factory.js',
      'src/filters/without.filter.js',
      'test/*.spec.js'
    ],


    // List of files to exclude
    exclude: [
    ],


    // Preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
    },


    // Test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['dots'],


    // Web server port
    port: 9876,


    // Enable / disable colors in the output (reporters and logs)
    colors: true,


    // Level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // Enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,


    // Start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: [
      'ChromeHeadless'
    ],

    browserConsoleLogOptions: {
      terminal: true,
      level: ''
    },


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity
  });
};
