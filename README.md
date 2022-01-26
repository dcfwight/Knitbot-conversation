## Knitbot artificially intelligent chatbot
### developed by Doug Wight of CognitoCo/ Favoris - dcfwight@protonmail.com
---
### Aims
1. Capture user input.
1. Classify the input into one of several identified, trained intents.
1. Execute a dialog tree, based on the intent.
1. Ask user for any additional information required to complete the task.
1. Execute the task.
1. Store the conversation in a database for retrieval.

---
To act on our user's intent, we first classify it into one our predefined classifications.  To accomplish this, we'll train the [Watson Natural Language Classifier service](https://www.ibm.com/uk-en/cloud/watson-natural-language-classifier) using various text examples of users making the requests.  The NLC uses deep machine learning techniques to return the top predicted classes.

Next, we need any related information required to complete the user's request.  To do this, we'll rely on the [Watson Dialog service](http://www.ibm.com/smarterplanet/us/en/ibmwatson/developercloud/dialog.html) which supports building conversations between a user and an application. The Dialog service will track and store information obtained during the conversation until we have all the info required to complete the task.

2022 update: The Dialog service has (long!) been retired and replaced by [Watson Conversation Service](https://www.ibm.org/activities/watson-conversation)
