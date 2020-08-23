'use strict';
const Model = require('./model');
const category = require('./categories.json').mailbox;
const crypto = require('../../encryption');

function Mailbox(mailboxId, name, accessId, password, satelliteGatewayName, enabled) {
  Model.call(this, category);
  if (typeof(mailboxId) === 'string' || typeof(mailboxId) === 'number') {
    this.mailboxId = String(mailboxId);
  } else {
    this.mailboxId = '';
  }
  this.name = typeof(name) === 'string' ? name : '';
  this.accessId = typeof(accessId) === 'string' ? accessId : '';
  this.encryptedPassword = '';
  if (typeof(password) === 'string') {
    this.passwordSet(password);
  }
  this.satelliteGatewayName = typeof(satelliteGatewayName) === 'string' ? satelliteGatewayName : 'Inmarsat';
  this.enabled = typeof(enabled) === 'boolean' ? enabled : true;
}

Mailbox.prototype = Object.create(Model.prototype);
Mailbox.prototype.constructor = Mailbox;

Mailbox.prototype.passwordSet = function(password) {
  this.encryptedPassword = crypto.encrypt(password);
}

Mailbox.prototype.passwordGet = function() {
  return crypto.decrypt(this.encryptedPassword);
}

module.exports = Mailbox;
