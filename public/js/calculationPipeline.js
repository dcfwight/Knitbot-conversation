/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var CalculationPipeline = new Object();


var ERR_MESSAGE = "Sorry, but that's beyond my maths skills!";
CalculationPipeline.numericCalculation = function(calculationStr) {

    var result = ERR_MESSAGE;
    try {

        // make everything lower case
        calculationStr = calculationStr.toLowerCase();

        //replace words with numbers
        calculationStr = calculationStr.replace('one', '1');
        calculationStr = calculationStr.replace('two', '2');
        calculationStr = calculationStr.replace('three', '3');
        calculationStr = calculationStr.replace('four', '4');
        calculationStr = calculationStr.replace('five', '5');
        calculationStr = calculationStr.replace('six', '6');
        calculationStr = calculationStr.replace('seven', '7');
        calculationStr = calculationStr.replace('eight', '8');
        calculationStr = calculationStr.replace('nine', '9');
        calculationStr = calculationStr.replace('ten', '10');
        calculationStr = calculationStr.replace('eleven', '11');
        calculationStr = calculationStr.replace('twelve', '12');
        //obviously, could go on!

        // replace some common phrases
        calculationStr = calculationStr.replace('multiplied by', '*');
        calculationStr = calculationStr.replace('times', '*');
        calculationStr.replace('divided by', '/');
        calculationStr.replace('divided into', '/');
        calculationStr.replace('to the power of', '^');
        calculationStr.replace('to the power', '^');
        calculationStr.replace('squared', '^2');
        calculationStr.replace('cubed', '^3');
        //calculationStr.replace('factorial','!');
        calculationStr.replace('plus', '+');
        calculationStr.replace('added to', '+');
        calculationStr.replace('add', '+');
        calculationStr.replace('minus', '-');
        calculationStr.replace('take away', '-');
        calculationStr.replace('less', '-');

        // For security and possibly additional text, strip anything other than digits, (), -+/* and .
        calculationStr = calculationStr.replace(/[^-()\d/*/^+.]/g, '');
        if (calculationStr.length > 0) {
            result = math.eval(calculationStr);
            if (result != undefined) {
                result = 'The answer is: '+math.format(result, 3);
            }
        }
    } catch (err) {}
    return result;
}