'use strict';

// Trivia about chatbot
var CHATBOT = {
    NAME: 'Knitbot',
    DOB: new Date('Apr 15, 2016'),
    DOB_STRING: "April the 15th, 2016", // being lazy - just make sure both these are the same!
};

var buttonStore = {
    "yes": {
        text: 'yes',
        url: null,
        input: 'yes',
        immediate: true
    },
    "no": {
        text: 'no',
        url: null,
        input: 'no',
        immediate: true
    },
    "order_query": {
        text: 'Where is my order?',
        url: null,
        input: "Where is my order?",
        immediate: true
    },
    "email_entry": {
        text: 'My email is...',
        url: null,
        input: 'My email is ',
        immediate: false
    },
    "order_num_entry": {
        text: 'My order number is...',
        url: null,
        input: 'my order number is ',
        immediate: false
    },
    "phone_num_entry": {
        text: 'My phone number is...',
        url: null,
        input: 'my phone number is ',
        immediate: false
    },
    "email_promotion": {
        text: 'From email or promotion',
        url: null,
        input: 'I got it from an email promotion ',
        immediate: true
    },
    "site_purchase": {
        text: 'Purchased from site',
        url: null,
        input: 'I bought it from your website ',
        immediate: true
    },
    "not_sure": {
        text: 'Not sure',
        url: null,
        input: 'I am not sure',
        immediate: true
    },
    "junk_folder": {
        text: 'Look in junk folder',
        url: 'https://en.wikipedia.org/wiki/Email_spam',
        input: null,
        immediate: false
    },
    "pdf_dont_know": {
        text: "I don't know what a pdf is",
        url: "https://help.loveknitting.com/hc/en-gb/articles/204583658-What-is-a-downloadable-PDF-pattern-",
        input: null,
        immediate: false
    },
    "eReader_prob": {
        text: "I can't read it on my favourite e-reader",
        url: "https://help.loveknitting.com/hc/en-gb/articles/221264847-Opening-PDf-patterns-on-your-device",
        input: null,
        immediate: false
    },
    "none_above": {
        text: 'None of the above',
        url: null,
        input: 'none of the above',
        immediate: true
    }
}

// Variables relating to the CURRENT conversation node - this will be the starting node
var convNode = {
    alertSmiles: false, // trigger if email is required
    chatBotResponse: [],
    convResp: {
        output: {
            text: ""// this is the text output from Watson Conversation Dialog
        },
        context: {
            alertSubject: '', // title for alert email
            buttons: ['order_query'], // buttons for the user to click - will be adjusted through the flow of conversation
            chatbot_buttons: [], // buttons within chatbot chat - to direct the user to another site.
            cFlag: '', // flag for directing conversation node.
            custQuery: null, // the query the customer is pursuing
            entry_time: new Date(),
            found_order: false,
            orderData: {
                customer_id: "",
                order_email: "", // if it matches order email (passes security test), then set the order email.
                order_firstname: "", // first name from fetched order
                order_lastname: "", // last name from fetched order
                order_phone: "", // phone from fetched order
                orderNumber: "",
                delivery_info: [] // array of objects with format {delivery_increment_id: time&date}
            },
            orderQuery: null, // store the status of the order query -e.g. 'HermesFail'
            priorChatBotResponse: "", // save this as the last chatbot prompt
            restart: false, // flag to restart the conversation.
            securityPassed: false, // true if the order has been verified by email matching.
            userData: { //Variables specific to the user
                email_entry: "", // flags whether email entry attempt was valid or invalid.
                invalid_email: "", // user suggested incorrect email.
                user_name: "", // user suggested name.
                user_email: "", // this is the user suggested email.
                user_phone: "" // user suggested phone
            },
            entities: [] // the entities are picked up by Conversation
        } // the response back from Conversation will also include input, response, NLC, context etc.
    },

    rePush: false // if set to true, the app re-pushes to Conversation prior to any further user input.
};

