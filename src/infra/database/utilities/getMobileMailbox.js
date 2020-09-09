'use strict';
//const logger = require('../../logging').loggerProxy(__filename);
const { Mobile, Mailbox } = require('../models');
// const Mailbox = require('../models/Mailbox');
//const mobileCategory = require('../models/categories.json').Mobile;
//const mailboxCategory = require('../models/categories.json').Mailbox;
//const propertyConversion = require('./propertyConversion');

/**
 * Returns the Mailbox entity for a given Mobile
 * @param {DatabaseContext} database The database context/connection
 * @param {string} mobileId The Mobile ID
 * @returns {Mailbox}
 */
async function getMobileMailbox(database, mobileId) {
  //let categoryToFind = mobileCategory;
  let filterMobile = { mobileId: mobileId };
  //filterMobile = propertyConversion.dbFilter(filterMobile);
  let category = Mobile.prototype.category;
  const findMobile = await database.find(category, filterMobile);
  if (findMobile.length === 1) {
    //let mobile = new Mobile();
    //mobile.fromDb(findMobile[0]);
    const mobile = findMobile[0];
    //let categoryToFind = mailboxCategory;
    let filterMailbox = { mailboxId: mobile.mailboxId };
    //filterMailbox = propertyConversion.dbFilter(filterMailbox);
    category = Mailbox.prototype.category;
    const findMailbox = await database.find(category, filterMailbox);
    if (findMailbox.length === 1) {
      //let mailbox = new Mailbox();
      //mailbox.fromDb(findMailbox[0]);
      return findMailbox[0];
    }
    throw new Error(`Mailbox ${mobile.mailboxId} not found in database`);
  }
  throw new Error(`Mobile ${mobileId} not found in database`);
}

module.exports = getMobileMailbox;
