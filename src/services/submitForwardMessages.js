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
 * A command structure shorthand for standard core modem operations
 * @typedef {Object} ModemCommand
 * @property {string} command The shorthand command name
 *     <br>&nbsp;&nbsp;'ping' (no params)
 *     <br>&nbsp;&nbsp;'getLocation' (no params)
 *     <br>&nbsp;&nbsp;'setWakeupPeriod' (string)
 *     <br>&nbsp;&nbsp;'getConfiguration' (no params)
 *     <br>&nbsp;&nbsp;'reset' (optional string)
 *     <br>&nbsp;&nbsp;'setTxMute' (boolean)
 *     <br>&nbsp;&nbsp;'getBroadcastIds' (no params)
 * @property {*} [params] Parameter(s) specific to the command
 */

/**
 * A JSON message structure
 * @typedef {Object} PayloadJson
 * @property {number} codecServiceId A service definition number [16..255]
 * @property {number} codecMessageId A message definition number [0..255]
 * @property {string} [name] The message name
 * @property {Object[]} fields A list of Field objects (https://github.com/Inmarsat/isatdatapro-api)
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
 * @param {Object} message A wrapper for the command/message
 * @param {Object} [message.payloadJson] 
 * @param {number[]} [message.payloadRaw] An array of decimal bytes [0..255]
 * @param {ModemCommand} [message.modemCommand] A supported modem command shorthand
 * @param {number} [userMessageId] an optional user message ID number
 */
module.exports = async function(mobileId, message, userMessageId) {
  const thisFunction = {name: logger.getModuleName(__filename)};
  logger.debug(`>>>> ${thisFunction.name} entry`);
  const database = new DatabaseContext();
  await database.initialize();

  /**
   * Submits a single message to a mobile/broadcast group and stores the result
   * @private
   * @param {MessageForward} forwardMessage A forward message entity
   * @returns {number} the message ID
   */
  async function submitMessage(forwardMessage) {
    const operation = 'submitFowardMessages';
    const mailbox = await getMobileMailbox(database, forwardMessage.mobileId);
    const idpGateway = await getMailboxGateway(database, mailbox);
    const auth = {
      accessId: mailbox.accessId,
      password: mailbox.passwordGet(),
    };
    const callTimeUtc = new Date().toISOString();
    const apiCallLog = new ApiCallLog(operation, idpGateway.name,
        mailbox.mailboxId, callTimeUtc);
    await Promise.resolve(submitForwardMessages(auth, [forwardMessage.submit()],
        idpGateway.url))
    .then(async function (result) {
      logger.debug(`${operation} result: ${JSON.stringify(result)}`);
      const success = await handleApiResponse(database, result.errorId,
          apiCallLog, idpGateway);
      if (success) {
        if (result.submissions.length > 0) {
          for (let s = 0; s < result.submissions.length; s++) {
            await forwardMessage.fromApi(result.submissions[s]);
            forwardMessage.mailboxId = mailbox.mailboxId;
            forwardMessage.mailboxTimeUtc = forwardMessage.stateTimeUtc;
            forwardMessage.codecServiceId = forwardMessage.getCodecServiceId();
            forwardMessage.codecMessageId = forwardMessage.getCodecMessageId();
            const { messageId, mobileId } = forwardMessage;
            if (forwardMessage.errorId !== 0) {
              logger.debug(`Submission error: ${forwardMessage.error}`);
            } else {
              logger.debug(`Forward Message ID ${messageId} assigned` +
                  ` by ${idpGateway.name} gateway`);
              const messageFilter = { messageId: messageId };
              const { id: messageDbId, created: newMessage } =
                  await database.upsert(forwardMessage, messageFilter);
              if (newMessage) {
                logger.debug(`Added forward message ${messageId} to database` +
                    ` (${messageDbId})`);
                event.newForwardMessage(forwardMessage);
                let mobile = new Mobile();
                mobile.mobileId = mobileId;
                mobile.mailboxId = mailbox.mailboxId;
                mobile.mobileWakeupPeriod = forwardMessage.wakeupPeriodEnum();
                const mobileFilter = { mobileId: mobileId };
                const { id: mailboxDbId, created: newMobile } =
                    await database.upsert(mobile, mobileFilter);
                if (newMobile) {
                  logger.debug(`Mobile ${mobileId} added to database` +
                      ` (${mailboxDbId})`);
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
    // return message.messageId;
    return forwardMessage;
  }

  try {
    if (!mobileId || !message) {
      throw new Error('Invalid arguments');
    }
    let forwardMessage = new MessageForward();
    forwardMessage.mobileId = mobileId;
    if (userMessageId) forwardMessage.userMessageId = userMessageId;
    if (message.modemCommand) {
      if (message.modemCommand.command in supportedCommands) {
        const command = message.modemCommand.command;
        const params = message.modemCommand.params;
        forwardMessage.payloadJson = supportedCommands[command](params);
      } else {
        throw new Error(`Unsupported modem command:`
            + ` ${message.modemCommand}`);
      }
    } else if (message.payloadJson) {
      //TODO: validate payload structure
      forwardMessage.payloadJson = message.payloadJson;
    } else if (message.payloadRaw) {
      forwardMessage.payloadRaw = message.payloadRaw;
    } else {
      throw new Error('Invalid payload definition');
    }
    const messageMeta = await submitMessage(forwardMessage);
    if (messageMeta) return messageMeta.messageId;
    return null;
  } catch (err) {
    logger.error(err.stack);
    throw err;
  } finally {
    await database.close();
    logger.debug(`<<<< ${thisFunction.name} exit`);
  }
}