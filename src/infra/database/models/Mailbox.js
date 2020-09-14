'use strict';
const Model = require('./Model');
const crypto = require('../../encryption');

/**
 * Represents a Mailbox on the satellite message gateway
 * @constructor
 * @param {string|number} mailboxId Unique mailbox/account ID
 * @param {string} name A logical identifier for the mailbox
 * @param {string} accessId The username credential
 * @param {string} password The password credential (encrypted when stored)
 * @param {string} satelliteGatewayName The shorthand name of the gateway host
 * @param {boolean} enabled Flag whether to include mailbox in operations
 */
function Mailbox(mailboxId, name, accessId, password,
    satelliteGatewayName, enabled) {
  Model.call(this, this.category);
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
  this.satelliteGatewayName = typeof(satelliteGatewayName) === 'string' ?
      satelliteGatewayName : 'Inmarsat';
  this.enabled = typeof(enabled) === 'boolean' ? enabled : true;
}

Mailbox.prototype = Object.create(Model.prototype);
Mailbox.prototype.constructor = Mailbox;
Mailbox.prototype.category = 'mailbox';
Mailbox.prototype.unique = 'mailboxId';

/**
 * Encrypts the password for storage
 * @param {string} password The password (unencrypted)
 * @param {string} secret The encryption secret
 */
Mailbox.prototype.passwordSet = function(password, secret) {
  this.encryptedPassword = crypto.encrypt(password, secret);
}

/**
 * Returns the unencrypted password from storage
 * @param {string} secret The encryption secret
 */
Mailbox.prototype.passwordGet = function(secret) {
  return crypto.decrypt(this.encryptedPassword, secret);
}

module.exports = Mailbox;
