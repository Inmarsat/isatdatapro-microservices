'use strict';
//const logger = require('../../logger').loggerProxy(__filename);
const Mailbox = require('../models/mailbox');
const mailboxCategory = require('../models/categories.json').mailbox;
const propertyConversion = require('./propertyConversion');

/**
 * Returns a list of Mailbox entities in the database
 * @param {DatabaseContext} database The database context/connection
 * @param {string} [messageGateway] Optional filter on message gateway system
 * @param {string} [mailboxId] Optional filter on mailbox ID
 * @returns {Mailbox[] | Mailbox} A list of Mailboxes or single if ID was specified
 */
async function getMailboxes(database, messageGateway, mailboxId) {
  let mailboxes = [];
  const categoryToFind = mailboxCategory;
  let filter = { enabled: true };
  if (messageGateway) { filter.messageGateway = messageGateway; }
  if (mailboxId) { filter.mailboxId = String(mailboxId); }
  if ('messageGateway' in filter || 'mailboxId' in filter) {
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
