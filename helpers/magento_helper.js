// NB to test the system, use Postman with Post /api/orderNum, with the order_num of "100662775"
// email to use with this order is: "knittingdevs+sid1163101@gmail.com"
var test_order_num = "10062775";
var test_email = "knittingdevs+sid1163101@gmail.com";

var extend = require('util')._extend;
var forEach = require('async-foreach').forEach;
var soap = require('soap'); // required for SOAP requests to Magento.
var _ = require('underscore');

require('dotenv').config({silent: true});
// accesses the .env file - see https://www.npmjs.com/package/dotenv for details. process.env then has the keys and values from .env

var API_USER = process.env.soap_api_user;
var API_KEY = process.env.soap_api_key;
var MAGENTO_URL = process.env.magento_soap_url; // need this to make SOAP requests for the orders.
var SOAP_USERNAME = process.env.soap_api_username;
var SOAP_PASSWORD = process.env.soap_api_password;


function magentoCall(order_num, resourcePath) {
    // Makes a call to Magento using an order number and a specific resourcePath
    var args = {
        args: order_num,
        resourcePath: resourcePath
    };
    return new Promise(function(resolve, reject) {
        // first create the Magento client
        soap.createClient(MAGENTO_URL, function(err, client) {
            if (err) {
                var errMsg = '\nError on creating Magento client on url: ' + MAGENTO_URL;
                //console.log(errMsg);
                return reject(errMsg);
            }

            // Next create a login to specific account using the Magento client and the correct credentials (set as API_USER and API_KEY)
            if (client) {
                //console.log('\nMagento client successfully created in ' +funcName);
                client.login({
                    username: API_USER,
                    apiKey: API_KEY
                }, function(err, login) {
                    if (err) {
                        console.log(err.body);
                        var errMsg = ('\nerror on Magento client login with username: '+ API_USER);
                        console.log(errMsg);
                        return reject(errMsg);
                    }

                    // Next, submit a call to the resourcePath
                    if (login) {
                        console.log('\nMagento client.login successful')
                        console.log(login);

                        args = extend(args, {
                            sessionId: login.loginReturn.$value});
                        //console.log(args);

                        //console.log('\nThe args object to submit to sales_order.info is: ');
                        //console.log(args);

                        client.call(args, function(error, orderInfo) {
                            /* Note - if you send an incorrect order number it returns with BOTH and error AND a result.
                             * Correct order numbers return with just a result.
                             * BE careful with the error object - it has a status code of 200, but it has a fault code which is the error
                             */
                            if (error) {
                                console.log('\nFAILED CALL. Magento client call to ' + resourcePath + ' with order_num: ' + order_num + ' FAILED.');
                                console.log('error.message: ' + error.message);
                                console.log('error.root.Envelope.Body.Fault.faultcode: ' + error.root.Envelope.Body.Fault.faultcode);
                                console.log('error.root.Envelope.Body.Fault.faultstring: ' + error.root.Envelope.Body.Fault.faultstring);
                                //console.log ('full error object returned is: ');
                                //console.log(JSON.stringify(error, null, 2));
                                return reject(error.message);
                            } else {
                                console.log('\nMagento client call to ' + resourcePath + ' with order_num: ' + order_num + ' was successful');
                                // Uncomment the following if you want the full orderInfo - it's a big object!
                                // console.log('orderInfo back is: ');
                                // console.log(JSON.stringify(orderInfo, null, 2));
                                resolve (orderInfo);
                                
                            }
                        });
                    }
                })
            }
        });
    });
}

function getShipmentTime(shipment_info) {
    // resolves with the shipment time for any given shipment_info object.
    return new Promise (function (resolve, reject){
        if (shipment_info.callReturn.item) {
        shipment_info.callReturn.item.forEach(function(item){
            if (item.key.$value == 'created_at') {
                console.log('item was shipped on: ' + item.value.$value);
                var shipmentTime = new Date(item.value.$value);
                resolve (shipmentTime);
            }   
        });
        } else {
            reject ("no shipment_info.callReturn.item");
        }
    });

}

function getValue(orderInfo, searchKey) {
    // gets the Value for a given key from the orderInfo object returned from Magento
    return new Promise (function (resolve, reject) {
        var searchValue = null; // test by getting the increment_id (should be the same as the order number)
                        
        orderInfo.callReturn.item.forEach(function(item) {
            if (item.key.$value === searchKey) {
                if (item.value) {
                    if (item.value.$value) {
                        //console.log(item.key.$value + ": " + item.value.$value);
                        searchValue = item.value.$value;
                    }
                }
            }
        });
        if (!searchValue) {
            var errorMessage = 'no ' + searchKey + ' key found in orderInfo to return to client';
            console.log(errorMessage);
            reject (errorMessage);
        } else {
            var successMessage = 'order Info found the following key: '+ searchKey + ' with value: ' + searchValue;
            console.log(successMessage);
            resolve (searchValue);        
        }    
    });   
}

// need to speak to customer for precise / most useful infoFields to use
var INFO_FIELDS = ['customer_email', 'customer_id', 'billing_address_id', 'customer_firstname', 'customer_lastname'];

function getValueArray(orderInfo, searchKeysArray) {
    var orderInfoReturn = {}; // set up the object to return to the client
    
    orderInfo.callReturn.item.forEach(function(item) {
        if (_.indexOf(searchKeysArray, item.key.$value) >= 0) {
            if (item.value) {
                if (item.value.$value) {
                    orderInfoReturn[item.key.$value] = item.value.$value;
                }
            }
        }
    });
    
    return orderInfoReturn;
}


