var extend = require('util')._extend;
var moment = require('moment');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var validator = require('validator') // validation of strings (esp emails)

require('dotenv').config({
    silent: true
});

// create reusable transporter object using the default SMTP transport
var SERVICE = process.env.email_service;
var AUTH = {
                "user": process.env.email_sender,
                "pass": process.env.email_password
            };

var MAIL_OPTIONS = {
        from: process.env.email_sender_address,
        to: [process.env.email_recipient1] // list of receivers
};

var transporter = nodemailer.createTransport(smtpTransport({
    service: SERVICE,
    auth: AUTH
    }));

var emailHelper = {
    transporter: function() {
        return nodemailer.createTransport(smtpTransport({
            service: process.env.email_service,
            auth: {
                "user": process.env.email_sender,
                "pass": process.env.email_password
            }
        }));
    },
    constructEmailBody: function(dbResponse) {
        //console.log(JSON.stringify(dbResponse, null, 2));
        
        var entry_time = moment(dbResponse.docs[0].context.entry_time);
        var exit_time = moment(dbResponse.docs[dbResponse.docs.length - 1].context.entry_time);
        var duration = exit_time.from(entry_time, true);
        
        
        var emailBody = '<b>Script of conversation between user and knitbot</b><br>';
        emailBody += '<b>Conversation id: </b>';
        emailBody += dbResponse.docs[0].context.conversation_id +'<br>';
        emailBody += '<b>Start time of conversation: </b>';
        emailBody += entry_time.format("dddd, MMMM Do YYYY, h:mm:ss a") + '<br>';
        
        emailBody += '<b>End time of conversation: </b>';
        emailBody += exit_time.format("dddd, MMMM Do YYYY, h:mm:ss a") + '<br>';
        emailBody +='<b>Duration: </b>'+duration + '<br>';
        
        emailBody += '<br>________________________________________________________<br>'
        emailBody += '<b><i>Conversation Node:</i></b> 0<br> ';
        emailBody += '<b><i>Knitbot:</i></b> '
        emailBody += dbResponse.docs[0].output.text;
        emailBody += '<br>________________________________________________________<br>'
        
        for (var i =1; i < dbResponse.docs.length; i++) {
            emailBody += '<b><i>Conversation Node:</i></b> ' + (i) +'<br>';
            if (dbResponse.docs[i].input.text) {
                emailBody += '<b><i>User:</i></b> ' + dbResponse.docs[i].input.text +'<br>';
                emailBody += '<b><i>Intent:</i></b> ' + dbResponse.docs[i].intents[0].intent +'<br>';
                emailBody += '<b><i>Conf:</i></b> ' + dbResponse.docs[i].intents[0].confidence.toFixed(2) +'<br><br>';
            }
            for (var j=0; j < dbResponse.docs[i].output.text.length; j++) {
                emailBody += '<b><i>Knitbot:</i></b> '+ dbResponse.docs[i].output.text[j] + '<br>';    
            }
            
            emailBody += '<br>________________________________________________________<br>'
            
        }
        //console.log(emailBody);
        return emailBody;   
    },
    sendEmail: function (emailSubject, emailBody, recipients) {
        // setup e-mail
        var mailOptions = extend(
            MAIL_OPTIONS,
            {
                subject: emailSubject, // Subject line
                text: emailBody, // plaintext body
                html: emailBody, // html body
            });
        
        if (recipients) {
            var mailOptions = extend(mailOptions, {to: recipients});
        }
        //console.log(mailOptions);
    
        // send mail with defined transport object
        transporter.sendMail(mailOptions, function(error, info) {
            if (error) {
                return console.log(error);
            } else {
                console.log('Message sent: ' + info.response);
    
            }
        });
    },
    validateEmail: function(email) {
        return validator.isEmail(email);
    }
};

/*
var testDateString = '2016-11-17T11:24:15.142Z';
var d2 =moment(testDateString);
console.log(d2.format("dddd, MMMM Do YYYY, h:mm:ss a"));
*/

//console.log(emailHelper.validateEmail('dog@gmail.c'));

//emailHelper.sendEmail('hello', 'yes, i am here');

module.exports = emailHelper;


      