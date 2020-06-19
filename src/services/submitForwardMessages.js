'use strict';

const logger = require('../infra/logger').loggerProxy(__filename);
const idpApi = require('isatdatapro-api');
const DatabaseContext = require('../infra/database/repositories');
const dbUtilities = require('../infra/database/utilities');
const ApiCallLog = require('../infra/database/models/apiCallLog');
const ForwardMessage = require('../infra/database/models/messageForward');
const Mobile = require('../infra/database/models/mobile');
const supportedCommands = require('../infra/messageCodecs/coreModem');
const emitter = require('../infra/eventHandler');

module.exports = async function(context, req) {
  const thisFunction = {name: logger.getModuleName(__filename)};
  logger.debug(`>>>> ${thisFunction.name} entry`);
  const callTime = new Date().toISOString();
  const database = new DatabaseContext();
  await database.initialize();
  let idpGateway;

  /**
   * Submits a single message to a mobile / broadcast group and stores the result
   * @param {ForwardMessage} message A forward message entity
   * @returns {number} the message ID
   */
  async function submitMessage(message) {
    const operation = 'submitFowardMessages';
    const mailbox = await dbUtilities.getMobileMailbox(database, message.mobileId);
    idpGateway = await dbUtilities.getMailboxGateway(database, mailbox);
    const auth = {
      accessId: mailbox.accessId,
      password: await mailbox.passwordGet(),
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
            // TODO: ensure this covers all cases doesn't lose important data
            if (message.errorId !== 0) {
              logger.debug(`Submission error: ${message.error}`);
            } else {
              logger.debug(`Forward Message ID ${message.messageId} assigned by ${idpGateway.name} gateway`);
              let messageFilter = { messageId: message.messageId };
              let { created: newMessage } = await database.createIfNotExists(message.toDb(), messageFilter);
              if (newMessage) {
                logger.debug(`Added forward message ${message.messageId} to database`);
                let mobile = new Mobile();
                mobile.mobileId = message.mobileId;
                mobile.mailboxId = mailbox.mailboxId;
                mobile.mobileWakeupPeriod = message.mobileWakeupPeriod;
                let mobileFilter = { mobileId: message.mobileId };
                let { created: newMobile } = await database.upsert(mobile.toDb(), mobileFilter);
                if (newMobile) {
                  logger.debug(`Mobile ${mobile.mobileId} added to database`);
                  emitter.emit('NewMobile', `Forward message submission to new Mobile ${mobile.mobileId}`);
                }
              }
            }
          }
        } else {
          logger.warn(`No submission accepted`);
        }
      } else {
        await dbUtilities.handleApiError(apiCallLog);
        logger.error(`Submit message failed with cause ${apiCallLog.error}`);
      }
    })
    .catch(async (err) => {
      console.log(err);
      let apiOutage = await dbUtilities.handleApiTimeout(err, idpGateway);
      if (!apiOutage) throw err;
    });
    await database.create(apiCallLog.toDb());
    return message.messageId;
  }

  try {
    logger.debug(`${thisFunction.name} http triggered at ${callTime}`);
    let validRequest = false;
    let message = new ForwardMessage();
    if (req.query && req.query.mobileId && req.query.cmd) {
      //TODO: Untested
      if (req.query.cmd in supportedCommands) {
        validRequest = true;
        message.mobileId = req.query.mobileId;
        message.payloadJson = supportedCommands(req.query.cmd);
        if (req.query.userMessageId) message.userMessageId = req.query.userMessageId;
      } else {
        let helper = [];
        for (key in supportedCommands) {
          helper.push(key);
        }
        logger.res = {
          status: 401,
          body: `Unsupported command ${req.query.cmd}, use: ${helper}`,
        }
      }
    } else if (req.body && req.body.mobileId) {
      message.mobileId = req.body.mobileId;
      if (req.body.payloadRaw) {
        validRequest = true;
        message.payloadRaw = req.body.payloadRaw;
      } else if (req.body.payloadJson) {
        let payload = req.body.payloadJson;
        if (payload.codecServiceId && payload.codecMessageId && payload.fields) {
          validRequest = true;
          message.payloadJson = payload;
        } else {
          logger.res = {
            status: 402,
            body: `Missing codecServiceId, codecMessageId or fields`,
          };
        }
      } else {
        logger.res = {
          status: 403,
          body: 'Missing payloadRaw or payloadJson',
        };
      }
    }
    if (validRequest) {
      let messageId = await submitMessage(message);
      if (typeof(messageId) === 'undefined') {
        throw new Error('API did not return messageId');
      }
      // TODO failure/error handling
      let notify = `Submitted message assigned ID ${messageId}`;
      console.log(notify);
      logger.res = {
        status: 200,
        body: notify,
      };
    } else {
      logger.res = {
        status: 400,
        body: "Please pass a Mobile ID and command on the query string, or include the request body"
      };
    }
  } catch (err) {
    console.log(err.stack);
    throw err;
  } finally {
    await database.close();
    logger.debug(`<<<< ${thisFunction.name} exit`);
  }
}