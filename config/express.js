'use strict';

// Module dependencies
var express    = require('express'),
  errorhandler = require('errorhandler');

module.exports = function (app) {

  // Setup static public directory
  app.use(express.static(__dirname + '/../public'));
  
  // No longer using Jade - just using normal html
  //app.set('view engine', 'jade');
  //app.set('views', __dirname + '/../views');

  // Add error handling in dev
  if (!process.env.VCAP_SERVICES) {
    app.use(errorhandler());
  }
};