// jQuery selectors - creates variables which find and select all those with class 'dialogs-loading'
var $dialogsLoading = $('.dialogs-loading');
var $dialogsError = $('.dialogs-error');

// jQuery conversation elements
var $buttonContainer = $('.button-container');
var $conversationDiv = $('.conversation-div');
var $conversation = $('.conversation-container');

// jQuery statistic elements
// NB these are only displayed if the statsDisplay is toggled to true.
var statsDisplay = true // toggle on off. For dev purposes might keep on.
var $userInfo = $('#user-container'); // displays app info
var $profileContainer = $('#profile-container'); // displays conversation status info
var $nlcStatsContainer = $('#NLC-stats-container'); // displays stats info
var $userInput = $('.user-input');

// initial load - runs the function only after the DOM has loaded.
$(document).ready(function() {
    $dialogsLoading.hide();
    converse(convNode, '');
    
    $('.input-btn').click(function(event) {
        processUserInput();
    });
    
    $userInput.keyup(function(event) {
        // event.keyCode 13 is the enter/return key
        if (event.keyCode === 13) {
            processUserInput();
        }
    });
});

function processUserInput() {
    // take the user input from the text box, display it in chat well and process the input by sending to Conversation.
    var userInputText = $userInput.val();
    $buttonContainer.empty(); // clear the buttons from the screen.
    convNode.convResp.context.buttons = []; // clear the buttons from the context - stops them re-appearing unless we want them
    $userInput.val('').focus();
    if (userInputText == "") {
        displayChatbotChat("Please type something if you want me to answer!");
    } else {
        displayUserChat(userInputText);
        convNode.convResp.context.priorChatBotResponse = convNode.convResp.output.text[0];
        console.log('convNode object before sending payload to Watson Conversation is: ');
        console.log(convNode);
        convNode = converse(convNode, userInputText);
    }
}


// converse - gets user input from GUI and passes it to getConversationResponse to determine response from Watson Conversation
function converse(convNode, userInputText) {
    // Gets the user input and passes it to determineUserIntent
    convNode.rePush = false // DO NOT DELETE THIS - if you do, you could create an infinite loop.

    getConversationResponse(userInputText, convNode).then(function(convResp) {
        console.log('convResp object back from Watson Conversation is: ');
        console.log(convResp);
        convNode.convResp = convResp; // update the convNode with the current response from Watson Conversation.
        convNode.chatBotResponse = convResp.output.text; // just pulls the Watson Conversation responses to convNode.chatBotResponse

        $buttonContainer.empty(); // empty the button container then repopulate with relevant buttons from the context.
        convNode.convResp.context.buttons.forEach(function(button) {
            try {
                addButton(buttonStore[button].text, buttonStore[button].url, buttonStore[button].input, buttonStore[button].immediate);
            } catch (err) {
                console.log(err);
            }
        }) // adds all the relevant buttons from the conversation context.
        debugger;

        botSwitch(convNode).then(function(amendedConvNode) { // botSwitch runs functions on the returned data and flags
            convNode = amendedConvNode;
            console.log('convNode after botSwitch is: ');
            console.log(convNode);
            debugger;
            displayChatbotChat(convNode.chatBotResponse);
            if (convNode.convResp.context.chatbot_buttons.length > 0) {
                displayChatbotButtons(convNode.convResp.context.chatbot_buttons);
                convNode.convResp.context.chatbot_buttons = []; // reset the chatbot buttons to prevent re-appearing.
            }

            if (statsDisplay) { // toggle statsDisplay if you want to see stats (TODO - set up auto hide for small mobile screens)
                updateUxinfo(convNode);
            }
            saveConversation(convResp).then(function(response) {
                convNode.convResp.context.botFunction = ''; // botFunction should only happen once, when being passed from Conversation to chatBot.
                if (convNode.alertSmiles) {
                    debugger;
                    emailProblem('Knitbot: ' + convNode.convResp.context.alertSubject, convNode.convResp.context.conversation_id);
                    convNode.alertSmiles = false;
                    convNode.convResp.context.alertSubject = ''; // reset the Alert subject (used when sending emails).
                }
                if (convNode.rePush) {
                    debugger;
                    converse(convNode, '');
                }
            });

        });
        //console.log('conversationResponse is: ');
        //console.log(conversationResponse);

    }, function(error) {
        displayChatbotChat("I'm sorry, but I've lost the connection to the server, which is where I've stored my brain!");
    });
    return convNode;
    //}
}
// Passes user input and the context (state) to Watson Conversation to generate a response (NLC & Dialog combined)

