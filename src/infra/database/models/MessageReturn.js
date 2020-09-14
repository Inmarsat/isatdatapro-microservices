'use strict';
const Message = require('./Message');
const { Payload, Fields } = require('./MessagePayloadJson');

/**
 * Represents a Return (Mobile-Originated) message
 * @constructor
 * @param {number} messageId Unique ID assigned by the network
 * @param {string} mobileId Unique modem ID (sender)
 * @param {number} codecServiceId Service identifier (aka SIN)
 * @param {number[]} [payloadRaw] A decimal byte array of the payload
 * @param {object} [payloadJson] A JSON structured payload
 * @param {string} mailboxTimeUtc ISO time ready for retrieval at the Mailbox
 * @param {string} receiveTimeUtc ISO time received by the network
 * @param {string} satelliteRegion Identifier for the satellite beam used
 * @param {string|number} mailboxId Unique Mailbox ID
 */
function MessageReturn(messageId, mobileId, codecServiceId,
      payloadRaw, payloadJson, mailboxTimeUtc, receiveTimeUtc,
      satelliteRegion, mailboxId) {
  Message.call(this, messageId, mobileId);
  this.subcategory = 'return';
  this.codecServiceId =
      typeof(codecServiceId) === 'number' ? codecServiceId : null;
  if (payloadRaw instanceof Array) {
    this.payloadRaw = payloadRaw;
    this.codecServiceId = payloadRaw[0];
    this.codecMessageId = payloadRaw[1];
  }
  if (payloadJson instanceof Payload) {
    this.payloadJson = payloadJson;
    this.codecServiceId = payloadJson.codecServiceId;
    this.codecMessageId = payloadJson.codecMessageId;
  }
  this.mailboxTimeUtc =
      typeof(mailboxTimeUtc) === 'string' ? mailboxTimeUtc : null;
  this.receiveTimeUtc =
      typeof(receiveTimeUtc) === 'string' ? receiveTimeUtc : null;
  this.satelliteRegion =
      typeof(satelliteRegion) === 'string' ? satelliteRegion : null;
  this.mailboxId = typeof(mailboxId) === 'string' ? mailboxId : null;
}

MessageReturn.prototype = Object.create(Message.prototype);
MessageReturn.prototype.constructor = MessageReturn;
MessageReturn.prototype.category = 'message_return';
MessageReturn.prototype.newest = 'receiveTimeUtc';

module.exports = MessageReturn;
