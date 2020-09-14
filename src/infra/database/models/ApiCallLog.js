'use strict';

require('dotenv').config();
const Model = require('./Model');
const API_CALL_LOG_TIME_TO_LIVE = (process.env.DB_TTL_DAYS_API || 7) * 86400;
const API_OPERATIONS = [
  'getReturnMessages',
  'submitForwardMessages',
  'getForwardStatuses',
  'getForwardMessages',
  'getMobiles',
];

/**
 * ApiCallLog Class constructor
 * @constructor
 * @param {string} operation API operation name
 * @param {string} satelliteGatewayName Shorthand name of the message gateway
 * @param {(string|number)} mailboxId Unique Mailbox ID
 * @param {string} callTimeUtc ISO string value of the call time of the operation
 */
function ApiCallLog(operation, satelliteGatewayName, mailboxId, callTimeUtc) {
  Model.call(this, this.category);
  this.operation = typeof(operation) === 'string' ? operation : null;
  this.satelliteGatewayName =
      typeof(satelliteGatewayName) === 'string' ? satelliteGatewayName : null;
  this.mailboxId = typeof(mailboxId) === 'string' ? mailboxId : null;
  this.callTimeUtc =
      typeof(callTimeUtc) === 'string' ? callTimeUtc : '1970-01-01T00:00:00Z';
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
ApiCallLog.prototype.category = 'api_call_log';
ApiCallLog.prototype.unique = 'callTimeUtc';
ApiCallLog.prototype.agedKey = 'callTimeUtc';

ApiCallLog.prototype.success = function() {
  return (this.completed && this.errorId === 0);
}

ApiCallLog.prototype.getOperations = function() {
  return API_OPERATIONS;
}

module.exports = ApiCallLog;
