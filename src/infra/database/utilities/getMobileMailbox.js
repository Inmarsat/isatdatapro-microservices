'use strict';
//const logger = require('../../logging').loggerProxy(__filename);
const Mobile = require('../models/mobile');
const Mailbox = require('../models/mailbox');
const mobileCategory = require('../models/categories.json').mobile;
const mailboxCategory = require('../models/categories.json').mailbox;
const propertyConversion = require('./propertyConversion');

/**
 * Returns the Mailbox entity for a given Mobile
 * @param {DatabaseContext} database The database context/connection
 * @param {string} mobileId The Mobile ID
 * @returns {Mailbox}
 */
async function getMobileMailbox(database, mobileId) {
  let categoryToFind = mobileCategory;
  let filterMobile = { mobileId: mobileId };
  filterMobile = propertyConversion.dbFilter(filterMobile);
  const findMobile = await database.find(categoryToFind, filterMobile);
  if (findMobile.length > 0) {
    let mobile = new Mobile();
    mobile.fromDb(findMobile[0]);
    let categoryToFind = mailboxCategory;
    let filterMailbox = { mailboxId: mobile.mailboxId };
    filterMailbox = propertyConversion.dbFilter(filterMailbox);
    const findMailbox = await database.find(categoryToFind, filterMailbox);
    if (findMailbox.length > 0) {
      let mailbox = new Mailbox();
      mailbox.fromDb(findMailbox[0]);
      return mailbox;
    }
    throw new Error(`Mailbox ${mobile.mailboxId} not found in database`);
  }
  throw new Error(`Mobile ${mobileId} not found in database`);
}

module.exports = getMobileMailbox;
