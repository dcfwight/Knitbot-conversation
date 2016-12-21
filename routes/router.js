var router = require('express').Router();

var cloudant_helper = require('./../helpers/cloudant_helper.js');
var conv_helper = require('./../helpers/conversation_helper.js');
var email_helper = require('./../helpers/email_helper.js');
var magento = require('./../helpers/magento_helper.js');
var _ = require('underscore');


// render index page
router.all('/', function(req, res) {
    res.render('index');
});

router.post('/api/message', function(req, res) {
    var body = _.pick(req.body, 'input', 'context');
    
    conv_helper.sendMessage(body.input, body.context)
        .then(function(response){
            console.log('\nPayload sent to Conversation. Response successfully received back from Conversation');
            //console.log(response);
            return res.json(response);           
        }, function (error) {
            console.log('error on communication with Watson Conversation');
            return res.status(err.code || 500).json(err);   
        })
        .catch(function(err){
            return res.status(err.code || 500).json(err);
        });
});


var saveConversationNode = function(req, res) {
    // Check the context object in chatBot.js to make sure all the attributes are being picked up.
    // Filter the req, so only what we want gets through.
    var body = _.pick(req.body, 'intents', 'entities', 'input', 'output', 'context', 'entry_time');
    console.log('\nUser input and Chatbot response: ');
    console.log('User input: ' + body.input.text);
    for (i in body.output.text) {
        console.log('Chatbot: '+body.output.text[i]);
    }
    console.log('cFlag: ' + body.output.cFlag);
    console.log('botFunction: ' + body.output.botFunction);
    //console.log('NLC intent: ' + body.intents[0].intent);
    //console.log('NLC conf: ' + body.intents[0].confidence);
    

    cloudant_helper.dbSaveConversation(body)
        .then(function(dbResponse) {
            res.send(dbResponse);
        }, function(error) {
            console.log('error on accessing Cloudant via saveConversationNode()');
            console.log(error);
            res.status(404).send(error);
        })
        .catch(function(error){
            console.log('error on accessing Cloudant via saveConversationNode()');
            console.log(error);
            res.status(404).send(error);    
        });
}

router.post('/api/saveConversationNode', saveConversationNode);

// Receive POST request of conversation log - send by email.
var emailSend = function(req, res) {
    var body = _.pick(req.body, 'subject', 'conversation_id');

    console.log('\nbody from API POST/email was: ');
    console.log(body);
    var conversation_id = body.conversation_id;


    cloudant_helper.dbQuery(conversation_id).then(function(dbResponse) {
        //console.log('the response from the dbQuery within the app.post("email" is: )');
        //console.log(dbResponse);
        var emailBody = email_helper.constructEmailBody(dbResponse)
        //console.log('emailBody from within the post method code, returned from varructEmailBody is: ');
        //console.log(emailBody);
        email_helper.sendEmail(body.subject, emailBody, 'dcfwight@gmail.com');
        var message = 'POST /email API request received with subject: ' + body.subject + ' and conversation_id: ' + body.conversation_id;
        res.send(message);
    }, function(error) {
        console.log('error on querying the CloudantDB for conversation history via emailSend()');
        console.log(error);
        res.status(404).send(error);
    })
    .catch(function(error){
       console.log('error on querying the CloudantDB for conversation history via emailSend()');
       console.log(error);
       res.status(404).send(error);
    });
};

router.post('/api/email', emailSend);

router.post('/api/checkOrderExists', function(req, res) {
    var body = _.pick(req.body, 'order_num');
    //console.log('order_num from POST /checkOrderExists is: ' + body.order_num);
    magento.checkOrderExists(body.order_num)
        .then(function(message) {
        console.log('error on accessing Magento via checkOrderExists()');
        console.log(message);
        res.send(message);
    }, function(error) {
        console.log('error on accessing Magento via checkOrderExists()');
        console.log(error);
        res.status(404).send(error);
    });
});

router.post('/api/getOrderInfo', function(req, res) {
    var body = _.pick(req.body, "order_num", "email");

    magento.getOrderInfo(body.order_num, body.email)
        .then(function(orderInfoReturn) {
        console.log(orderInfoReturn);
        res.send(orderInfoReturn);
    }, function(error) {
        console.log('error on accessing Magento via getOrderInfo()');
        console.log(error);
        res.status(404).send(error);
    })
    .catch(function(error){
        console.log('error on accessing Magento via getOrderInfo()');
        console.log(error);
        res.status(404).send(error);
    });
});

router.post ('/api/getDeliveryInfo', function (req, res){
    var body = _.pick(req.body, "order_num", "email");
    
    magento.getDeliveryInfo(body.order_num, body.email)
        .then(function(deliveryDetails){
           res.send(deliveryDetails); 
        }, function(error){
            console.log('error on accessing Magento via getDeliveryInfo()');
            console.log(error);
            res.status(404).send(error);   
        })
        .catch(function(error){
            console.log('error on accessing Magento via getDeliveryInfo()');
            console.log(error);
            res.status(404).send(error);
        });    
});

// Note - I'm not actually using this in server. Using REGEXP in the client side instead.
var validateEmail = function(req, res) {
    var body = _.pick(req.body, 'email');
    if (email_helper.validateEmail(body.email)) {
        console.log(body.email + ' is a valid email address');
        (res.send('valid email'));
    } else {
        console.log(body.email + ' is NOT a valid email address');
        res.status(404).send('invalid email');
    }
}

router.post('/api/validateEmail', validateEmail);

module.exports = router;