function getConversationResponse(userInputText, convNode) {
    convNode.convResp.context.botFunction = null; // reset any botFunction that was used in previous node.
    var payloadToWatson = {
        input: {
            text: userInputText
        },
        context: convNode.convResp.context
    };

    // this part removes the context for botFunction - it only triggers once each time, and needs to be removed.
    if (payloadToWatson.context.botFunction) {
        delete payloadToWatson.context.botFunction;
    }

    console.log('payload to send to Watson is: ');
    console.log(payloadToWatson);
    var params = JSON.stringify(payloadToWatson);

    return new Promise(function(resolve, reject) {
        $.ajax({
            type: "POST",
            data: params,
            url: 'api/message',
            contentType: 'application/json',
            processData: false,
            success: function(convResp) {
                resolve(convResp)
            },
            error: function(xhr, ajaxOptions, thrownError) {
                console.log("Error: " + xhr.status + "\n" + xhr.responseText + "\n" + JSON.stringify(thrownError));
                reject("error");
            }
        });
    });
}

// Updates the UX with information on the state of Conversation - NLC stats, Dialog node etc.

function updateUxinfo(convNode) {
    $userInfo.empty();
    $profileContainer.empty();
    //$nlcStatsContainer.empty();

    $userInfo.append('<h4 class="information-divtitle">User Information</h4>');
    $('<div/>').text('Found Order? : ' + convNode.convResp.context.found_order).appendTo($userInfo);
    $('<div/>').text('Security Passed? : ' + convNode.convResp.context.securityPassed).appendTo($userInfo);
    $.each(convNode.convResp.context.userData, function(key, value) {
        $('<div/>').text(key + ': ' + value).appendTo($userInfo);
    });
    $.each(convNode.convResp.context.orderData, function(key, value) {
        $('<div/>').text(key + ': ' + value).appendTo($userInfo);
    });

    $profileContainer.append('<h4 class="information-divtitle">Conversation info</h4>');
    $('<div/>').text('Conversation id: ' + convNode.convResp.context.conversation_id).appendTo($profileContainer);
    $('<div/>').text('Dialog node: ' + convNode.convResp.context.system.dialog_stack[0].dialog_node).appendTo($profileContainer);
    if (convNode.convResp.context.botFunction) {
        $('<div/>').text('botFunction is: ' + convNode.convResp.context.botFunction).appendTo($profileContainer);
    } else {
        $('<div/>').text('No current botFunction').appendTo($profileContainer);
    }


    if (convNode.convResp.context.cFlag) {
        $('<div/>').text('cFlag is: ' + convNode.convResp.context.cFlag).appendTo($profileContainer);
    } else {
        $('<div/>').text('No current cFlag').appendTo($profileContainer);
    }

    if (convNode.convResp.context.custQuery) {
        $('<div/>').text('custQuery is: ' + convNode.convResp.context.custQuery).appendTo($profileContainer);
    } else {
        $('<div/>').text('No current custQuery').appendTo($profileContainer);
    }

    $nlcStatsContainer.append('<h4 class="information-divtitle">NLC stats</h4>');
    if (convNode.convResp.input.text) { // sometimes Conversation responds when no user input entered (e.g. when convNode.rePush is used)
        $nlcStatsContainer.empty();
        $nlcStatsContainer.append('<h4 class="information-divtitle">NLC stats</h4>');
        $('<div/>').text('User input was: "' + convNode.convResp.input.text + '"').appendTo($nlcStatsContainer);

        $('<div/>').text('NLC top intent: ' + convNode.convResp.intents[0].intent).appendTo($nlcStatsContainer);
        $('<div/>').text('NLC top conf: ' + convNode.convResp.intents[0].confidence.toFixed(2)).appendTo($nlcStatsContainer);
        $('<div/>').text('NLC 2nd intent: ' + convNode.convResp.intents[1].intent).appendTo($nlcStatsContainer);
        $('<div/>').text('NLC 2nd conf: ' + convNode.convResp.intents[1].confidence.toFixed(2)).appendTo($nlcStatsContainer);
        if (convNode.convResp.entities.length > 0) {
            convNode.convResp.entities.forEach(function(entity) {
                $('<div/>').text('Entity: ' + entity.entity + ': ' + entity.value).appendTo($nlcStatsContainer);
            })
        }
    }
}

