'use strict';
const Model = require('./model');
const category = require('./categories.json').mobile;

function Mobile(mobileId, description, mailboxId) {
  Model.call(this, category);
  this.mobileId = typeof(mobileId) !== 'undefined' ? mobileId : null;
  this.description = typeof(description) !== 'undefined' ? description : '';
  this.mailboxId = typeof(mailboxId) !== 'undefined' ? mailboxId : null;
  this.satelliteRegion = null;
  this.lastRegistrationTimeUtc = null;
  this.lastMessageReceivedTimeUtc = null;
  this.mobileWakeupPeriod = 0;
  this.version = {
    hardware: '0.0.0',
    firmware: '0.0.0',
    product_id: '0',
  };
  this.location = {
    latitude: 0.0,
    longitude: 180.0,
    altitude_m: 0.0,
    speed_kph: 0.0,
    heading: 0.0,
    timestamp: 0,
  };
  this.broadcast_ids = [];
}

Mobile.prototype = Object.create(Model.prototype);
Mobile.prototype.constructor = Mobile;

module.exports = Mobile;
