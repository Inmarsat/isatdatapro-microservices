/**
 * getMobiles module
 * @module getMobiles
 */
'use strict';

const logger = require('../infra/logging').loggerProxy(__filename);
const idpApi = require('isatdatapro-api');
const DatabaseContext = require('../infra/database/repositories');
const { getMailboxes, getMailboxGateway, handleApiResponse, handleApiFailure } = require('../infra/database/utilities');
const { ApiCallLog, Mobile } = require('../infra/database/models');
const event = require('../infra/eventHandler');

/**
 * Retrieves all Mobile metadata provisioned against a Mailbox
 * 
 * Emits event: ``NewMobile``
 * @param {string} satelliteGatewayName Shorthand name of the network gateway
 * @param {(number|string)} mailboxId Unique Mailbox ID to retrieve from
 */
module.exports = async function(satelliteGatewayName, mailboxId) {
  const thisFunction = {name: logger.getModuleName(__filename)};
  logger.debug(`>>>> ${thisFunction.name} entry`);
  const database = new DatabaseContext();
  await database.initialize();
  const MAX_MOBILES = 1000;

  async function getMobiles(mailbox, nextMobileId) {
    const operation = 'getMobiles';
    const idpGateway = await getMailboxGateway(database, mailbox);
    const auth = {
      accessId: mailbox.accessId,
      password: mailbox.passwordGet(),
    };
    let filter = { pageSize: MAX_MOBILES };
    if (nextMobileId) { filter.mobileId = nextMobileId }
    const callTimeUtc = new Date().toISOString();
    let apiCallLog = new ApiCallLog(operation, 
        idpGateway.name, mailbox.mailboxId, callTimeUtc);
    await Promise.resolve(idpApi.getMobileIds(auth, filter, idpGateway.url))
    .then(async function (result) {
      let success = await handleApiResponse(database,
          result.errorId, apiCallLog, idpGateway);
      if (success) {
        if (result.mobiles.length > 0) {
          logger.debug(`Found ${result.mobiles.length} mobiles`
              + ` for mailbox ${mailbox.mailboxId}`);
          if (result.mobiles.length === MAX_MOBILES) {
            nextMobileId = result.mobiles[MAX_MOBILES-1].mobileId;
          } else {
            nextMobileId = null;
          }
          for (let m = 0; m < result.mobiles.length; m++) {
            let mobile = new Mobile();
            await mobile.fromApi(result.mobiles[m]);
            mobile.mailboxId = mailbox.mailboxId;
            let mobileFilter = { mobileId: mobile.mobileId };
            let { id, changeList, created } =
                await database.upsert(mobile, mobileFilter);
            if (!created) {
              if (changeList) {
                logger.info(`Updated mobile ${mobile.mobileId} (${id}):`
                    + ` ${JSON.stringify(changeList)}`);
              } else {
                logger.debug(`No updates to mobile ${mobile.mobileId} (${id})`);
              }
            } else {
              logger.debug(`Added mobile ${mobile.mobileId} (${id})`);
              event.newMobile(mobile);
            }
          }
        } else {
          logger.warn(`No mobiles found for mailbox ${mailbox.mailboxId}`);
        }
      }
    })
    .catch(async (err) => {
      let apiOutage =
          await handleApiFailure(database, err, idpGateway, operation);
      if (!apiOutage) {
        logger.error(err.stack);
        throw err;
      }
    });
    await database.upsert(apiCallLog);
    if (typeof(nextMobileId) === 'string') {
      await getMobiles(mailbox, nextMobileId);
    }
  }

  try {
    let mailboxes =
        await getMailboxes(database, satelliteGatewayName, mailboxId);
    if (mailboxes instanceof Array) {
      for (let m = 0; m < mailboxes.length; m++) {
        await getMobiles(mailboxes[m])
      }
    } else if (typeof(mailboxes) !== 'undefined') {
      await getMobiles(mailboxes);
    } else {
      logger.warn(`Mailbox not found matching mailboxId=${filterMailbox}`
          + ` or satelliteGateway=${filterGateway}`);
    }
  } catch (err) {
    logger.error(err.stack);
    throw err;
  } finally {
    await database.close();
    logger.debug(`<<<< ${thisFunction.name} exit`);
  }
}