'use strict';
const Model = require('./Model');
const category = require('./categories.json').apiCallLog;
const API_CALL_LOG_TIME_TO_LIVE = 7 * 86400;   //: seconds
const API_OPERATIONS = [
  'getReturnMessages',
  'submitForwardMessages',
  'getForwardStatuses',
  'getForwardMessages',
  'getMobiles',
];

/**
 * ApiCallLog Class constructor
 * @param {string} operation The api operation e.g. 'get_return_messages'
 * @param {string} satelliteGatewayName The name of the message gateway system e.g. 'Inmarsat'
 * @param {string|number} mailboxId The unique Mailbox ID
 * @param {string} callTimeUtc ISO string value of the call time of the operation
 */
function ApiCallLog(operation, satelliteGatewayName, mailboxId, callTimeUtc) {
  Model.call(this, category);
  this.operation = typeof(operation) === 'string' ? operation : null;
  this.satelliteGatewayName = typeof(satelliteGatewayName) === 'string' ? satelliteGatewayName : null;
  this.mailboxId = typeof(mailboxId) === 'string' ? mailboxId : null;
  this.callTimeUtc = typeof(callTimeUtc) === 'string' ? callTimeUtc : '1970-01-01T00:00:00Z';
  this.completed = false;
  this.errorId = 0;
  this.error = '';
  this.nextStartId = -1;
  this.nextStartTimeUtc = '';
  this.messageCount = 0;
  this.ttl = API_CALL_LOG_TIME_TO_LIVE;
}

ApiCallLog.prototype = Object.create(Model.prototype);
ApiCallLog.prototype.constructor = ApiCallLog;

ApiCallLog.prototype.success = function() {
  return (this.completed && this.errorId === 0);
}

ApiCallLog.prototype.getOperations = function() {
  return API_OPERATIONS;
}

module.exports = ApiCallLog;
