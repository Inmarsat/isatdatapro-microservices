/**
 * getForwardMessages module
 * @module getForwardMessages
 */
'use strict';

const logger = require('../infra/logging').loggerProxy(__filename);
const idpApi = require('isatdatapro-api');
const DatabaseContext = require('../infra/database/repositories');
const { getMailboxes, getStatusMailbox, getMailboxGateway, handleApiResponse, handleApiFailure } = require('../infra/database/utilities');
const { ApiCallLog, MessageForward, Mobile } = require('../infra/database/models');
const event = require('../infra/eventHandler');

/**
 * Retrieves a specific list of messages by unique ID.
 * 
 * Emits events:
 * * ``NewForwardMessage``
 * * ``NewMobile``
 * * ``ApiError``
 * * ``ApiOutage``
 * * ``ApiRecovery``
 * @param {number|string} mailboxId The unique Mailbox ID to retrieve from
 * @param {(number[]|number)} messageIds Unique/list of message IDs to retrieve
 */
module.exports = async function(mailboxId, messageIds) {
  const thisFunction = {name: logger.getModuleName(__filename)};
  logger.debug(`>>>> ${thisFunction.name} entry`);
  const callTime = new Date().toISOString();
  const database = new DatabaseContext();
  await database.initialize();

  /**
   * Retrieves a forward message by ID and puts in the database
   * @private
   * @param {number} messageId The forward message ID
   * @param {(string|number)} mailboxId The unique Mailbox ID
   */
  async function getMessage(messageId, mailboxId) {
    const operation = 'getFowardMessages';
    let mailbox;
    if (mailboxId) {
      mailbox = await getMailboxes(database, undefined, String(mailboxId));
    } else {
      mailbox = await getStatusMailbox(database, messageId);
    }
    const idpGateway = await getMailboxGateway(database, mailbox);
    const auth = {
      accessId: mailbox.accessId,
      password: mailbox.passwordGet(),
    };
    const callTimeUtc = new Date().toISOString();
    const apiCallLog = new ApiCallLog(operation, idpGateway.name,
        mailbox.mailboxId, callTimeUtc);
    await Promise.resolve(idpApi.getForwardMessages(auth, messageId,
        idpGateway.url))
    .then(async function (result) {
      logger.debug(`${operation} result: ${JSON.stringify(result)}`);
      const success = await handleApiResponse(database, 
          result.errorId, apiCallLog, idpGateway);
      if (success) {
        if (result.messages.length > 0) {
          for (let m = 0; m < result.messages.length; m++) {
            const message = new MessageForward();
            await message.fromApi(result.messages[m]);
            message.codecServiceId = message.getCodecServiceId();
            message.codecMessageId = message.getCodecMessageId();
            message.mailboxId = mailbox.mailboxId;
            message.updateStatus();
            // TODO: ensure this covers all cases doesn't lose important data
            if (message.errorId !== 0) {
              logger.warn(`Forward message ${message.messageId}` +
                  ` error: ${message.error}`);
            }
            const messageFilter = { messageId: message.messageId };
            const { id: messageDbId, changeList, created } =
                await database.upsert(message, messageFilter);
            if (!created) {
              if (changeList) {
                logger.info(`Updated message ${message.messageId}:` +
                    ` ${JSON.stringify(changeList)}`);
              } else {
                logger.debug(`Message ${message.messageId}` +
                    ` already in database (${messageDbId})`);
              }
            } else {
              logger.info(`Added forward message ${message.messageId}` +
                  ` to database (${messageDbId})`);
              event.newForwardMessage(message);
              const mobile = new Mobile();
              mobile.mobileId = message.mobileId;
              mobile.mailboxId = message.mailboxId;
              mobile.mobileWakeupPeriod = message.wakeupPeriodEnum();
              const mobileFilter = { mobileId: message.mobileId };
              const { id: mobileDbId, created: newMobile } =
                  await database.upsert(mobile, mobileFilter);
              if (newMobile) {
                logger.info(`Mobile ${mobile.mobileId} added to database` +
                    ` (${mobileDbId})`);
                event.newMobile(mobile);
              }
            }
          }
        } else {
          logger.warn(`No submission accepted`);
        }
      }
    })
    .catch(async (err) => {
      let apiOutage =
          await handleApiFailure(database, err, idpGateway, operation);
      if (!apiOutage) {
        logger.error(err.stack);
        throw err;
      }
    });
    await database.upsert(apiCallLog);
  }

  try {
    logger.debug(`${thisFunction.name} called at ${callTime}`);
    if (!mailboxId || !messageIds) {
      throw new Error(`Missing mailboxId or messageIds`)
    }
    if (!(messageIds instanceof Array)) {
      messageIds = [messageIds];
    }
    for (let id = 0; id < messageIds.length; id++) {
      await getMessage(messageIds[id], mailboxId);
    }
  } catch (err) {
    logger.error(err.stack);
    throw err;
  } finally {
    await database.close();
    logger.debug(`<<<< ${thisFunction.name} exit`);
  }
}