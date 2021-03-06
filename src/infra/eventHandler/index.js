/**
 * Event handler module
 * @module eventHandler
 */
'use strict';

const { EventEmitter } = require('events');

/**
 * The event emitter singleton
 */
const emitter = new EventEmitter();

/**
 * Emits a ``NewMobile`` event with Mobile model metadata.
 * @param {Object} mobile Uses Mobile model
 */
function newMobile(mobile) {
  emitter.emit('NewMobile', mobile);
}

/**
 * Emits a ``NewReturnMessage`` event with MessageReturn model metadata.
 * @param {Object} message Uses MessageReturn model
 */
function newReturnMessage(message) {
  emitter.emit('NewReturnMessage', message);
}

/**
 * Emits a ``NewForwardMessage`` event with MessageForward model metadata:
 * 
 * @param {Object} message Uses MessageForward model
 */
function newForwardMessage(message) {
  emitter.emit('NewForwardMessage', message);
}

/**
 * Emits a ``ForwardMessageStateChange`` event with metadata:
 * ```
 * {
 *   messageId: number,
 *   mobileId: (string|undefined),
 *   newState: string,
 *   reason: string,
 *   verbose: string
 * }
 * ```
 * 
 * mobileId may not be known if the message was submitted by another client;
 * ideally other client submissions trigger a different event
 * @param {number} messageId Unique forward message ID from the Status
 * @param {string} newState The new state human-readable
 * @param {string} reason The reason for the new state, human-readable
 * @param {string} stateTimeUtc The time of the state change
 * @param {string} [mobileId] The mobile ID if known
 */
function forwardMessageStateChange(
    messageId,
    newState,
    reason,
    stateTimeUtc,
    mobileId,
    referenceNumber) {
  emitter.emit('ForwardMessageStateChange', 
      messageId,
      newState,
      reason,
      stateTimeUtc,
      mobileId,
      `Forward message ${messageId} to ${mobileId}` +
      ` changed to ${newState} (${reason}) at ${stateTimeUtc}`,
      referenceNumber);
}

/**
 * Emits a ``OtherClientForwardSubmission`` event with metadata 
 * to be used for message retrieval:
 * ```
 * {
 *   messageId: number,
 *   mailboxId: (number|string),
 *   verbose: string
 * }
 * ```
 * @param {number} messageId Unique forward message ID from the Status
 * @param {string|number} mailboxId Unique mailbox ID
 */
function otherClientForwardSubmission(messageId, mailboxId) {
  emitter.emit('OtherClientForwardSubmission', messageId, mailboxId,
      `New forward message ${messageId} from unknown API client`
      + ` found in mailbox ${mailboxId}`);
}

/**
 * Emits a ``ApiError`` event with metadata:
 * ```
 * {
 *   operation: string,
 *   error: string
 * }
 * ```
 * @param {string} operation The API operation that resulted in error
 * @param {number} error 
 */
function apiError(operation, error) {
  emitter.emit('ApiError', operation, error);
}

/**
 * Emits a ``ApiOutage`` event with metadata:
 * ```
 * {
 *   satelliteGatewayName: string,
 *   timestamp: string,
 *   verbose: string
 * }
 * ```
 * @param {string} satelliteGatewayName The gateway name
 * @param {string} timestamp The ISO datetime of the outage
 * @param {string} source The API operation that was non-responsive
 */
function apiOutage(satelliteGatewayName, timestamp, source) {
  emitter.emit('ApiOutage', satelliteGatewayName, timestamp,
      `API Outage on ${satelliteGatewayName} at ${timestamp} (${source})`);
}

/**
 * Emits a ``ApiRecovery`` event with metadata
 * ```
 * {
 *   satelliteGatewayName: string,
 *   timestamp: string,
 *   verbose: string
 * }
 * ```
 * @param {string} satelliteGatewayName The gateway name
 * @param {string} timestamp The ISO datetime of the outage
 * @param {string} source The API operation that was non-responsive
 */
function apiRecovery(satelliteGatewayName, timestamp, source) {
  emitter.emit('ApiRecovery', satelliteGatewayName, timestamp,
      `API Recovered for ${satelliteGatewayName} at ${timestamp} (${source})`);
}

module.exports = {
  emitter,   // Required by external callers to use singleton
  newMobile,
  newReturnMessage,
  newForwardMessage,
  forwardMessageStateChange,
  otherClientForwardSubmission,
  apiError,
  apiOutage,
  apiRecovery,
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
