'use strict';

//const logger = require('../../logging').loggerProxy(__filename);
const { Mobile, MessageForward } = require('../models');
const getMobileMailbox = require('./getMobileMailbox');

/**
 * Returns the Mailbox entity for a given Forward Message
 * @param {DatabaseContext} database The database context/connection
 * @param {number} messageId The Mobile ID
 * @returns {Object} the Mailbox entity
 * @throws {Error} if messageId or mobileId not found in database
 */
async function getStatusMailbox(database, messageId) {
  //let message = new MessageForward();
  let filterMessage = { messageId: messageId };
  const findMessage = await database.find(MessageForward.prototype.category, 
      filterMessage);
  if (findMessage.length > 0) {
    const message = findMessage[0];
    if (message.mobileId) {
      const mailbox = await getMobileMailbox(database, message.mobileId);
      return mailbox;
    }
    throw new Error(`Forward status ${messageId} mobileId unknown`);
  }
  throw new Error(`Message/status ${messageId} not found in database`);
}

module.exports = getStatusMailbox;
