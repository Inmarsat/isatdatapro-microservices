'use strict';

const logger = require('../infra/logger').loggerProxy(__filename);
const idpApi = require('isatdatapro-api');
const DatabaseContext = require('../infra/database/repositories');
const dbUtilities = require('../infra/database/utilities');
const ApiCallLog = require('../infra/database/models/apiCallLog');
const ForwardMessage = require('../infra/database/models/messageForward');
const event = require('../infra/eventHandler');

module.exports = async function(context) {
  const thisFunction = {name: logger.getModuleName(__filename)};
  logger.debug(`>>>> ${thisFunction.name} entry`);
  const callTime = new Date().toISOString();
  const database = new DatabaseContext();
  await database.initialize();

  /**
   * Retrieves Forward message statuses using high water mark
   * @param {Mailbox} mailbox The mailbox entity to query
   * @param {object} [filter] Optional filter parameters
   */
  async function getStatuses(mailbox, filter) {
    const operation = 'getForwardStatuses';
    const idpGateway = await dbUtilities.getMailboxGateway(database, mailbox);
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
    //logger.debug(`Getting status for messages ${JSON.stringify(filter)}`);
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
          logger.debug(`Retrieved ${result.statuses.length} statuses for mailbox ${mailbox.mailboxId}`);
          apiCallLog.messageCount = result.statuses.length;
          for (let s=0; s < result.statuses.length; s++) {
            const status = result.statuses[s];
            let message = new ForwardMessage();
            await message.populate(status);
            message.updateStatus(status);
            message.mailboxId = mailbox.mailboxId;
            let messageFilter = { messageId: message.messageId };
            let { id, changeList, created } = await database.upsert(message.toDb(), messageFilter);
            if (!created) {
              logger.debug(`State change list: ${JSON.stringify(changeList)}`);
              if (changeList && 'state' in changeList) {
                let newState = message.getStateName();
                let newStateReason = message.getStateReason();
                logger.info(`Message ${message.messageId} ${newState} ${newStateReason}`);
                event.forwardMessageStateChange(message.messageId, newStateReason, message.mobileId);
              }
            } else {
              // implies that another API client submitted, trigger event that can get the submission
              logger.warn(`New Forward message ${message.messageId}from unknown IOP API client`);
              event.otherClientForwardSubmission(message.messageId, message.mailboxId);
            }
          }
          if (result.more) {
            moreToRetrieve = { startMessageId: result.nextStartId };
          }
        } else {
          logger.debug(`No Statuses to retriveve from Mailbox ${mailbox.mailboxId}`);
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
        throw err;
    }
  } finally {
    await database.close();
    logger.debug(`<<<< ${thisFunction.name} exit`);
  }
}