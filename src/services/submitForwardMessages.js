/**
 * submitForwardMessages module
 * @module submitForwardMessages
 */
'use strict';

const logger = require('../infra/logging').loggerProxy(__filename);
const { submitForwardMessages } = require('isatdatapro-api');
const DatabaseContext = require('../infra/database/repositories');
const { getMobileMailbox, getMailboxGateway, handleApiResponse, handleApiFailure } = require('../infra/database/utilities');
const { ApiCallLog, MessageForward, Mobile } = require('../infra/database/models');
const supportedCommands = require('../infra/messageCodecs/coreModem').commandMessages;
const event = require('../infra/eventHandler');

/**
 * A command structure for standard core modem operations
 * @typedef {Object} ModemCommand
 * @param {string} command The shorthand command name
 * @param {*} [params] Parameters specific to the command
 */

/**
 * Submits a command/message to a specified remote modem.
 * 
 * Emits events:
 * * ``NewForwardMessage``
 * * ``NewMobile``
 * * ``ApiError``
 * * ``ApiOutage``
 * * ``ApiRecovery``
 * @param {string} mobileId The destination of the message
 * @param {Object} commandMessage A wrapper for the command/message
 * @param {Object} [commandMessage.payloadJson]
 * @param {number[]} [commandMessage.payloadRaw] An array of decimal bytes [0..255]
 * @param {ModemCommand} [commandMessage.modemCommand]
 */
module.exports = async function(mobileId, commandMessage) {
  const thisFunction = {name: logger.getModuleName(__filename)};
  logger.debug(`>>>> ${thisFunction.name} entry`);
  const database = new DatabaseContext();
  await database.initialize();

  /**
   * Submits a single message to a mobile/broadcast group and stores the result
   * @private
   * @param {MessageForward} message A forward message entity
   * @returns {number} the message ID
   */
  async function submitMessage(message) {
    const operation = 'submitFowardMessages';
    const mailbox = await getMobileMailbox(database, message.mobileId);
    const idpGateway = await getMailboxGateway(database, mailbox);
    const auth = {
      accessId: mailbox.accessId,
      password: mailbox.passwordGet(),
    };
    const callTimeUtc = new Date().toISOString();
    let apiCallLog = new ApiCallLog(operation, idpGateway.name,
        mailbox.mailboxId, callTimeUtc);
    await Promise.resolve(submitForwardMessages(auth, [message.submit()],
        idpGateway.url))
    .then(async function (result) {
      logger.debug(`${operation} result: ${JSON.stringify(result)}`);
      let success = await handleApiResponse(database, result.errorId,
          apiCallLog, idpGateway);
      if (success) {
        if (result.submissions.length > 0) {
          for (let s = 0; s < result.submissions.length; s++) {
            await message.fromApi(result.submissions[s]);
            message.mailboxId = mailbox.mailboxId;
            if (message.errorId !== 0) {
              logger.debug(`Submission error: ${message.error}`);
            } else {
              logger.debug(`Forward Message ID ${message.messageId} assigned`
                  + ` by ${idpGateway.name} gateway`);
              let messageFilter = { messageId: message.messageId };
              let { id: id, created: newMessage } =
                  await database.upsert(message, messageFilter);
              if (newMessage) {
                logger.debug(`Added forward message ${message.messageId}`
                    + ` to database (${id})`);
                event.newForwardMessage(message);
                let mobile = new Mobile();
                mobile.mobileId = message.mobileId;
                mobile.mailboxId = mailbox.mailboxId;
                mobile.mobileWakeupPeriod = message.wakeupPeriodEnum();
                let mobileFilter = { mobileId: message.mobileId };
                let { id: id1, created: newMobile } =
                    await database.upsert(mobile, mobileFilter);
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
    .catch(async function (err) {
      let apiOutage =
          await handleApiFailure(database, err, idpGateway, operation);
      if (!apiOutage) {
        logger.error(err.stack);
        throw err;
      }
    });
    await database.upsert(apiCallLog);
    return message.messageId;
  }

  try {
    if (!mobileId || !commandMessage) {
      throw new Error('Invalid arguments');
    }
    let message = new MessageForward();
    message.mobileId = mobileId;
    if (commandMessage.modemCommand) {
      if (commandMessage.modemCommand.command in supportedCommands) {
        const command = commandMessage.modemCommand.command;
        const params = commandMessage.modemCommand.params;
        message.payloadJson = supportedCommands[command](params);
      } else {
        throw new Error(`Unsupported modem command:`
            + ` ${commandMessage.modemCommand}`);
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