function checkOrderNumber(convNode) {
    //will abstract stripOrder number into here
    // strip everything other than digits
    return new Promise(function(resolve, reject) {
        var userInputStrip = convNode.convResp.input.text.replace(/[^\d]/g, '');
        userInputStrip = userInputStrip.trim();
        var userOrderNumber = parseInt(userInputStrip);
        var firstCharNumber = parseInt(userInputStrip[0]);
        var lengthFail = false;
        var firstCharFail = false;
        debugger;

        if (userInputStrip.length < 9 || userInputStrip.length > 10) {
            lengthFail = true;
        }

        if (firstCharNumber == 0 || firstCharNumber > 2) {
            firstCharFail = true;
        }

        if (firstCharFail || firstCharNumber) {
            convNode.convResp.context.cFlag = "formatIncorrect"; // set flag for Dialog flow in Conversation
        }

        if (lengthFail && firstCharFail) {
            convNode.chatBotResponse.push('Can you try entering that again, please? All our order numbers are 9 or 10 digits long.<br>\
                I think you entered ' + userInputStrip + ', which is ' + userInputStrip.length + ' digits long. Also \
                they all start with a 1 or a 2');

            return resolve(convNode);
        } else if (lengthFail) {
            convNode.chatBotResponse.push('Can you try entering that again, please? All our order numbers are 9 or 10 digits long.<br>\
                I think you entered ' + userInputStrip + ', which is ' + userInputStrip.length + ' digits long.');

            return resolve(convNode);
        } else if (firstCharFail) {
            convNode.chatBotResponse.push('Can you try entering that again, please?. All our order numbers start with either a 1 or a 2.<br>\
                I think you entered ' + userInputStrip + ', which starts with a ' + firstCharNumber);

            return resolve(convNode);
        } else {
            checkOrderExists(userInputStrip).then(function(incrementId) {
                convNode.chatBotResponse.push('yes, we\'ve found order  number: ' + incrementId + ', but for security, can you please type in the email you used for the order?');
                convNode.convResp.context.orderData.orderNumber = incrementId;
                convNode.convResp.context.found_order = 'true';

                return resolve(convNode)
            }, function(e) {
                debugger;

                convNode.chatBotResponse.push('sorry, but we don\'t have that order number in our system');
                convNode.chatBotResponse.push('Do you want to try entering it again?');
                convNode.convResp.context.cFlag = 'orderNotFound';
                return resolve(convNode);
            });
        }
    });
}

