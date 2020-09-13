
/**
 * Copyright 2010-2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * This file is licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License. A copy of
 * the License is located at
 *
 * http://aws.amazon.com/apache2.0/
 *
 * This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 */
const AWS = require("aws-sdk");
const util = require('util')

AWS.config.update({
	region: "us-west-1",
	endpoint: "https://dynamodb.us-west-1.amazonaws.com"
});

const docClient = new AWS.DynamoDB.DocumentClient();


var date = "2020-09-05";
var time = "04:00";
let confirmed = false

var params = {
	TableName:"alarms",
	Item:{
		"date": date,
		"time": time,
		"confirmed": confirmed
	}
};

console.log("Adding a new item...");
const dbPutPromisify = util.promisify(docClient.put, {context: docClient})
console.log(dbPutPromisify)

