// getReturnMessages microservice
'use strict';

const logger = require('../infra/logger').loggerProxy(__filename);
const idpApi = require('isatdatapro-api');
const DatabaseContext = require('../infra/database/repositories/azureCosmosRepository');
const dbUtilities = require('../infra/database/utilities');
const ApiCallLog = require('../infra/database/models/apiCallLog');
const ReturnMessage = require('../infra/database/models/messageReturn');
const Mobile = require('../infra/database/models/mobile');
const emitter = require('../infra/eventHandler/emitter');

/**
 * Fetches new mobile-originated messages, stores by unique ID and puts
 * API metadata in the database for use as high water mark
 * @param {object} context Optional context input e.g. Azure Function App
 */
module.exports = async function (context) {
  const thisFunction = {name: logger.getModuleName(__filename)};
  logger.debug(`>>>> ${thisFunction.name} entry`);
  const callTime = new Date().toISOString();
  const database = new DatabaseContext();
  await database.initialize();
  let idpGateway;

  /**
   * Retreives Mobile-Originated messages and stores unique ones in a database
   * Also logs API calls in a database and uses for high water mark retrieval
   * @param {Object} mailbox Mailbox entity including credentials
   * @param {object} [filter] Optional filter (intended for "more" messages)
   */
  async function getMessages(mailbox, filter) {
    const operation = 'getReturnMessages';
    idpGateway = await dbUtilities.getMailboxGateway(database, mailbox);
    const auth = {
      accessId: mailbox.accessId,
      password: await mailbox.passwordGet(),
    };
    if (!filter) {
      filter = await dbUtilities.getHighwatermark(database, mailbox.mailboxId, operation);
    }
    const callTimeUtc = new Date().toISOString();
    let moreToRetrieve = null;
    let apiCallLog = new ApiCallLog(operation, idpGateway.name, mailbox.mailboxId, callTimeUtc);
    logger.debug(`Get Return messages with ${JSON.stringify(filter)}`);
    await Promise.resolve(idpApi.getReturnMessages(auth, filter, idpGateway.url))
    .then(async function (result) {
      let success = await dbUtilities.handleApiResponse(database, result.errorId, apiCallLog, idpGateway);
      if (success) {
        if (result.nextStartTimeUtc !== '') {
          apiCallLog.nextStartTimeUtc = result.nextStartTimeUtc;
        } else {
          // next time catch any messages that might have been "just missed"
          apiCallLog.nextStartTimeUtc = callTimeUtc;
        }
        apiCallLog.nextStartId = result.nextStartId;
        if (result.messages) {
          logger.info(`Retrieved ${result.messages.length} messages from mailbox ${mailbox.mailboxId}`);
          apiCallLog.messageCount = result.messages.length;
          for (let m = 0; m < result.messages.length; m++) {
            let message = new ReturnMessage();
            await message.populate(result.messages[m]);
            message.mailboxId = mailbox.mailboxId;
            // TODO: confirm if payload array/json cause issues
            let messageFilter = { messageId: message.messageId };
            let { created: newMessage } = await database.createIfNotExists(message.toDb(), messageFilter);
            if (newMessage) {
              const newMessageNotify = `Added return message ${message.messageId} to database`;
              logger.debug(newMessageNotify);
              emitter.emit('NewReturnMessage', newMessageNotify);
              let mobile = new Mobile();
              mobile.mobileId = message.mobileId;
              mobile.mailboxId = mailbox.mailboxId;
              mobile.satelliteRegion = message.satelliteRegion;
              mobile.lastMessageReceivedTimeUtc = message.receiveTimeUtc;
              let mobileFilter = { mobileId: message.mobileId };
              let { created: newMobile } = await database.upsert(mobile.toDb(), mobileFilter);
              if (newMobile) {
                const newMobileNotify = `Mobile ${mobile.mobileId} added to database`;
                logger.debug(newMobileNotify);
                emitter.emit('NewMobile', newMobileNotify);
              }
              // TODO add to event queue and move parsing logic to another function/microservice
              /*
              if (message.codecServiceId === 0) {
                let notifyMessage = codec.parseCoreModem(message);
                context.log(`NOTIFICATION: ${JSON.stringify(notifyMessage)}`);
              } else if (message.codecServiceId === 15 && message.mobileId.includes('SKY')) {
                context.log(`WARNING suspected firmware lock on ${message.mobileId}`);
              } else {
              context.log(`Parsing not defined for codecServiceId=${message.codecServiceId}`);
              }
              */
            } else {
              logger.warn(`Retrieved message ${message.messageId} already in database`);
            }
          }
          // TODO: test this, probably against Modem Simulator
          if (result.more) {
            logger.debug(`More messages to retrieve from mailbox ${mailbox.mailboxId}`);
            moreToRetrieve = { startMessageId: result.nextStartId };
          }
        } else {
          logger.debug(`No messages to retrieve from mailbox ${mailbox.mailboxId}`);
        }
      } else {
        await dbUtilities.handleApiError(apiCallLog);
        logger.warn(`Get return messages failed with reason ${apiCallLog.error}`);
      }
    })
    .catch(async function (err) {
      let apiOutage = await dbUtilities.handleApiTimeout(err, database, idpGateway);
      if (!apiOutage) {
        logger.error(err);
        throw err;
      }
    });
    await database.create(apiCallLog.toDb());
    if (moreToRetrieve) {
      getMessages(mailbox, moreToRetrieve);
    }
  }

  try {
    const mailboxes = await dbUtilities.getMailboxes(database);
    for (let i = 0; i < mailboxes.length; i++) {
      let activeMailbox = mailboxes[i];
      await getMessages(activeMailbox);
    }
  } catch (err) {
    switch(err.message) {
      default:
        logger.error(err);
        throw err;
    }
  } finally {
    await database.close();
    logger.debug(`<<<< ${thisFunction.name} exit`);
  }
};