function botSwitch(convNode) {
    // botSwitch is the main engine. If conversation sends a flag back through context via context.botHelper, then it gets processed here.
    // NB have abstracted a lot of the functions to botHelper.js
    return new Promise(function(resolve, reject) {
        var alertSmiles = false; // resets the email required to false (NB this should be done at a different stage - after sent to database)
        if (!convNode.convResp.context.botFunction) {
            return resolve(convNode);
        }

        console.log('convResp.context had a bot function!: ' + convNode.convResp.context.botFunction);

        debugger;
        switch (convNode.convResp.context.botFunction) {
            case 'ALERT_SMILES': // sends a flag to email the Smiles team
                convNode.alertSmiles = true;

                resolve(convNode);
                break;

            case 'BOT_AGE':
                botHelper.botAge(convNode).then(function(amendedConvNode) {
                    return resolve(amendedConvNode);
                });
                break; // not sure we need breaks if we are using resolve.

            case 'DATE_QUERY':
                botHelper.dateQuery(convNode).then(function(amendedConvNode) {
                    resolve(amendedConvNode);
                });
                break;

            case 'DELIVERY_DETAILS':
                getDeliveryDetails(convNode)
                    .then(function(deliveryDetails) {
                    // for simplicity have just used the first order detail - there could be an array of them
                    convNode.convResp.context.orderData.increment_id = deliveryDetails[0].increment_id;
                    convNode.convResp.context.orderData.created_at = deliveryDetails[0].created_at;
                    var d = new Date(deliveryDetails[0].created_at);
                    var dateString = "";
                    dateString += (d.getFullYear() + '/');
                    dateString += (d.getMonth() + '/');
                    dateString += (d.getDate());
                    convNode.convResp.context.orderData.created_at_string = dateString;
                    convNode.rePush = true;
                    return resolve(convNode);
                });

                break;

            case 'EMAIL_REQUESTED':
                convNode.alertSmiles = true;
                var userInputArray = convNode.convResp.input.text.split(' ');
                var validEmail = false;
                userInputArray.forEach(function(item) {
                    //debugger;
                    if (validateEmail(item)) {
                        convNode.convResp.context.userData.user_email = item;
                        convNode.chatBotResponse.push('We will be in touch with you on ' + item);
                        validEmail = true;
                        convNode.convResp.context.restart = true;
                        convNode.rePush = true;
                        return resolve(convNode);
                    }
                });
                if (!validEmail) {
                    convNode.chatBotResponse.push("Sorry but that didn't look like a valid email address. Do you want to try again?");
                    convNode.convResp.context.cFlag = 'invalidEmail';
                    convNode.rePush = true;
                    resolve(convNode);

                }
                break;
            case 'EMAIL_SECURITY_CHECK':
                var userInputArray = convNode.convResp.input.text.split(' ');
                var validEmail = false;
                userInputArray.forEach(function(item) {
                    if (validateEmail(item)) {
                        convNode.convResp.context.userData.user_email = item;
                        validEmail = true;
                    }
                });
                if (validEmail) {
                    getOrder(convNode).then(function(response) {
                        console.log('response from getOrder was: ');
                        console.log(response);

                        if (response === "FAIL security: email mismatch") {
                            // this response is now being handled within conversation.
                            //convNode.chatBotResponse.push("Sorry but that email does not match the order. Do you want to try again?")
                            convNode.convResp.context.cFlag = "mismatchEmail";
                            convNode.rePush = true;
                            resolve(convNode);
                        } else {

                            convNode.convResp.context.orderData.order_email = response.customer_email;
                            convNode.convResp.context.orderData.order_firstname = response.customer_firstname;
                            convNode.convResp.context.orderData.order_lastname = response.customer_lastname;
                            convNode.convResp.context.orderData.customer_id = response.customer_id;
                            convNode.convResp.context.securityPassed = true;
                            // this response is now being handled within conversation.
                            //  convNode.chatBotResponse.push('Hi ' + response.customer_firstname + '!. You passed security!');
                            convNode.convResp.context.cFlag = "orderSecurityCleared";

                            convNode.rePush = true;
                            resolve(convNode);
                        }
                    });
                } else {
                    convNode.chatBotResponse.push("Sorry but that didn't look like a valid email address. Do you want to try again?")
                    convNode.convResp.context.cFlag = 'invalidEmail';
                }
                break;

            case 'EMAIL_STORE':
                var userInputArray = convNode.convResp.input.text.split(' ');
                var validEmail = false;
                userInputArray.forEach(function(item) {
                    if (validateEmail(item)) {
                        convNode.convResp.context.userData.user_email = item;
                        validEmail = true;
                    }
                });
                debugger;
                if (validEmail) {
                    convNode.convResp.context.cFlag = 'validEmail';
                    convNode.rePush = true;
                    resolve(convNode);
                } else {
                    convNode.convResp.context.cFlag = 'invalidEmail';
                    convNode.rePush = true;
                    resolve(convNode);
                }
                debugger;

            case 'EMAIL_VALIDATE':
                var userInputArray = convNode.convResp.input.text.split(' ');
                var validEmail = false;
                userInputArray.forEach(function(item) {
                    if (validateEmail(item)) {
                        convNode.convResp.context.userData.user_email = item;
                        validEmail = true;
                    }
                });
                debugger;
                if (validEmail) {
                    convNode.convResp.context.cFlag = 'validEmail';
                    convNode.rePush = true;
                    return resolve(convNode);
                } else {
                    convNode.convResp.context.cFlag = 'invalidEmail';
                    convNode.rePush = true;
                    resolve(convNode);
                }
                debugger;
                break;

            case 'NAME':
                convNode.convResp.context.cFlag = '' // reset the Flag to conversation about whether it was a valid name.
                var inputString = convNode.convResp.input.text.trim();
                console.log('input string is: ' + inputString);
                var typical_strings = ['name is ', 'call me ', 'known by ', 'i am ', 'am called ', 'call me ', 'known as '];
                // NB - keep the spaces at the end of each string in typical strings - you need it for down below.
                var targetString = '';
                var name = '';
                typical_strings.forEach(function(string) {
                    //console.log(string);
                    //console.log(inputString.indexOf(string));
                    if (inputString.toLowerCase().indexOf(string) > -1) {
                        targetString = (inputString.slice(inputString.toLowerCase().indexOf(string) + string.length, inputString.length));
                    }
                });
                debugger;
                if (targetString) {
                    if (targetString.split(' ')[0].toLowerCase() == '\'the' || targetString.split(' ')[0].toLowerCase() == 'the') {
                        name = targetString.split(' ')[0] + ' ' + targetString.split(' ')[1];
                    } else {
                        name = targetString.split(' ')[0];
                    }

                    convNode.convResp.context.userData.user_name = name;
                    convNode.convResp.context.cFlag = 'validName';
                    debugger;
                } else {
                    convNode.convResp.context.cFlag = 'invalidName';
                }
                convNode.rePush = true;
                resolve(convNode);
                break;

            case 'NUMERIC_CALCULATION':
                convNode.chatBotResponse.push(CalculationPipeline.numericCalculation(convNode.convResp.input.text));
                resolve(convNode);
                break;

            case 'REQUEST_PHONE_CALL':
                convNode.alertSmiles = true;
                // strip everything other than digits, () +
                var userInputStrip = convNode.convResp.input.text.replace(/[^()\d+\s]/g, '');
                userInputStrip = userInputStrip.trim();
                convNode.convResp.context.userData.user_phone = userInputStrip;
                convNode.chatBotResponse.push('We will try to contact you on ' + convNode.convResp.context.userData.user_phone);
                convNode.convResp.context.restart = true; // set's the context flag for Conversation to re-start node.
                convNode.rePush = true;
                resolve(convNode);
                break;

            case 'ORDER_NUMBER_ENTRY':
                checkOrderNumber(convNode).then(function(amendedConvNode) {
                    resolve(convNode);
                })
                break;

            case 'PHONE_STORE':
                // strip everything other than digits, () +
                var phoneNumberExtract = convNode.convResp.input.text.replace(/[^()\d+\s]/g, '');
                if (phoneNumberExtract) {
                    convNode.convResp.context.userData.user_phone = phoneNumberExtract.trim();
                    convNode.convResp.context.cFlag = "validPhone";
                } else {
                    convNode.convResp.context.cFlag = "invalidPhone";
                }
                convNode.rePush = true;
                resolve(convNode);


                //debugger; 
                break;

            case 'TIME_QUERY':
                botHelper.timeQuery(convNode).then(function(amendedConvNode) {
                    resolve(amendedConvNode);
                });
                break;

            case 'YARN_SELECTED':
                var yarn = convNode.convResp.context.yarn_chosen;
                yarn = yarn.replace(' ', '-');
                var href = "http://www.loveknitting.com/" + yarn + "-knitting-yarn"
                var message = "Yes, we do sell " + yarn + " yarns. Click on the following link to browse the range.<br><a href=\"" + href + "\" target=\"_blank\"> \
                              " + href + "</a>"
                convNode.chatBotResponse.push(message);
                convNode.convResp.context.restart = true; // set's the context flag for Conversation to re-start node.
                convNode.rePush = true;
                resolve(convNode);
                break;
        }
    });
}

