'use strict';
//const logger = require('../../logging').loggerProxy(__filename);
const Mobile = require('../models/Mobile');
const ForwardMessage = require('../models/MessageForward');
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
    if (message.mobileId) {
      const mailbox = await getMobileMailbox(database, message.mobileId);
      return mailbox;
    }
    throw new Error(`Forward status ${messageId} mobileId unknown`);
  }
  throw new Error(`Message/status ${messageId} not found in database`);
}

module.exports = getStatusMailbox;
