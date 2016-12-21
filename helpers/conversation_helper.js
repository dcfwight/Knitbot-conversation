// Helper file for Conversation
var bluemix = require('./../config/bluemix'); // Gets environment variables when running on Bluemix
var extend = require('util')._extend;
var watson = require('watson-developer-cloud');
require('dotenv').config({silent: true});

// Watson Conversation Credentials. If Bluemix credentials exist, then override local - to see VCAP_SERVICES run cf env APPNAME
var conversationCredentials = extend({
    //url: "https://gateway.watsonplatform.net/conversation/api",
    username: process.env.conversation_username,
    password: process.env.conversation_password,
    version: 'v1',
    version_date: '2016-09-20'
}, bluemix.getServiceCreds('conversation')); // retrieves the VCAP_SERVICES

var WORKSPACE_ID = process.env.WORKSPACE_ID; // WORKSPACE_ID is the ID for the workspace in Conversation

// Create Conversation service wrapper
var conversation = watson.conversation(conversationCredentials);

var convHelper = {
    sendMessage: function (input, context) {
        return new Promise (function (resolve, reject) {
                if (!WORKSPACE_ID) {
                    resolve ({
                        'output': {
                            'text': 'The app has not been configured with a <b>WORKSPACE_ID</b> environment variable.\
                            Please refer to the ' + '<a href="https://github.com/watson-developer-cloud/conversation-simple">\
                            README</a> documentation on how to set this variable. <br>' + 'Once a workspace has been defined\
                            the intents may be imported from ' + '<a href="https://github.com/watson-developer-cloud/conversation\
                            -simple/blob/master/training/car_intents.csv">here</a> in order to get a working application.'
                        }
                    });
                }
                
                var payload = {
                    workspace_id: WORKSPACE_ID,
                    alternate_intents: true, // set to true if you want all the intents, or false if you just want top.
                    context: context,
                    input: input
                };
               
                //console.log(payload);
                // Send the input to the conversation service
                conversation.message(payload, function(err, data) {
                    if (err) {
                        //console.log('\nError in communication with Watson Conversation');
                        console.log(JSON.stringify(err, null, 2));
                        reject (err);
                    } else if (data) {
                        //console.log('\nPayload successfully set to Conversation. Response from Conversation is: ');             
                        resolve (data);
                    }
                });
        });    
    }    
}

module.exports = convHelper;

/*
var testInput = {text: "Hi there"}

convHelper.sendMessage(testInput, {})
    .then(function(response) {
        console.log(response);
    }, function (error){
        console.log(error);    
    });
*/    