function getDeliveryDetails(convNode) {
    var payload = {
        order_num: convNode.convResp.context.orderData.orderNumber,
        email: convNode.convResp.context.userData.user_email
    };
    var payloadJson = JSON.stringify(payload); // have to send data as a string

    return new Promise(function(resolve, reject) {
        $.ajax({
            url: '/api/getDeliveryInfo',
            type: 'POST',
            data: payloadJson,
            contentType: 'application/json',
            processData: false,
            success: function(response) {
                resolve(response);
            },
            error: function(xhr, ajaxOptions, thrownError) {
                console.log("Error: " + xhr.status + "\n" + xhr.responseText + "\n" + JSON.stringify(thrownError));
                return reject(xhr);
            }
        });
    });
}

function getOrder(convNode) {
    var payload = {
        order_num: convNode.convResp.context.orderData.orderNumber,
        email: convNode.convResp.context.userData.user_email
    };
    var payloadJson = JSON.stringify(payload); // have to send data as a string

    return new Promise(function(resolve, reject) {
        $.ajax({
            url: '/api/getOrderInfo',
            type: 'POST',
            data: payloadJson,
            contentType: 'application/json',
            processData: false,
            success: function(response) {
                resolve(response);
            },
            error: function(xhr, ajaxOptions, thrownError) {
                console.log("Error: " + xhr.status + "\n" + xhr.responseText + "\n" + JSON.stringify(thrownError));
                return reject(xhr);
            }
        });
    });
}

