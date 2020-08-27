'use strict';

const logger = require('../infra/logging').loggerProxy(__filename);
const idpApi = require('isatdatapro-api');
const DatabaseContext = require('../infra/database/repositories');
const dbUtilities = require('../infra/database/utilities');
const ApiCallLog = require('../infra/database/models/apiCallLog');
const ForwardMessage = require('../infra/database/models/messageForward');
const Mobile = require('../infra/database/models/mobile');
const supportedCommands = require('../infra/messageCodecs/coreModem').commandMessages;
const event = require('../infra/eventHandler');

module.exports = async function(mobileId, commandMessage) {
  const thisFunction = {name: logger.getModuleName(__filename)};
  logger.debug(`>>>> ${thisFunction.name} entry`);
  const callTime = new Date().toISOString();
  const database = new DatabaseContext();
  await database.initialize();

  /**
   * Submits a single message to a mobile / broadcast group and stores the result
   * @param {ForwardMessage} message A forward message entity
   * @returns {number} the message ID
   */
  async function submitMessage(message) {
    const operation = 'submitFowardMessages';
    const mailbox = await dbUtilities.getMobileMailbox(database, message.mobileId);
    const idpGateway = await dbUtilities.getMailboxGateway(database, mailbox);
    const auth = {
      accessId: mailbox.accessId,
      password: mailbox.passwordGet(),
    };
    const callTimeUtc = new Date().toISOString();
    let apiCallLog = new ApiCallLog(operation, idpGateway.name, mailbox.mailboxId, callTimeUtc);
    await Promise.resolve(idpApi.submitForwardMessages(auth, [message.submit()], idpGateway.url))
    .then(async function (result) {
      logger.debug(`${operation} result: ${JSON.stringify(result)}`);
      let success = await dbUtilities.handleApiResponse(database, result.errorId, apiCallLog, idpGateway);
      if (success) {
        if (result.submissions.length > 0) {
          for (let s = 0; s < result.submissions.length; s++) {
            await message.populate(result.submissions[s]);
            message.mailboxId = mailbox.mailboxId;
            if (message.errorId !== 0) {
              logger.debug(`Submission error: ${message.error}`);
            } else {
              logger.debug(`Forward Message ID ${message.messageId} assigned by ${idpGateway.name} gateway`);
              let messageFilter = { messageId: message.messageId };
              let { id: id, created: newMessage } = await database.createIfNotExists(message.toDb(), messageFilter);
              if (newMessage) {
                logger.debug(`Added forward message ${message.messageId} to database (${id})`);
                event.newForwardMessage(message);
                let mobile = new Mobile();
                mobile.mobileId = message.mobileId;
                mobile.mailboxId = mailbox.mailboxId;
                mobile.mobileWakeupPeriod = message.mobileWakeupPeriod;
                let mobileFilter = { mobileId: message.mobileId };
                let { id: id1, created: newMobile } = await database.upsert(mobile.toDb(), mobileFilter);
                if (newMobile) {
                  logger.debug(`Mobile ${mobile.mobileId} added to database (${id1})`);
                  event.newMobile(mobile);
                }
              }
            }
          }
        } else {
          logger.warn(`No submission accepted`);
        }
      }
    })
    .catch(async (err) => {
      logger.error(err);
      let apiOutage = await dbUtilities.handleApiFailure(err, idpGateway);
      if (!apiOutage) throw err;
    });
    await database.create(apiCallLog.toDb());
    return message.messageId;
  }

  try {
    logger.debug(`${thisFunction.name} called at ${callTime}`);
    if (!mobileId || !commandMessage) {
      throw new Error('Invalid arguments');
    }
    let message = new ForwardMessage();
    message.mobileId = mobileId;
    if (commandMessage.modemCommand) {
      if (commandMessage.modemCommand.command in supportedCommands) {
        const command = commandMessage.modemCommand.command;
        const params = commandMessage.modemCommand.params;
        message.payloadJson = supportedCommands[command](params);
      } else {
        throw new Error(`Unsupported modem command: ${commandMessage.modemCommand}`);
      }
    } else if (commandMessage.payloadJson) {
      //TODO: validate payload structure
      message.payloadJson = commandMessage.payloadJson;
    } else if (commandMessage.payloadRaw) {
      message.payloadRaw = commandMessage.payloadRaw;
    } else {
      throw new Error('Invalid payload definition');
    }
    let messageId = await submitMessage(message);
    if (messageId) {
      return true;
    } else {
      return false;
    }
  } catch (err) {
    logger.error(err.stack);
    throw err;
  } finally {
    await database.close();
    logger.debug(`<<<< ${thisFunction.name} exit`);
  }
}