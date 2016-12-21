// Helper js file for Cloudant database
var extend = require('util')._extend;
var Cloudant = require('cloudant');

var bluemix = require('./../config/bluemix'); // Gets environment variables when running on Bluemix

require('dotenv').config({silent: true});

// Cloudant Credentials. If Bluemix credentials exist, then override local - to see VCAP_SERVICES run cf env APPNAME
var cloudantCredentials = extend({
    url: process.env.cloudant_url,
    username: process.env.cloudant_username,
    password: process.env.cloudant_password
}, bluemix.getServiceCreds('cloudantNOSQLDB')); // VCAP_SERVICES

// Create Cloudant service wrapper
var cloudant = Cloudant({
    account: cloudantCredentials.username,
    password: cloudantCredentials.password
}); // specific Cloudant account

var DB_NAME = process.env.cloudant_dbName; // cloudant_dbName is the database to use in Cloudant.

function createCloudantIndex(dbName, index_name, index_type, index_fields) {
    // create new cloudant index in the database
    // index name is name, type is normally 'json' or 'text', fields is an array of valid fields to query
    var new_index = {
        name: index_name,
        type: index_type,
        index: {
            fields: index_fields
        }
    }
    
    useDb(dbName)
        .then(function (db){
            db.index(new_index, function(err, response) {
                if (err) {
                    throw err;
                }
            console.log('Index creation result for index_name: '+ index_name +' in db: ' +dbName+ ': %s', response.result);
            });  
        }, function (error) {
            console.log(error);   
        })
        .catch(function(error){
            console.log(error);    
        }); 
}


createCloudantIndex(DB_NAME,'dialog_turn_counter','json',["context.system.dialog_turn_counter"]);
createCloudantIndex(DB_NAME,'conversation_id','json',["context.conversation_id"]);


function createDb(cloudant_account, dbName) {
    // create a Cloudant database if it does not already exist.   
    cloudant_account.db.create(dbName, function(err, res) {
        if (err) {
            if (err.error === "file_exists") {
                console.log('Database ' + dbName + ' already exists - will write to it');
            } else {
                console.log(err);
            }
        } else {
            console.log('Database ' + dbName + ' created - will write to it');
        }
    })
}

function showCloudantDbs(cloudant_account) {
    // List all the Cloudant databases for a cloudant account
    try  {
        cloudant_account.db.list(function(err, allDbs) {
            if (err) {
                var msg = '\nCannot show Cloudant databases, error is: ' + err.error;
            } else {
                console.log('\nDatabases on Cloudant are: %s', allDbs.join(', '));
            }
        });
    } catch (e) {
        console.log('\nCloudant account could not be accessed to show databases' + e.message);
    };
}

function showCloudantIndices(dbName) {
    // show all the indices in the Cloudant database
    dbName.index(function(err, result) {
        if (err) {
            throw err;
        }
        // result should have a property ('indexes'), which is an array.
        console.log('\nThe database ' +dbName +' has %d indexes', result.indexes.length);
        for (var i = 0; i < result.indexes.length; i++) {
            console.log('  %s (%s): %j', result.indexes[i].name, result.indexes[i].type, result.indexes[i].def);
        }
    }); 
}

function useDb(dbName) {
    // use the cloudant database - return console error if it doesn't exist.
    return new Promise(function (resolve, reject){
        var db = cloudant.use(dbName);
        if (db == null) {
            resolve('\nCould not use Cloudant database using those credentials');
        } else {
            resolve (db);
        }    
    });
    
}

// create the Cloudant database specified in .env (if already exists, will not over-write)
createDb(cloudant, DB_NAME)

// first display the Cloudant databases available.
showCloudantDbs(cloudant);

var cloudant_helper = {
    dbSaveConversation: function (conversation) {
      // returns a promise - if data back from database (specifically res.ok), then it resolves with the response.
        return new Promise(function(resolve, reject) {
            useDb(DB_NAME)
                .then(function(db){
                    console.log('\nUsing database ' + DB_NAME + ' to store conversation nodes');
                    db.insert(conversation, function(error, res, body) {
                        if (error) {
                            console.log('\nError in dbSaveConversation. Error reported back from db');
                            console.log(error);
                            return reject('[db.insert]' + error.message);
                        } else if (res.ok == true) {
                            console.log('\nConversation node successfully received by Cloudant database');
                            console.log('Sending back db response to client');
                            console.log(res);
                            console.log('________________________________________________________________');
                            return resolve(res);
                            /* res should be the following (id is the id of the cloudant entry and revision is similar)
                            { ok: true,
                            id: 'ab43db9e2bfd15a17f8fe947e96f2dc9',
                            rev: '1-064eb6981fb29fad3db78f05e838894f' }
                            */
                        } else {
                            return reject('\nsome other error in dbSaveConversation function');
                        }
                    }); 
                }, function (error){
                console.log(error);
                })
                .catch(function(error){
                    console.log(error);    
                });
        })  
    },
    
    dbQuery: function(conversation_id) {
    // queries the database for a conversation_id with a selector using a promise and resolves with a successful set of docs
    // console.log('Cloundant database is being queried with context.conversation_id: '+ conversation_id + '\n');
    
        var query = {};
        query.selector = {"context.conversation_id": conversation_id,
            "context.system.dialog_turn_counter": {
                "$gte": 0
            }    
        };
        query.fields = [
            "input",
            "intents",
            "output",
            "context"
        ];
        query.sort = [{"context.system.dialog_turn_counter": "asc"}]
        
        return new Promise(function(resolve, reject) {
            if (!query) {
                return reject('\ndbQuery Error: No query provided');
            } else {
                useDb(DB_NAME)
                    .then(function(db){
                        db.find(query, function(error, result) {
                            if (error) {
                                return reject('\nCOULD NOT query the database. ' + error.reason);
                            } else {
                                console.log('\nDatabase queried successfully on conversation_id: ' + conversation_id + '\n');
                                //console.log('Data returned from database, within the dbQuery function is: ');
                                //console.log(JSON.stringify(result, null, 2));
                                return resolve(result);
                            }
                        });
                    }, function (error){
                        reject (error);    
                    })
                    .catch(function(error){
                        reject(error);    
                    });
            }
        });    
    }
};


/*
var test_conversation_id = "f5c00cd6-18b5-4be1-85c1-8776bc6d5b16";
cloudant_helper.dbQuery(test_conversation_id)
    .then(function(result){
        console.log(JSON.stringify(result, null, 2));    
    }, function (error) {
        console.log(error);    
    })
    .catch(function(error){
        console.log(error);    
    });
*/
    
module.exports = cloudant_helper;