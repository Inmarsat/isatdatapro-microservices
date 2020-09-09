'use strict';
const Model = require('./Model');
//const category = require('./categories.json').Message;
const { Payload, Field } = require('./MessagePayloadJson');
const MESSAGE_TIME_TO_LIVE = 90 * 86400;

/**
 * Base class for return and forward messages
 * @constructor
 * @param {number} messageId A unique message ID assigned by the network
 * @param {string} mobileId The unique ID of the satellite modem
 * @param {number|string} mailboxId A unique ID of the mailbox/account
 * @param {number} codecServiceId Service identifier for codec use (aka SIN)
 * @param {number} codecMessageId Message identifier for codec use (aka MIN)
 * @param {number[]} [payloadRaw] An array of decimal numbers representing payload bytes
 * @param {object} [payloadJson] A JSON structured payload used by a Message Definition File
 * @param {string} mailboxTimeUtc ISO UTC timestamp when the message arrived at the mailbox
 * @param {number} size The message size in bytes
 */
function Message(messageId, mobileId, mailboxId, codecServiceId, codecMessageId, payloadRaw, payloadJson, mailboxTimeUtc, size) {
  Model.call(this, this.category);
  this.messageId = typeof(messageId) === 'number' ? messageId : -1;
  this.mobileId = typeof(mobileId) === 'string' ? mobileId : null;
  this.mailboxId = typeof(mailboxId) === 'string' ? mailboxId : null;
  this.codecServiceId = typeof(codecServiceId) === 'number' ? codecServiceId : null;
  this.codecMessageId = typeof(codecMessageId) === 'number' ? codecMessageId : null;
  this.payloadRaw = payloadRaw instanceof Array ? payloadRaw : null;
  this.payloadJson = payloadJson instanceof Payload ? payloadJson : null;
  this.mailboxTimeUtc = typeof(mailboxTimeUtc) === 'string' ? mailboxTimeUtc : '1970-01-01T00:00:00Z';
  this.size = typeof(size) === 'number' ? size : -1;
  this.ttl = MESSAGE_TIME_TO_LIVE;
}

Message.prototype = Object.create(Model.prototype);
Message.prototype.constructor = Message;
Message.prototype.unique = 'messageId';

/**
 * Returns the codecServiceId (aka SIN) of the message
 * @returns {number} 0..255
 */
Message.prototype.getCodecServiceId = function() {
  if (this.payloadJson) {
    return this.payloadJson.codecServiceId;
  } else if (this.payloadRaw && this.payloadRaw.length > 0) {
    return Number(this.payloadRaw[0]);
  } else {
    throw new Error(`No payload defined for message`);
  }
}

/**
 * Returns the codecMessageId (aka MIN) of the message
 * @returns {number} 0..255
 */
Message.prototype.getCodecMessageId = function() {
  if (this.payloadJson) {
    return this.payloadJson.codecMessageId;
  } else if (this.payloadRaw && this.payloadRaw.length > 1) {
    return Number(this.payloadRaw[1]);
  } else {
    throw new Error(`No payload defined for message`);
  }
}

module.exports = Message;
