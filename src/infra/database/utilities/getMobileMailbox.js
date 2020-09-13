'use strict';

const { logger } = require('../../logging');
const { Mobile, Mailbox } = require('../models');

/**
 * Returns the Mailbox entity for a given Mobile
 * @param {DatabaseContext} database The database context/connection
 * @param {string} mobileId The Mobile ID
 * @returns {Mailbox}
 */
async function getMobileMailbox(database, mobileId) {
  let filterMobile = { mobileId: mobileId };
  let category = Mobile.prototype.category;
  const findMobile = await database.find(category, filterMobile);
  if (findMobile.length === 1) {
    const mobile = findMobile[0];
    let filterMailbox = { mailboxId: mobile.mailboxId };
    category = Mailbox.prototype.category;
    const findMailbox = await database.find(category, filterMailbox);
    if (findMailbox.length > 0) {
      if (findMailbox.length > 1) {
        logger.warning(`${findMailbox.length} entries found`
            + ` for ${mobile.mailboxId}`);
      }
      return findMailbox[0];
    }
    throw new Error(`Mailbox ${mobile.mailboxId} not found in database`);
  }
  throw new Error(`Mobile ${mobileId} not found in database`);
}

module.exports = getMobileMailbox;
