/**
 * updateMailbox module
 * @module updateMailbox
 */
'use strict';

const logger = require('../infra/logging').loggerProxy(__filename);
const DatabaseContext = require('../infra/database/repositories');
const { Mailbox } = require('../infra/database/models');

/**
 * Adds a mailbox or updates existing mailbox parameters
 * @param {object} mailboxParameters The Mailbox details
 * @param {string} mailboxParameters.mailboxId 
 * @param {string} [mailboxParameters.name] 
 * @param {string} [mailboxParameters.accessId] 
 * @param {string} [mailboxParameters.password] 
 * @param {string} [mailboxParameters.satelliteGatewayName] 
 */
module.exports = async function (mailboxParameters) {
  const thisFunction = {name: logger.getModuleName(__filename)};
  logger.debug(`>>>> ${thisFunction.name} entry`);
  const database = new DatabaseContext();
  await database.initialize();

  try {
    if (!mailboxParameters.mailboxId) {
      throw new Error(`Missing unique key mailboxId`);
    }
    if (typeof(mailboxParameters.mailboxId) === 'string') {
      //: valid definition
      let mailbox = new Mailbox(
        mailboxParameters.mailboxId,
        mailboxParameters.name,
        mailboxParameters.accessId,
        mailboxParameters.password,
        mailboxParameters.satelliteGatewayName
      );
      const mailboxFilter = { mailboxId: mailbox.mailboxId };
      const { id, changeList, created } =
          await database.upsert(mailbox, mailboxFilter);
      //TODO: validate auth/connectivity using getMobiles;
      if (created) {
        logger.debug(`Added mailbox ${mailbox.mailboxId} to database (${id})`);
      } else {
        logger.debug(`Changes to mailbox ${mailbox.mailboxId}:` +
            ` ${JSON.stringify(changeList)}`);
      }
    } else {
      throw new Error('Invalid mailbox parameters');
    }
    return true;
  } catch (err) {
    logger.error(err.stack);
    throw err;
  } finally {
    await database.close();
    logger.debug(`<<<< ${thisFunction.name} exit`);
  }
}