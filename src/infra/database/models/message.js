'use strict';
const Model = require('./model');
const category = require('./categories.json').message;
const MessagePayloadJson = require('./messagePayloadJson');

function Message(messageId, mobileId, mailboxId, payloadRaw, payloadJson, mailboxTimeUtc, size) {
  Model.call(this, category);
  this.messageId = typeof(messageId) === 'number' ? messageId : null;
  this.mobileId = typeof(mobileId) === 'string' ? mobileId : null;
  this.mailboxId = typeof(mailboxId) === 'string' ? mailboxId : null;
  this.payloadRaw = payloadRaw instanceof Array ? payloadRaw : null;
  if (typeof(payloadJson) !== 'undefined' && payloadJson instanceof Object
      && ('codecServiceId' in payloadJson && 'codecMessageId' in payloadJson && 'fields' in payloadJson)) {
    this.payloadJson = payloadJson;
  } else {
    this.payloadJson = null;
  }
  this.mailboxTimeUtc = typeof(mailboxTimeUtc) === 'string' ? mailboxTimeUtc : '1970-01-01T00:00:00Z';
  this.size = typeof(size) === 'number' ? size : null;
}

Message.prototype = Object.create(Model.prototype);
Message.prototype.constructor = Message;

/**
 * Returns the codecServiceId (aka SIN) of the message
 * @returns {number} 0..255
 */
Message.prototype.getCodecServiceId = async function() {
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
Message.prototype.getCodecMessageId = async function() {
  if (this.payloadJson) {
    return this.payloadJson.codecMessageId;
  } else if (this.payloadRaw && this.payloadRaw.length > 1) {
    return Number(this.payloadRaw[1]);
  } else {
    throw new Error(`No payload defined for message`);
  }
}

module.exports = Message;
