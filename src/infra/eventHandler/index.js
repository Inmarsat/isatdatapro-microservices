/**
 * Event emitter bus (singleton)
 */
'use strict';

const { EventEmitter } = require('events');
const { emit } = require('process');
const emitter = new EventEmitter();

function newMobile(mobileId, mailboxId, source) {
  emitter.emit('NewMobile', mobileId, mailboxId,
    `New mobile identified by ${source}`);
}

function newReturnMessage(messageId, mobileId, mailboxId, source) {
  emitter.emit('NewReturnMessage', messageId, mobileId, mailboxId,
    `New return message ${messageId} identified by ${source}`);
}

function newForwardMessage(messageId, mobileId, mailboxId, source) {
  emitter.emit('NewForwardMessage', messageId, mobileId, mailboxId,
    `New forward message ${messageId} submitted to ${mobileId} (${source})`);
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

function apiOutage(satelliteGateway, timestamp, source) {
  emitter.emit('ApiOutage', satelliteGateway, timestamp,
    `API Outage detected on ${satelliteGateway} at ${timestamp} (${source})`);
}

function apiRecovery(satelliteGateway, timestamp) {
  emitter.emit('ApiRecovery', satelliteGateway, timestamp,
    `API Recovered for ${satelliteGateway} at ${timestamp} (${source})`);
}

module.exports = {
  emitter,
  apiOutage,
  apiRecovery,
  newMobile,
  newReturnMessage,
  newForwardMessage,
  forwardMessageStateChange,
  otherClientForwardSubmission,
};
