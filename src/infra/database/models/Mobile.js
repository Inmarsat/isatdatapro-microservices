'use strict';
const Model = require('./Model');

/**
 * Represents the satellite modem
 * @constructor
 * @param {string} mobileId Unique modem ID
 * @param {string} description A logical description of the associated asset
 * @param {string|number} mailboxId The Mailbox to which the Mobile is assigned
 */
function Mobile(mobileId, description, mailboxId) {
  Model.call(this, this.category);
  this.mobileId = typeof(mobileId) !== 'undefined' ? mobileId : null;
  this.description = typeof(description) !== 'undefined' ? description : null;
  this.mailboxId = typeof(mailboxId) !== 'undefined' ? mailboxId : null;
  this.satelliteRegion = null;
  this.lastRegistrationTimeUtc = null;
  this.lastMessageReceivedTimeUtc = null;
  this.lastResetReason = null;
  this.operatorTxState = null;
  this.userTxState = null;
  this.mobileWakeupPeriod = 'None';
  this.version = null;
  /*version = {
    hardware: '0.0.0',
    firmware: '0.0.0',
    productId: '0',
  };*/
  this.location = null;
  /*location = {
    latitude: 90.0,
    longitude: 180.0,
    altitude_m: 0.0,
    speed_kph: 0.0,
    heading: 0.0,
    timestamp: 0,
    fixStatus: 0,
  };*/
  this.broadcastIdCount = 0;
  this.broadcastIds = [];
}

Mobile.prototype = Object.create(Model.prototype);
Mobile.prototype.constructor = Mobile;
Mobile.prototype.category = 'mobile';
Mobile.prototype.unique = 'mobileId';

module.exports = Mobile;
