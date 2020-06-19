'use strict';
//const logger = require('../../logger').loggerProxy(__filename);
const Mobile = require('../models/mobile');
const ForwardMessage = require('../models/messageForward');
const propertyConversion = require('./propertyConversion');
const getMobileMailbox = require('./getMobileMailbox');

/**
 * Returns the Mailbox entity for a given Forward Message
 * @param {DatabaseContext} database The database context/connection
 * @param {number} messageId The Mobile ID
 * @returns {Mobile}
 */
async function getStatusMailbox(database, messageId) {
  let message = new ForwardMessage();
  let categoryToFind = message.category;
  let filterMessage = { messageId: messageId };
  filterMessage = propertyConversion.dbFilter(filterMessage);
  const findMessage = await database.find(categoryToFind, filterMessage);
  if (findMessage.length > 0) {
    message.fromDb(findMessage[0]);
    let mailbox = await getMobileMailbox(database, message.mobileId);
    return mailbox;
  }
  throw new Error(`Message ${messageId} not found in database`);
}

module.exports = getStatusMailbox;
