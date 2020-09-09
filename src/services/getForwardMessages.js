'use strict';

const logger = require('../infra/logging').loggerProxy(__filename);
const idpApi = require('isatdatapro-api');
const DatabaseContext = require('../infra/database/repositories');
const dbUtilities = require('../infra/database/utilities');
const { ApiCallLog, MessageForward, Mobile } = require('../infra/database/models');
//const MessageForward = require('../infra/database/models/MessageForward');
//const Mobile = require('../infra/database/models/Mobile');
const event = require('../infra/eventHandler');

module.exports = async function(mailboxId, messageIds) {
  const thisFunction = {name: logger.getModuleName(__filename)};
  logger.debug(`>>>> ${thisFunction.name} entry`);
  const callTime = new Date().toISOString();
  const database = new DatabaseContext();
  await database.initialize();

  async function getMessage(messageId, mailboxId) {
    const operation = 'getFowardMessages';
    let mailbox;
    if (mailboxId) {
      mailbox = await dbUtilities.getMailboxes(database, undefined, String(mailboxId));
    } else {
      mailbox = await dbUtilities.getStatusMailbox(database, messageId);
    }
    const idpGateway = await dbUtilities.getMailboxGateway(database, mailbox);
    const auth = {
      accessId: mailbox.accessId,
      password: mailbox.passwordGet(),
    };
    const callTimeUtc = new Date().toISOString();
    let apiCallLog = new ApiCallLog(operation, idpGateway.name, mailbox.mailboxId, callTimeUtc);
    await Promise.resolve(idpApi.getForwardMessages(auth, messageId, idpGateway.url))
    .then(async function (result) {
      logger.debug(`${operation} result: ${JSON.stringify(result)}`);
      let success = await dbUtilities.handleApiResponse(database, result.errorId, apiCallLog, idpGateway);
      if (success) {
        if (result.messages.length > 0) {
          for (let m = 0; m < result.messages.length; m++) {
            let message = new MessageForward();
            await message.populate(result.messages[m]);
            message.codecServiceId = message.getCodecServiceId();
            message.codecMessageId = message.getCodecMessageId();
            message.mailboxId = mailbox.mailboxId;
            message.updateStatus();
            // TODO: ensure this covers all cases doesn't lose important data
            if (message.errorId !== 0) {
              logger.warn(`Forward message ${message.messageId} error: ${message.error}`);
            }
            let messageFilter = { messageId: message.messageId };
            let { id, changeList, created } = await database.upsert(message, messageFilter);
            if (!created) {
              if (Object.keys(changeList).length > 0) {
                logger.info(`Updated message ${message.messageId}: ${JSON.stringify(changeList)}`);
              }
            } else {
              logger.info(`Added forward message ${message.messageId} to database (${id})`);
              event.newForwardMessage(message);
              let mobile = new Mobile();
              mobile.mobileId = message.mobileId;
              mobile.mailboxId = message.mailboxId;
              mobile.mobileWakeupPeriod = message.wakeupPeriodEnum();
              let mobileFilter = { mobileId: message.mobileId };
              let { id: itemId, created: newMobile } = await database.upsert(mobile, mobileFilter);
              if (newMobile) {
                logger.info(`Mobile ${mobile.mobileId} added to database (${itemId})`);
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
      let apiOutage = await dbUtilities.handleApiFailure(err, idpGateway);
      if (!apiOutage) {
        logger.error(err);
        throw err;
      }
    });
    await database.upsert(apiCallLog.toDb());
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