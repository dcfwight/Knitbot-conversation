// Helper functions for chatBotEngine.js

var botHelper = {
    
    botAge: function(convNode){
        return new Promise (function (resolve, reject){
            
            var today = new Date();
            var difference = (today - CHATBOT.DOB) / (1000* 60 * 60 * 24 *365);
            var years = Math.floor(difference);
            var months = Math.floor(12* (difference - years));
            var ageString = 'I was created on ' +CHATBOT.DOB_STRING;
            if (years === 0) {
                ageString += (", so I'm only "+ months + " months old!");
            }
            else if (years === 1) {
                ageString += (", so I'm one year and " + months + " months old!");
            }
            else {
                ageString += (", so I'm " + years + " years old");
            };
            convNode.chatBotResponse.push(ageString);
            convNode.convResp.context.restart = true; // set's the context flag for Conversation to re-start node.
            convNode.rePush = true;
            resolve (convNode);
        });
    },
    
    dateQuery: function(convNode) {
        return new Promise (function(resolve, reject){
            var today = new Date();
            var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
            var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            var dateString = "It's "+ days[today.getDay()] + ", " + today.getDate() + ' ' + months[today.getMonth()];
            
            convNode.chatBotResponse.push(dateString);
            convNode.convResp.context.restart = true; // set's the context flag for Conversation to re-start node.
            convNode.rePush = true;
            resolve(convNode); 
        });
    },
    
    timeQuery: function(convNode) {
        return new Promise (function(resolve,reject){
           var today = new Date();
            var minutesString ='';
            var minutes = today.getMinutes();
            if (minutes < 10) {
                minutesString = "0" + minutes;
            } else {
                minutesString = minutes;
            }
            var timeString = "It's " + today.getHours() +":" +minutesString;
            convNode.chatBotResponse.push(timeString);
            convNode.convResp.context.restart = true; // set's the context flag for Conversation to re-start node.
            convNode.rePush = true;
            resolve(convNode);
        });
    }
}