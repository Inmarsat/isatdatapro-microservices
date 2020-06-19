'use strict';
const Message = require('./message');
const category = require('./categories.json').messageReturn;

function MessageReturn(messageId, mobileId, codecServiceId, payloadRaw, payloadJson, mailboxTimeUtc, receiveTimeUtc) {
  Message.call(this, messageId, mobileId, payloadRaw, payloadJson, mailboxTimeUtc);
  this.category = category;
  this.subcategory = 'return';
  this.receiveTimeUtc = typeof(receiveTimeUtc) === 'string' ? receiveTimeUtc : null;
  this.codecServiceId = typeof(codecServiceId) === 'number' ? codecServiceId : null;
  this.satelliteRegion = null;
}

MessageReturn.prototype = Object.create(Message.prototype);
MessageReturn.prototype.constructor = MessageReturn;

module.exports = MessageReturn;