// must be a node module for email validation??

function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

function saveConversation(convResp) {
    convResp.context.entry_time = new Date();
    return new Promise(function(resolve, reject) {
        debugger;
        sendConversation(convResp).then(function(response) {
            console.log('conversation successfully saved to Cloudant database via server');
            resolve(response);
            //console.log(response);
        }, function(error) {
            console.log('Error on sending conversation to database');
            console.log(error);
            reject(error);
        });
    });
}

// Send conversation by API to app.

function sendConversation(conversationData) {
    var conversationJson = JSON.stringify(conversationData); // have to send data as a string

    return new Promise(function(resolve, reject) {
        $.ajax({
            url: '/api/saveConversationNode',
            type: 'POST',
            data: conversationJson,
            contentType: 'application/json',
            processData: false,
            // for success, we should receive back the Cloudant id and rev confirmation object, no other data.
            success: function(response) {
                //console.log('response received');
                //console.log(response);
                resolve(response);
            },
            error: function(xhr, ajaxOptions, thrownError) {
                console.log("Error: " + xhr.status + "\n" + xhr.responseText + "\n" + JSON.stringify(thrownError));
                console.log(xhr);
                reject(xhr);
            }
        });
    });
}


// Check order exists on Magento, via Server. First stage in security checking.
// for testing - check with ordernum = 100662775 and email = knittingdevs+sid1163101@gmail.com


