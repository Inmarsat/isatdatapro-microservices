'use strict';

const logger = require('../infra/logger').loggerProxy(__filename);
const idpApi = require('isatdatapro-api');
const DatabaseContext = require('../infra/database/repositories');
const dbUtilities = require('../infra/database/utilities');
const ApiCallLog = require('../infra/database/models/apiCallLog');
const ForwardMessage = require('../infra/database/models/messageForward');
const Mobile = require('../infra/database/models/mobile');
const emitter = require('../infra/eventHandler');

module.exports = async function(context, req) {
  const thisFunction = {name: logger.getModuleName(__filename)};
  logger.debug(`>>>> ${thisFunction.name} entry`);
  const callTime = new Date().toISOString();
  const database = new DatabaseContext();
  await database.initialize();
  let idpGateway;

  async function getMessage(messageId) {
    const operation = 'getFowardMessages';
    const mailbox = await dbUtilities.getStatusMailbox(database, messageId);
    idpGateway = await dbUtilities.getMailboxGateway(database, mailbox);
    const auth = {
      accessId: mailbox.accessId,
      password: await mailbox.passwordGet(),
    };
    let message = new ForwardMessage();
    const callTimeUtc = new Date().toISOString();
    let apiCallLog = new ApiCallLog(operation, idpGateway.name, mailbox.mailboxId, callTimeUtc);
    await Promise.resolve(idpApi.getForwardMessages(auth, messageId, idpGateway.url))
    .then(async function (result) {
      logger.debug(`${operation} result: ${JSON.stringify(result)}`);
      let success = await dbUtilities.handleApiResponse(database, result.errorId, apiCallLog, idpGateway);
      if (success) {
        if (result.messages.length > 0) {
          for (let m = 0; m < result.messages.length; m++) {
            //let message = new ForwardMessage();
            await message.populate(result.messages[m]);
            message.mailboxId = mailbox.mailboxId;
            // TODO: ensure this covers all cases doesn't lose important data
            if (message.errorId !== 0) {
              logger.error(`Get forward message error: ${message.error}`);
            } else {
              let messageFilter = { messageId: message.messageId };
              let id = await database.exists(message.toDb(), messageFilter);
              if (id) {
                let dbMessage = new ForwardMessage();
                let dbMessageContent = await database.read(id, message.category);
                dbMessage.fromDb(dbMessageContent);
                dbMessage.updateNonNull(message);
                dbMessage.id = id;
                await database.update(dbMessage.toDb());
              } else {
                let { id: id1, created: newMessage } = await database.upsert(message.toDb(), messageFilter);
                logger.info(`Added forward message ${message.messageId} to database (${id1})`);
                emitter.emit('NewForwardMessage', `Message ${message.messageId} submitted`);
                let mobile = new Mobile();
                mobile.mobileId = message.mobileId;
                mobile.mailboxId = mailbox.mailboxId;
                mobile.mobileWakeupPeriod = message.mobileWakeupPeriod;
                let mobileFilter = { mobileId: message.mobileId };
                let { id: id2, created: newMobile } = await database.upsert(mobile.toDb(), mobileFilter);
                if (newMobile) {
                  logger.info(`Mobile ${mobile.mobileId} added to database (${id2})`);
                  emitter.emit('NewMobile', `New mobile ${mobile.mobileId} found when submitting message ${message.messageId}`);
                }
              }
            }
          }
        } else {
          logger.warn(`No submission accepted`);
        }
      } else {
        await dbUtilities.handleApiError(apiCallLog);
        logger.error(`Get forward messages failed with cause ${apiCallLog.error}`);
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
    if (req.query && req.query.messageId) {
      await getMessage(req.query.messageId);
    }
  } catch (err) {
    console.error(err.stack);
    throw err;
  } finally {
    await database.close();
    logger.debug(`<<<< ${thisFunction.name} exit`);
  }
}