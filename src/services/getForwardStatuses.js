'use strict';

const idpApi = require('isatdatapro-api');
//const codec = require('../codec/modemMessageParser');
const DatabaseContext = require('../infra/database/repositories/azureCosmosRepository');
const dbUtilities = require('../infra/database/utilities');
const ApiCallLog = require('../infra/database/models/apiCallLog');
const ForwardMessage = require('../infra/database/models/messageForward');
const Mobile = require('../infra/database/models/mobile');
const emitter = require('../infra/eventHandler/emitter');

module.exports = async function(context) {
  const thisFunction = {name: logger.getModuleName(__filename)};
  logger.debug(`>>>> ${thisFunction.name} entry`);
  const callTime = new Date().toISOString();
  const database = new DatabaseContext();
  await database.initialize();
  let idpGateway;

  /**
   * Retrieves Forward message statuses using high water mark
   * @param {Mailbox} mailbox The mailbox entity to query
   * @param {object} [filter] Optional filter parameters
   */
  async function getStatuses(mailbox, filter) {
    const operation = 'getForwardStatuses';
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
    //logger.log(`Getting status for messages ${JSON.stringify(filter)}`);
    await Promise.resolve(idpApi.getForwardStatuses(auth, filter, idpGateway.url))
    .then(async function (result) {
      //logger.debug(`getForwardStatuses result: ${JSON.stringify(result)}`);
      let success = await dbUtilities.handleApiResponse(database, result.errorId, apiCallLog, idpGateway);
      if (success) {
        if (result.nextStartTimeUtc !== '') {
          apiCallLog.nextStartTimeUtc = result.nextStartTimeUtc;
        } else {
          // next time catch any messages that might have been "just missed"
          apiCallLog.nextStartTimeUtc = callTimeUtc;
        }
        apiCallLog.nextStartId = result.nextStartId;
        if (result.statuses) {
          logger.log(`Retrieved ${result.statuses.length} statuses for mailbox ${mailbox.mailboxId}`);
          apiCallLog.messageCount = result.statuses.length;
          for (let s=0; s < result.statuses.length; s++) {
            let message = new ForwardMessage();
            await message.populate(result.statuses[s]);
            message.mailboxId = mailbox.mailboxId;
            let messageFilter = { messageId: message.messageId };
            let id = await database.exists(message.toDb(), messageFilter);
            if (id) {
              let dbMessage = new ForwardMessage();
              let dbMessageContent = await database.read(id, message.category);
              dbMessage.fromDb(dbMessageContent);
              if (dbMessage.state !== message.state) {
                let newState = message.getStateName();
                let newStateReason = message.getStateReason();
                logger.log(`Message ${message.messageId} ${newState} ${newStateReason}`);
                //TODO: notify completion or failure probably via Event queue
                dbMessage.updateStatus(message);
                dbMessage.id = id;
                let res = await database.update(dbMessage.toDb());
              }
            } else {
              let { created: sentByAnother } = await database.upsert(message.toDb(), messageFilter);
              if (sentByAnother) {
                logger.warn(`Mobile Terminated message ${message.messageId} not found in database`);
                //TODO getForwardMessage probably via Event queue (somebody else sent one)
                emitter.emit('OtherForwardMessage', `New Forward message status ${message.messageId}`);
              }
            }
          }
          if (result.more) {
            moreToRetrieve = { startMessageId: result.nextStartId };
          }
        } else {
          logger.log(`No Statuses to retriveve from Mailbox ${mailbox.mailboxId}`);
        }
      } else {
        await dbUtilities.handleApiError(apiCallLog);
        logger.error(`Get forward statuses failed with reason ${apiCallLog.error}`);
      }
    })
    .catch(async function (err) {
      let apiOutage = await dbUtilities.handleApiTimeout(err, idpGateway);
      if (!apiOutage) {
        logger.error(err);
        throw err;
      }
    });
    await database.create(apiCallLog.toDb());
    if (moreToRetrieve) {
      getStatuses(mailbox, moreToRetrieve);
    }
  }

  if (typeof(timer) !== 'undefined') {
    let descriptor = timer.IsPastDue ? 'timer past due!' : `timer triggered at ${callTime}`
    logger.log(`${thisFunction.name} ${descriptor}`);
  } else {
    logger.log(`${thisFunction.name} triggered without timer at ${callTime}`);
  }
  
  try {
    const mailboxes = await dbUtilities.getMailboxes(database);
    for (let m=0; m < mailboxes.length; m++) {
      let activeMailbox = mailboxes[m];
      await getStatuses(activeMailbox);
    }
  } catch (err) {
    switch(err.message) {
      default:
        logger.error(err.stack);
        console.trace();
        throw err;
    }
  } finally {
    await database.close();
    logger.debug(`<<<< ${thisFunction.name} exit`);
  }
}