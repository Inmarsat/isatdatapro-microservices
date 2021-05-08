/**
 * getReturnMessages module
 * @module getReturnMessages
 */
'use strict';

const logger = require('../infra/logging').loggerProxy(__filename);
const { getReturnMessages } = require('isatdatapro-api');
const DatabaseContext = require('../infra/database/repositories');
const { getMailboxes, getMailboxGateway, getHighwatermark, handleApiResponse, handleApiFailure } = require('../infra/database/utilities');
const { ApiCallLog, MessageReturn, Mobile } = require('../infra/database/models');
const event = require('../infra/eventHandler');
const parseModemMeta = require('../infra/messageCodecs/coreModem').parse;

/**
 * Fetches new mobile-originated messages, stores by unique ID and puts
 * API metadata in the database for use as high water mark.  
 * Updates Mobile metadata from Core Modem messages.  
 * 
 * Emits events:
 * * ``NewReturnMessage``
 * * ``NewMobile``
 * * ``ApiError``
 * * ``ApiOutage``
 * * ``ApiRecovery``
 */
module.exports = async function () {
  const thisFunction = {name: logger.getModuleName(__filename)};
  logger.debug(`>>>> ${thisFunction.name} entry`);
  const database = new DatabaseContext();
  await database.initialize();

  /**
   * Retreives Mobile-Originated messages and stores unique ones in a database
   * Also logs API calls in a database and uses for high water mark retrieval
   * @private
   * @param {Object} mailbox Mailbox entity including credentials
   * @param {object} [filter] Optional filter (intended for "more" messages)
   */
  async function getMessages(mailbox, filter) {
    const operation = 'getReturnMessages';
    const idpGateway = await getMailboxGateway(database, mailbox);
    const auth = {
      accessId: mailbox.accessId,
      password: mailbox.passwordGet(),
    };
    if (!filter) {
      filter = await getHighwatermark(database, mailbox.mailboxId, operation);
    }
    const callTimeUtc = new Date().toISOString();
    let moreToRetrieve;
    const apiCallLog = new ApiCallLog(operation, idpGateway.name,
        mailbox.mailboxId, callTimeUtc);
    logger.debug(`Get Return messages with ${JSON.stringify(filter)}`);
    await Promise.resolve(getReturnMessages(auth, filter, idpGateway.url))
    .then(async function (result) {
      const success = await handleApiResponse(database, result.errorId,
          apiCallLog, idpGateway);
      if (success) {
        apiCallLog.nextStartTimeUtc = result.nextStartTimeUtc;
        apiCallLog.nextStartId = result.nextStartId;
        if (result.messages) {
          logger.info(`Retrieved ${result.messages.length} messages` +
              ` from mailbox ${mailbox.mailboxId}`);
          apiCallLog.messageCount = result.messages.length;
          for (let m = 0; m < result.messages.length; m++) {
            const message = new MessageReturn();
            await message.fromApi(result.messages[m]);
            message.mailboxId = mailbox.mailboxId;
            //message.codecServiceId obtained fromApi
            message.codecMessageId = message.getCodecMessageId();
            const messageFilter = { messageId: message.messageId };
            const { id: messageDbId, created: newMessage } =
                await database.upsert(message, messageFilter);
            if (newMessage) {
              logger.debug(`Added return message ${message.messageId}` +
                  ` to database (${messageDbId})`);
              event.newReturnMessage(message);
              const mobile = new Mobile();
              mobile.mobileId = message.mobileId;
              mobile.mailboxId = mailbox.mailboxId;
              mobile.satelliteRegion = message.satelliteRegion;
              mobile.lastMessageReceivedTimeUtc = message.receiveTimeUtc;
              if (message.payloadJson &&
                  message.payloadJson.codecServiceId === 0) {
                const mobileMeta = parseModemMeta(message);
                if (!mobileMeta) {
                  throw new Error(`Failed to parse core modem data`);
                }
                Object.assign(mobile, mobileMeta);
              }
              const mobileFilter = { mobileId: message.mobileId };
              const { id: mobileDbId, created: newMobile } =
                  await database.upsert(mobile, mobileFilter);
              if (newMobile) {
                logger.debug(`Mobile ${mobile.mobileId} added to database` +
                    ` (${mobileDbId})`);
                event.newMobile(mobile);
              }
            } else {
              logger.warn(`Retrieved message ${message.messageId}` +
                  ` already in database (${messageDbId})`);
            }
          }
          // TODO: test this, probably against a Simulator
          if (result.more) {
            logger.debug(`More messages to retrieve` +
                ` from mailbox ${mailbox.mailboxId}`);
            moreToRetrieve = { startMessageId: result.nextStartId };
          }
        } else {
          logger.debug(`No messages to retrieve` +
              ` from mailbox ${mailbox.mailboxId}`);
        }
      }
    })
    .catch(async function (err) {
      let apiOutage =
          await handleApiFailure(database, err, idpGateway, operation);
      if (!apiOutage) {
        logger.error(err.stack);
        throw err;
      }
    });
    await database.upsert(apiCallLog);
    if (moreToRetrieve) {
      await getMessages(mailbox, moreToRetrieve);
    }
  }

  try {
    const mailboxes = await getMailboxes(database);
    if (mailboxes.length > 0) {
      for (let i = 0; i < mailboxes.length; i++) {
        let activeMailbox = mailboxes[i];
        await getMessages(activeMailbox);
      }
    } else {
      logger.warn('No enabled Mailboxes found in database');
    }
    return true;
  } catch (err) {
    logger.error(err.stack);
    throw err;
  } finally {
    await database.close();
    logger.debug(`<<<< ${thisFunction.name} exit`);
  }
};