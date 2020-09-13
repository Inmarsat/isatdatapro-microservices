'use strict';
//const logger = require('../../logging').loggerProxy(__filename);
const { Mailbox } = require('../models');

/**
 * Returns a list of Mailbox entities in the database
 * @param {DatabaseContext} database The database context/connection
 * @param {string} [satelliteGatewayName] Optional includeFilter on message gateway system
 * @param {string} [mailboxId] Optional includeFilter on mailbox ID
 * @returns {Mailbox[] | Mailbox} A list of Mailboxes or single if ID was specified
 */
async function getMailboxes(database, satelliteGatewayName, mailboxId) {
  let mailboxes = [];
  let includeFilter = { enabled: true };
  if (satelliteGatewayName) includeFilter.satelliteGatewayName = satelliteGatewayName;
  if (mailboxId) includeFilter.mailboxId = String(mailboxId);
  const category = Mailbox.prototype.category;
  const findMailboxes = await database.find(category, includeFilter);
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
