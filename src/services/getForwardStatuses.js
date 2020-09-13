'use strict';

const logger = require('../infra/logging').loggerProxy(__filename);
const { getForwardStatuses } = require('isatdatapro-api');
const DatabaseContext = require('../infra/database/repositories');
const { getMailboxes, getMailboxGateway, getHighwatermark, handleApiResponse, handleApiFailure } = require('../infra/database/utilities');
const { ApiCallLog, MessageForward } = require('../infra/database/models');
const event = require('../infra/eventHandler');

/**
 * Retrieves all outstanding forward message statuses from all Mailboxes
 * Emits events for ForwardMessageStateChange, OtherClientForwardSubmission
 */
module.exports = async function() {
  const thisFunction = {name: logger.getModuleName(__filename)};
  logger.debug(`>>>> ${thisFunction.name} entry`);
  const database = new DatabaseContext();
  await database.initialize();

  /**
   * Retrieves Forward message statuses using high water mark
   * @param {Mailbox} mailbox The mailbox entity to query
   * @param {object} [filter] Optional filter parameters
   */
  async function getStatuses(mailbox, filter) {
    const operation = 'getForwardStatuses';
    const idpGateway = await getMailboxGateway(database, mailbox);
    const auth = {
      accessId: mailbox.accessId,
      password: mailbox.passwordGet(),
    };
    if (!filter) {
      filter = await getHighwatermark(database, 
          mailbox.mailboxId, operation);
    }
    const callTimeUtc = new Date().toISOString();
    let moreToRetrieve = null;
    let apiCallLog = new ApiCallLog(operation, idpGateway.name,
        mailbox.mailboxId, callTimeUtc);
    await Promise.resolve(getForwardStatuses(auth, filter, idpGateway.url))
    .then(async function (result) {
      let success = await handleApiResponse(database, result.errorId,
          apiCallLog, idpGateway);
      if (success) {
        apiCallLog.nextStartTimeUtc = result.nextStartTimeUtc;
        if (result.statuses) {
          logger.debug(`Retrieved ${result.statuses.length} statuses`
              + ` for mailbox ${mailbox.mailboxId}`);
          apiCallLog.messageCount = result.statuses.length;
          for (let s=0; s < result.statuses.length; s++) {
            const status = result.statuses[s];
            let message = new MessageForward();
            await message.fromApi(status);
            message.updateStatus(status);
            message.mailboxId = mailbox.mailboxId;
            const messageFilter = { messageId: message.messageId };
            let { changeList, created } =
                await database.upsert(message, messageFilter);
            if (!created) {
              logger.debug(`State change list: ${JSON.stringify(changeList)}`);
              //TODO: may be a smarter way to avoid the second database read
              const findMessage =
                  await database.find(message.category, messageFilter);
              if (findMessage.length > 0) {
                message = findMessage[0];
              }
              if (changeList && 'state' in changeList) {
                let newState = message.getStateName();
                let newStateReason = message.getStateReason();
                logger.info(`Message ${message.messageId}`
                    + ` ${newState} ${newStateReason}`);
                event.forwardMessageStateChange(message.messageId, 
                    newState, newStateReason, message.mobileId);
              }
            } else {
              // implies that another API client submitted, trigger event that can get the submission
              logger.warn(`New Forward message ${message.messageId} from`
                  + ` unknown IDP API client on mailbox ${message.mailboxId}`);
              event.otherClientForwardSubmission(message.messageId, 
                  message.mailboxId);
            }
          }
          if (result.more) {
            moreToRetrieve = { startMessageId: result.nextStartId };
          }
        } else {
          logger.debug(`No Statuses to retrieve`
              + ` from Mailbox ${mailbox.mailboxId}`);
        }
      }
    })
    .catch(async function (err) {
      let apiOutage = await handleApiFailure(err, idpGateway);
      if (!apiOutage) {
        logger.error(err);
        throw err;
      }
    });
    await database.upsert(apiCallLog);
    if (moreToRetrieve) {
      getStatuses(mailbox, moreToRetrieve);
    }
  }

  try {
    const mailboxes = await getMailboxes(database);
    for (let m=0; m < mailboxes.length; m++) {
      let activeMailbox = mailboxes[m];
      await getStatuses(activeMailbox);
    }
  } catch (err) {
    logger.error(err.stack);
    throw err;
  } finally {
    await database.close();
    logger.debug(`<<<< ${thisFunction.name} exit`);
  }
}