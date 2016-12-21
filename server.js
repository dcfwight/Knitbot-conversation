var bodyParser = require('body-parser');
var express = require('express');
require('dotenv').config({silent: true}); // access the .env file for environment variables via process.env

var middleware = require('./middleware/middleware.js'); // middleware functions
var router = require('./routes/router.js');

var PORT = process.env.VCAP_APP_PORT || 3000;

var app = express(); // server

app.use(bodyParser.json()); // support json encoded bodies
// Bootstrap application settings
require('./config/express')(app);

// use logging function from middleware
app.use(middleware.logger);
// use router from routes.js file
app.use('/', router);

// not sure this is required - using an errorhandler in '/config/express')
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

app.listen(PORT, function() {
    console.log('\nExpress server started. Listening at port: ' + PORT)
});