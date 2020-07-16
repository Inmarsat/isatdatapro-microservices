'use strict';

const logger = require('../infra/logging').loggerProxy(__filename);
const DatabaseContext = require('../infra/database/repositories');
const Mailbox = require('../infra/database/models/mailbox');

/**
 * Adds a mailbox or updates existing mailbox parameters
 * @param {object} mailboxParameters 
 */
module.exports = async function (mailboxParameters) {
  const thisFunction = {name: logger.getModuleName(__filename)};
  logger.debug(`>>>> ${thisFunction.name} entry`);
  const callTime = new Date().toISOString();
  const database = new DatabaseContext();
  await database.initialize();

  try {
    if (typeof(mailboxParameters.mailboxId) === 'string' &&
        typeof(mailboxParameters.name) === 'string' &&
        typeof(mailboxParameters.accessId) === 'string' &&
        typeof(mailboxParameters.password) === 'string' &&
        typeof(mailboxParameters.satelliteGatewayName) === 'string') {
      //: valid definition
      let mailbox = new Mailbox(
        mailboxParameters.mailboxId,
        mailboxParameters.name,
        mailboxParameters.accessId,
        mailboxParameters.password,
        mailboxParameters.satelliteGatewayName
      );
      let uniFilter = { mailboxId: mailbox.mailboxId };
      let { id , changeList, created } = await database.upsert(mailbox.toDb(), uniFilter);
      //TODO: validate auth/connectivity using getMobiles;
      if (created) {
        logger.debug(`Added mailbox ${mailbox.mailboxId} to database (${id})`);
      } else {
        logger.debug(`Changes to mailbox ${mailbox.mailboxId}: ${JSON.stringify(changeList)}`);
      }
    } else {
      throw new Error('Invalid mailbox parameters');
    }
  } catch (err) {
    logger.error(err.stack);
    throw err;
  } finally {
    await database.close();
    logger.debug(`<<<< ${thisFunction.name} exit`);
  }
}