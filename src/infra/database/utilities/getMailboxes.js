'use strict';
//const logger = require('../../logging').loggerProxy(__filename);
const Mailbox = require('../models/Mailbox');
const mailboxCategory = require('../models/categories.json').mailbox;
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
  const categoryToFind = mailboxCategory;
  let filter = { enabled: true };
  if (satelliteGatewayName) { filter.satelliteGatewayName = satelliteGatewayName; }
  if (mailboxId) { filter.mailboxId = String(mailboxId); }
  if ('satelliteGatewayName' in filter || 'mailboxId' in filter) {
    filter = propertyConversion.dbFilter(filter);
  }
  const findResults = await database.find(categoryToFind, filter);
  findResults.forEach(result => {
    let mailbox = new Mailbox();
    mailbox.fromDb(result);
    mailboxes.push(mailbox);
  });
  if (mailboxId) { mailboxes = mailboxes[0] }
  return mailboxes;
}

module.exports = getMailboxes;