function checkOrderExists(orderNum) {

    var amended_num;
    //REMEMBER TO CHANGE THIS BACK ONCE OUT OF DEVELOPMENT PHASE - ORDERS WILL NOT HAVE PREFIX DEV!!!
    //As of 11/11/16 - removed the DEV, because lk changed system
    /*
    if (orderNum.includes('DEV')) {
        amended_num = orderNum;
    } else {
        amended_num = "DEV" + orderNum;
    }
    */
    var params = {
        order_num: orderNum
    };
    var paramsJSON = JSON.stringify(params);
    return new Promise(function(resolve, reject) {
        $.ajax({
            url: '/api/checkOrderExists',
            type: 'POST',
            data: paramsJSON,
            contentType: 'application/json',
            processData: false,
            // if successful, receive back the order increment ID, which should have matched the order offered by the user.
            success: function(incrementId) {
                return resolve(incrementId);
            },
            error: function(xhr, ajaxOptions, thrownError) {
                //displayChatbotChat('that order ' + orderNum + ' is not in our system, sorry');
                console.log("Error - status code: " + xhr.status + "\n" + xhr.responseText + "\n");
                //console.log("Error: " + xhr.status + "\n" + xhr.responseText + "\n" + JSON.stringify(thrownError));
                console.log(xhr);

                console.log('ajax Options are: ' + ajaxOptions);
                console.log('thrownError is: ' + thrownError);
                return reject(xhr);
            }
        });
    });
}


// email problem - POSTS an email problem to /email

function emailProblem(problem_title = "Alert Smiles Team", conversation_id) {
    var params = {
        subject: problem_title,
        conversation_id: conversation_id
    }
    var paramsJSON = JSON.stringify(params);
    //debugger;
    $.ajax({
        url: '/api/email',
        type: "POST",
        contentType: "application/json",
        data: paramsJSON,
        success: function(response) {
            console.log(response);
            console.log('Email JSON sent to server');
        },
        error: function(xhr, ajaxOptions, thrownError) {
            console.log("Error: " + xhr.status + "\n" + xhr.responseText + "\n" + JSON.stringify(thrownError));
        }
    });
}


function displayChatbotChat(chatBotResponse) {
    // display chatbot's chat in a bubble
    if (typeof chatBotResponse == 'string' && chatBotResponse != '') {
        $('<div class="bubble-watson"/>').html(chatBotResponse)
            .appendTo($conversation);
    } else if (typeof chatBotResponse == 'object') {
        chatBotResponse.forEach(function(response, index) {
            if (response != "") {
                $('<div class="bubble-watson"/>').html(response)
                    .appendTo($conversation)
                    .hide()
                    .delay(index * 400)
                    .fadeIn(200);
            }
        });
    }
    scrollToBottom();
}

function displayUserChat(text) {
    // display user's chat in a bubble    
    $('<p class="bubble-human"/>').html(text)
        .appendTo($conversation)
        .hide()
        .fadeIn(300);
    $('<div class="clear-float"/>')
        .appendTo($conversation);
    scrollToBottom();
}

function addButton(text, url, input, immediate) {
    $('<button type="button" class="conversation-button"/>').html(text)
        .on('click', (function() {
        if (immediate) {
            $userInput.val(input);
            displayUserChat(input);
            $buttonContainer.empty(); // empties the button container, as we want to repopulate with the correct context.
            convNode.convResp.context.buttons = []; // empty the buttons context, as it would otherwise be passed to conversation and back.
            converse(convNode, input);
            $userInput.val('').focus();
        } else {
            $('.user-input').val(input);
        }
        if (url) {
            var newWindow = window.open(url, '_blank');
            newWindow.focus();
        }
    })).appendTo($buttonContainer);
    scrollToBottom();
}

function scrollToBottom() {
    $('body, html').animate({
        scrollTop: $('body').height() + 'px'
    });
}