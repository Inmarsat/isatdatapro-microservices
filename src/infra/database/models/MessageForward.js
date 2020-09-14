'use strict';
const Message = require('./Message');
const idpApi = require('isatdatapro-api');

/**
 * Represents a Forward (Mobile-Terminated) message
 * @constructor
 * @param {number} [userMessageId] Optional user-assigned ID
 * @param {number} messageId Network-assigned unique ID
 * @param {string} mobileId The destination of the message
 * @param {number[]} [payloadRaw] A decimal byte array payload
 * @param {object} [payloadJson] A JSON structured payload
 * @param {string} mailboxTimeUtc ISO timestamp when submitted to the network
 * @param {number} state A numeric code representing the delivery state
 * @param {string} stateTimeUtc ISO timestamp of the state
 * @param {number} mobileSleepSeconds The time the modem is configured to sleep
 * @param {number} mobileWakeupPeriod Enumerated value for configurable wakeupPeriod
 * @param {string} scheduledSendTimeUtc ISO timestamp for low power message delivery
 */
function MessageForward(userMessageId, messageId, mobileId,
    payloadRaw, payloadJson, mailboxTimeUtc, state, stateTimeUtc,
    mobileWakeupPeriod, mobileSleepSeconds, scheduledSendTimeUtc) {
  Message.call(this,
      messageId, mobileId, payloadRaw, payloadJson, mailboxTimeUtc);
  this.subcategory = 'forward';
  this.userMessageId = typeof(userMessageId) === 'number' ? userMessageId : null;
  this.referenceNumber = null;
  this.state = typeof(state) === 'number' ? state : 0;
  this.stateName = this.getStateName();
  this.errorId = 0;
  this.error = this.getStateReason();
  this.stateTimeUtc = typeof(stateTimeUtc) === 'string' ?
      stateTimeUtc : '1970-01-01T00:00:00Z';
  this.mobileSleepSeconds = typeof(mobileSleepSeconds) === 'number' ?
      this.mobileSleepSeconds : 0;
  this.mobileWakeupPeriod = typeof(mobileWakeupPeriod) === 'number' ?
      mobileWakeupPeriod : 0;
  this.scheduledSendTimeUtc = typeof(scheduledSendTimeUtc) === 'string' ?
      scheduledSendTimeUtc : null;
  this.isClosed = false;
}

MessageForward.prototype = Object.create(Message.prototype);
MessageForward.prototype.constructor = MessageForward;
MessageForward.prototype.category = 'message_forward';
MessageForward.prototype.newest = 'stateTimeUtc';

/**
 * Returns a human-readable name for the message state
 * @returns {string}
 */
MessageForward.prototype.getStateName = function() {
  const FORWARD_STATES = [
    'SUBMITTED',
    'DELIVERED',
    'ERROR',
    'FAILED_DELIVERY',
    'TIMED_OUT',
    'CANCELLED',
    'WAITING',
    'TRANSMITTED',
  ];
  return FORWARD_STATES[this.state];
}

/**
 * Returns a human-readable definition of the errorId
 * @returns {string}
 */
MessageForward.prototype.getStateReason = function() {
  const ERROR_CODES = {
    0: 'NO_ERROR',
    12309: 'TIMED_OUT',
    17678: 'TOO_LONG',
    21809: 'LOW_POWER_RETRY_EXHAUSTED',
    21830: 'QUEUE_FULL',
  };
  if (this.errorId in ERROR_CODES) {
    return ERROR_CODES[this.errorId];
  }
  return 'UNKNOWN';
}

/**
 * Returns a human-readable value of the wakeupPeriod
 * @returns {string}
 */
MessageForward.prototype.wakeupPeriodEnum = function() {
  return idpApi.getWakeupPeriod(this.mobileSleepSeconds, true);
}

/**
 * Returns a cleaned-up message with minimum set of properties 
 * for submission via API submitForwardMessages
 * @returns {object} Subset of the message
 */
MessageForward.prototype.submit = function() {
  const SUBMIT_FIELDS = [
    'mobileId',
    'userMessageId',
    'payloadRaw',
    'payloadJson',
  ];
  let cleanForSubmit = Object.assign({}, this);
  for (let prop in cleanForSubmit) {
    if (cleanForSubmit.hasOwnProperty(prop)) {
      if (SUBMIT_FIELDS.includes(prop)) {
        let propVal = cleanForSubmit[prop];
        if (propVal === null || typeof(propVal) === 'undefined'
            || (prop === 'payloadRaw' && propVal.length === 0)
            || (prop === 'payloadJson' && !('codecServiceId' in propVal))) {
          delete cleanForSubmit[prop];
        }
      } else {
        delete cleanForSubmit[prop];
      }
    }
  }
  return cleanForSubmit;
}

/**
 * Updates the message based on a new status retrieved via the IDP API
 * @param {Objet} [status] forward message object or status
 */
MessageForward.prototype.updateStatus = function(status) {
  if (!status) {
    status = this;
  }
  this.state = status.state;
  this.stateName = this.getStateName();
  this.stateTimeUtc = status.stateTimeUtc;
  this.isClosed = status.isClosed;
  this.errorId = status.errorId;
  this.error = this.getStateReason();
  this.referenceNumber = status.referenceNumber;
}

module.exports = MessageForward;
