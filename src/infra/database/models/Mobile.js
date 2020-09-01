'use strict';
const Model = require('./Model');
const category = require('./categories.json').mobile;

/**
 * Represents the satellite modem
 * @constructor
 * @param {string} mobileId Unique modem ID
 * @param {string} description A logical description of the associated asset
 * @param {string|number} mailboxId The Mailbox to which the Mobile is assigned
 */
function Mobile(mobileId, description, mailboxId) {
  Model.call(this, category);
  this.mobileId = typeof(mobileId) !== 'undefined' ? mobileId : null;
  this.description = typeof(description) !== 'undefined' ? description : '';
  this.mailboxId = typeof(mailboxId) !== 'undefined' ? mailboxId : null;
  this.satelliteRegion = null;
  this.lastRegistrationTimeUtc = null;
  this.lastMessageReceivedTimeUtc = null;
  this.lastResetReason = null;
  this.operatorTxState = null;
  this.userTxState = null;
  this.mobileWakeupPeriod = 0;
  this.version = {
    hardware: '0.0.0',
    firmware: '0.0.0',
    productId: '0',
  };
  this.location = {
    latitude: 90.0,
    longitude: 180.0,
    altitude_m: 0.0,
    speed_kph: 0.0,
    heading: 0.0,
    timestamp: 0,
    fixStatus: 0,
  };
  this.broadcastIdCount = 0;
  this.broadcastIds = [];
}

Mobile.prototype = Object.create(Model.prototype);
Mobile.prototype.constructor = Mobile;

module.exports = Mobile;
