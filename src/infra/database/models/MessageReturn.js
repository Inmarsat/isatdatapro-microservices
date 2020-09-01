'use strict';
const Message = require('./Message');
const { Payload, Fields } = require('./MessagePayloadJson');
const category = require('./categories.json').messageReturn;

function MessageReturn(messageId, mobileId, codecServiceId, payloadRaw, payloadJson, mailboxTimeUtc, receiveTimeUtc, satelliteRegion, mailboxId) {
  Message.call(this, messageId, mobileId);
  this.category = category;
  this.subcategory = 'return';
  this.codecServiceId = typeof(codecServiceId) === 'number' ? codecServiceId : null;
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
  this.mailboxTimeUtc = typeof(mailboxTimeUtc) === 'string' ? mailboxTimeUtc : null;
  this.receiveTimeUtc = typeof(receiveTimeUtc) === 'string' ? receiveTimeUtc : null;
  this.satelliteRegion = typeof(satelliteRegion) === 'string' ? satelliteRegion : null;
  this.mailboxId = typeof(mailboxId) === 'string' ? mailboxId : null;
}

MessageReturn.prototype = Object.create(Message.prototype);
MessageReturn.prototype.constructor = MessageReturn;

module.exports = MessageReturn;