var magento = {
    checkOrderExists: function (order_num) {    
        var funcName = 'checkOrderExists(order_num)';
        console.log(funcName + ' function called on ' + order_num);
        
        return new Promise (function (resolve, reject){
            magentoCall(order_num, "sales_order.info")
                .then(function (orderInfo){
                    getValue(orderInfo, 'increment_id')
                        .then(function(increment_id){
                            resolve(increment_id);
                        });
                })
                .catch(function(error){
                    reject(error);    
                });    
        });
    },
    getOrderInfo: function(order_num, email) {
        // gets the order information object from Magento for a given order number.
        // will only get the order information if the email matches the email on the order
        var funcName = 'getOrderInfo(order_num)';
        console.log(funcName + ' function called on ' + '(' + order_num +')');
    
        return new Promise (function(resolve, reject) {
            magentoCall(order_num, "sales_order.info")
                .then(function(orderInfo){
                    getValue(orderInfo, 'customer_email')
                        .then(function(customer_email){
                            if (email.toLowerCase() ===  customer_email.toLowerCase()) {
                                console.log('PASS security: emails match');
                                var orderInfoReturn = getValueArray(orderInfo, INFO_FIELDS);
                                resolve (orderInfoReturn);
                            } else {
                                reject ('FAIL security: email mismatch');
                            }
                    }) 
                }, function (error){
                    reject (error);   
                })
                .catch(function(error){
                    reject(error);
                });        
        });
    },
    getShipmentIncrementIds: function (order_num) {
        // resolves with an array of increment_ids for a given order number (can have multiple increment_ids for each order)
        var funcName = 'getShipmentIncrementId(order_num)';
        console.log(funcName + ' function called on ' + '(' + order_num + ')');
        
        var shipment_increment_ids = [];
        
        return new Promise (function (resolve, reject) {
            magentoCall(order_num, "sales_order_shipment.list_by_order_increment_id")
                .then(function(shipmentList){
                    if (shipmentList.callReturn.item.item) {
                        var shipment_increment_ids = [];
                        shipmentList.callReturn.item.item.forEach(function(item){
                            if (item.key.$value =="increment_id") {
                                //console.log('shipment_increment_id: ');
                                //console.log(item.value.$value);
                                shipment_increment_ids.push(item.value.$value);
                            }
                        });
                        resolve (shipment_increment_ids);
                    }    
                }, function (error) {
                    console.log(error);    
                });
        });
    },
    getShipmentInfo: function(increment_id){
        // resolves with the shipment info for a given increment_id
        var funcName = 'getShipmentInfo(increment_id)';
        console.log(funcName + ' function called on ' + '(' + increment_id + ')');
        
        return new Promise(function (resolve, reject) {
            magentoCall(increment_id, "sales_order_shipment.info")
                .then(function(shipment_info){
                    resolve(shipment_info);
                }, function (error){
                    console.log(error);
                    reject(error);
                });
        });
    },
    getDeliveryInfo: function(order_num, email) {
        var deliveries = []; // empty array. Objects with format {shipment_increment_id: created_at} will be pushed to it
        var items_processed = 0; // this gets around the problem of .forEach not being synchronous or having a .done function to it.
        
        return new Promise (function (resolve, reject){
            magento.getShipmentIncrementIds(order_num)
            // returns an array of increment_ids for deliveries (can have more than one for each order)
                .then(function(shipment_increment_ids){
                    var deliveryDetails = [];
                    
                    forEach(shipment_increment_ids, function(shipment_increment_id){
                        
                        magento.getShipmentInfo(shipment_increment_id)
                        // get the shipment info for a given increment_id
                            .then(function(shipment_info){
                                getShipmentTime(shipment_info)
                                // get the shipment Time for a given shipment info
                                    .then(function(shipmentTime){
                                        deliveryDetails.push(
                                            {increment_id: shipment_increment_id,
                                            created_at: shipmentTime}
                                        );
                                    });
                                items_processed ++;
                                if (items_processed === shipment_increment_ids.length ) {
                                    resolve(deliveryDetails);
                                }    
                            });
                    });
                }, function(error){
                    reject(error);
                });
            });
        }
};

/*
magento.getDeliveryInfo('100662775', 'abc@ged.com')
    .then(function(deliveryInfo){
        console.log('delivery info from promise is: ');
        console.log(deliveryInfo);
    }, function(error){
        console.log(error);    
    });
*/
/*
magento.getShipmentInfo('100266784')
    .then(function(shipmentInfo){
        console.log(shipmentInfo);
    }, function(error){
        console.log(error);    
    });
*/
      
/*           
magento.getShipmentIncrementId('100662775')
    .then(function(incrementIds){
        console.log(incrementIds);
    }, function(error){
        console.log(error);    
    });
*/
    
/*
magento.getOrderInfo('100662775', 'knittingdevs+sid1163101@gmail.com')
    .then(function(orderInfo){
        console.log(orderInfo);
        })
    .catch(function(error){
        console.log(error);
        });
*/

/*
magento.checkOrderExists('100662775')
    .then(function(increment_id){
        console.log(increment_id)    
    }, function(error) {
        console.log(error);    
    })
*/

module.exports = magento;


