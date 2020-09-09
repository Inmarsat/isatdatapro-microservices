'use strict';
//const logger = require('../../logging').loggerProxy(__filename);
const { Mailbox } = require('../models');
//const category = require('../models/categories.json').Mailbox;
const propertyConversion = require('./propertyConversion');

/**
 * Returns a list of Mailbox entities in the database
 * @param {DatabaseContext} database The database context/connection
 * @param {string} [satelliteGatewayName] Optional filter on message gateway system
 * @param {string} [mailboxId] Optional filter on mailbox ID
 * @returns {Mailbox[] | Mailbox} A list of Mailboxes or single if ID was specified
 */
async function getMailboxes(database, satelliteGatewayName, mailboxId) {
  let mailboxes = [];
  let filter = { enabled: true };
  if (satelliteGatewayName) filter.satelliteGatewayName = satelliteGatewayName;
  if (mailboxId) filter.mailboxId = String(mailboxId);
  /*
  if ('satelliteGatewayName' in filter || 'mailboxId' in filter) {
    filter = propertyConversion.dbFilter(filter);
  }
  */
  const category = Mailbox.prototype.category;
  const findMailboxes = await database.find(category, filter);
  if (findMailboxes.length > 0) {
    if (mailboxId) {
      mailboxes = findMailboxes[0];
    } else {
      findMailboxes.forEach(mailbox => {
        mailboxes.push(mailbox);
      });
    }
    return mailboxes;
  } else {
    throw new Error(`No Mailboxes found in database`);
  }
}

module.exports = getMailboxes;
