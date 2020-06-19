'use strict';
const Model = require('./model');
const category = require('./categories.json').mailbox;
const crypto = require('../../encryption/protectPassword');

function Mailbox(mailboxId, name, accessId, password, messageGateway, enabled) {
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
  this.messageGateway = typeof(messageGateway) === 'string' ? messageGateway : 'Inmarsat';
  this.enabled = typeof(enabled) === 'boolean' ? enabled : true;
}

Mailbox.prototype = Object.create(Model.prototype);
Mailbox.prototype.constructor = Mailbox;

Mailbox.prototype.passwordSet = async function(password) {
  this.encrypted_password = crypto.encrypt(password);
}

Mailbox.prototype.passwordGet = async function() {
  return crypto.decrypt(this.encryptedPassword);
}

module.exports = Mailbox;
