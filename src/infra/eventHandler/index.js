/**
 * Event emitter bus (singleton)
 */
'use strict';

const { EventEmitter } = require('events');
const { emit } = require('process');
const emitter = new EventEmitter();

module.exports = {
  emitter,   // Required by external callers to use singleton
  newMobile: (mobile) => {
    emitter.emit('NewMobile', mobile);
  },
  newReturnMessage: (message) => {
    emitter.emit('NewReturnMessage', message);
  },
  newForwardMessage: (message) => {
    emitter.emit('NewForwardMessage', message);
  },
  forwardMessageStateChange: (messageId, mobileId, newState) => {
    emitter.emit('ForwardMessageStateChange', messageId, mobileId, newState,
      `Forward message ${messageId} to ${mobileId} changed to ${newState}`);
  },
  otherClientForwardSubmission: (messageId, mailboxId) => {
    emitter.emit('OtherClientForwardSubmission', messageId, mailboxId,
      `New forward message ${messageId} from unknown API client found in mailbox`
      + ` ${mailboxId}`);
  },
  apiError: (operation, error) => {
    emitter.emit('ApiError', operation, error);
  },
  apiOutage: (satelliteGatewayName, timestamp, source) => {
    emitter.emit('ApiOutage', satelliteGatewayName, timestamp,
      `API Outage detected on ${satelliteGatewayName} at ${timestamp} (${source})`);
  },
  apiRecovery: (satelliteGatewayName, timestamp) => {
    emitter.emit('ApiRecovery', satelliteGatewayName, timestamp,
      `API Recovered for ${satelliteGatewayName} at ${timestamp} (${source})`);
  },
  modemRegistration: (mobile) => {
    emitter.emit('ModemRegistration', mobile);
  },
  modemBeamSwitch: (mobile) => {
    emitter.emit('ModemBeamSwitch', mobile);
  },
  modemConfigReply: (mobile) => {
    emitter.emit('ModemConfigReply', mobile);
  },
  modemProtocolError: (detail) => {
    emitter.emit('ModemProtocolError', detail);
  },
  modemWakeupPeriodChange: (detail) => {
    emitter.emit('ModemWakeupPeriodChange', detail);
  },
  modemLastRxInfoResponse: (detail) => {
    emitter.emit('ModemLastRxInfoResponse', detail);
  },
  modemRxMetricsReply: (detail) => {
    emitter.emit('ModemRxMetricsReply', detail)
  },
  modemTxMetricsReply: (detail) => {
    emitter.emit('ModemTxMetricsReply', detail);
  },
  modemPingReply: (detail) => {
    emitter.emit('ModemPingReply', detail);
  },
  networkPingRequest: (detail) => {
    emitter.emit('NetworkPingRequest', detail);
  },
  broadcastIdResponse: (mobileId, broadcastIds) => {
    emitter.emit('BroadcastIdResponse', mobileId, broadcastIds,
        `Broadcast IDs retrieved from ${mobileId}: ${JSON.stringify(broadcastIds)}`);
  },
};

/*
module.exports = {
  //emitter,
  apiError,
  apiOutage,
  apiRecovery,
  newMobile,
  newReturnMessage,
  newForwardMessage,
  forwardMessageStateChange,
  otherClientForwardSubmission,
  modemRegistration,
};
*/
