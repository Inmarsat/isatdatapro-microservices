/**
 * Event emitter bus (singleton)
 */
'use strict';

const { EventEmitter } = require('events');
//const { emit } = require('process');
const emitter = new EventEmitter();

function newMobile(mobile) {
  emitter.emit('NewMobile', mobile);
}

function newReturnMessage(message) {
  emitter.emit('NewReturnMessage', message);
}

function newForwardMessage(message) {
  emitter.emit('NewForwardMessage', message);
}

function forwardMessageStateChange(messageId, mobileId, newState) {
  emitter.emit('ForwardMessageStateChange', messageId, mobileId, newState,
    `Forward message ${messageId} to ${mobileId} changed to ${newState}`);
}

function otherClientForwardSubmission(messageId, mailboxId) {
  emitter.emit('OtherClientForwardSubmission', messageId, mailboxId,
    `New forward message ${messageId} from unknown API client found in mailbox`
    + ` ${mailboxId}`);
}

function apiError(operation, error) {
  emitter.emit('ApiError', operation, error);
}

function apiOutage(satelliteGatewayName, timestamp, source) {
  emitter.emit('ApiOutage', satelliteGatewayName, timestamp,
    `API Outage detected on ${satelliteGatewayName} at ${timestamp} (${source})`);
}

function apiRecovery(satelliteGatewayName, timestamp) {
  emitter.emit('ApiRecovery', satelliteGatewayName, timestamp,
    `API Recovered for ${satelliteGatewayName} at ${timestamp} (${source})`);
}

module.exports = {
  emitter,
  apiError,
  apiOutage,
  apiRecovery,
  newMobile,
  newReturnMessage,
  newForwardMessage,
  forwardMessageStateChange,
  otherClientForwardSubmission,
};
