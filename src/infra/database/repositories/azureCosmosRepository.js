//: Database operations for Cosmos DB
'use strict';

require('dotenv').config();
const logger = require('../../logging').loggerProxy(__filename);
const { modelToDb, modelFromDb, dbFilter } = require('./propertyConversion');

const CosmosClient = require('@azure/cosmos').CosmosClient;
const endpoint = process.env.COSMOS_DB_HOST;
const key = process.env.COSMOS_DB_PASS;
const databaseId = process.env.COSMOS_DB_NAME;
const containerId = process.env.COSMOS_DB_CONTAINER;
const partitionKey = {
  "kind": "Hash",
  "paths": [`/${process.env.COSMOS_DB_PARTITION}`]
};
const throughput = process.env.COSMOS_DB_THROUGHPUT;

/**
 * Creates a Cosmos DB connection
 * @constructor
 */
function DatabaseContext() {
  this.type = 'CosmosDB';
  this.connection = new CosmosClient({ endpoint, key });
  this.isInitialized = false;
}

/**
 * Initializes the database if/as required
 */
DatabaseContext.prototype.initialize = async function () {
  try {
    const databaseResponse = await this.connection.databases
      .createIfNotExists({ id: databaseId });
    if (databaseResponse.statusCode === 201) {
      logger.debug(`Database ${databaseId} created`);
    } else if (databaseResponse.statusCode === 200) {
      logger.debug(`Database ${databaseId} found`);
    }
    this.database = this.connection.database(databaseId);
    const containerResponse = await this.database.containers
        .createIfNotExists(
        { id: containerId, partitionKey: partitionKey, defaultTtl: -1 },
        { offerThroughput: throughput });
    if (containerResponse.statusCode === 201) {
      logger.debug(`Container ${containerId} created`);
    } else if (containerResponse.statusCode === 200) {
      logger.debug(`Container ${containerId} found`);
    }
    this.container = this.database.container(containerId);
    this.isInitialized = true;
  } catch (e) {
    logger.error(e.stack);
  }
}

/**
 * Returns database entries matching a criteria
 * @param {string} category 
 * @param {Object} [include] key/value pairs for equality filtering
 * @param {Object} [exclude] key/value pairs for inequality filtering
 * @param {Object} [options] e.g. { limit: 1, desc: 'dbTimestamp' }
 * @param {number} [options.limit] Maximum items to return
 * @param {string} [options.desc] Property to sort descending (e.g. _ts timestamp)
 * @param {string} [options.asc] Property to sort descending (e.g. _ts timestamp)
 * @returns {Object[]} a list of row objects matching the criteria
 * @throws {Error} if database not initialized
 * @throws {Error} if category is invalid
 */
DatabaseContext.prototype.find =
    async function (category, include, exclude, options) {
  if (!this.isInitialized) throw new Error('DatabaseContext not initialized');
  if (!category || typeof (category) !== 'string') {
    throw new Error(`Invalid category ${category}`);
  }
  let limit = '';
  let order = '';
  if (options) {
    if (options.limit && typeof (options.limit) === 'number') {
      limit = `TOP ${options.limit} `;
    }
    if (options.desc) {
      // TODO: validate that key exists in model (based on category)
      let k = options.desc;
      if (k === 'dbTimestamp') k = '_ts';
      order = ` ORDER BY c.${k} DESC`;
    } else if (options.asc) {
      let k = options.asc;
      if (k === 'dbTimestamp') k = '_ts';
      order = ` ORDER BY c.${k} ASC`;
    }
  }
  const querySpec = {
    query: `SELECT ${limit}* FROM c WHERE c.category="${category}"`,
  };
  if (include) {
    include = dbFilter(include);
    for (let k in include) {
      if (include.hasOwnProperty(k)) {
        let v = include[k];
        if (typeof (v) === 'string') v = `"${v}"`;
        querySpec.query += ` AND c.${k}=${v}`;
      }
    }
  }
  if (exclude) {
    exclude = dbFilter(exclude);
    for (let k in exclude) {
      if (exclude.hasOwnProperty(k)) {
        let v = exclude[k];
        if (typeof (v) === 'string') v = `"${v}"`;
        querySpec.query += ` AND c.${k}<>${v}`;
      }
    }
  }
  querySpec.query += `${order}`;
  const { resources: items } =
      await this.container.items.query(querySpec).fetchAll();
  logger.debug(`Found ${items.length} matching ${category}(s)`);
  const entities = [];
  items.forEach(item => {
    entities.push(modelFromDb(item, true));
  });
  return entities;
}

/**
 * Updates an existing entity in the database or creates a new one.
 * Null and undefined values are not pushed in an update.
 * If the item includes a .newest prototype property it will discard 
 * update if older than that property in the database entity.
 * @param {Object} item The item to upsert
 * @param {Object} [filterOn] Optional filter on properties defining "exists"
 * @param {Object} [newerThan] Optional filter on properties involving timestamp
 * @returns {{ id: string, changeList: Object, created: boolean }}
 * @throws {Error} if database not initialized
 * @throws {Error} if item.category is invalid
 * @throws {Error} if filterOn is not an Object
 * @throws {Error} if multiple matching entries found in database
 */
DatabaseContext.prototype.upsert = async function (item, filterOn) {
  if (!this.isInitialized) throw new Error('DatabaseContext not initialized');
  if (!item.category || typeof (item.category) !== 'string') {
    throw new Error(`Invalid category ${item.category}`);
  }
  let created = false;
  let id;
  let dbItem;
  let changeList = null;
  if (!filterOn && item.unique) {
    filterOn = {};
  } else if (filterOn && !(typeof filterOn === 'object')) {
    throw new Error(`filterOn must be Object`);
  }
  if (item.unique) {
    filterOn[item.unique] = item[item.unique];
  }
  const found = await this.find(item.category, filterOn);
  if (found.length === 0) {
    created = true;
    dbItem = item;
  } else if (found.length > 1) {
    const errStr = (`${found.length} ${item.category} entities matching`
      + ` ${JSON.stringify(filterOn)}`);
    logger.error(errStr);
    throw new Error(errStr);
  } else {
    changeList = {};
    dbItem = found[0];
    id = dbItem.id;
    const revert = Object.assign({}, dbItem);
    for (const prop in dbItem) {
      if (dbItem.hasOwnProperty(prop) && item.hasOwnProperty(prop)) {
        //TODO: check if Object/JSON and Array work
        if (typeof item[prop] === 'undefined' || item[prop] === null) continue;
        if (item.newest && prop.includes(item.newest)) {
          let dbTime = new Date(dbItem[prop]);
          let itemTime = new Date(item[prop]);
          if (dbTime > itemTime) {
            logger.warn(`Discarding ${item.category} update as ${prop}`
                + ` in database ${dbTime} is newer than ${itemTime}`);
            dbItem = revert;
            changeList = null;
            break;
          }
        }
        if (typeof item[prop] === 'object') {
          if (JSON.stringify(dbItem[prop]) === JSON.stringify(item[prop])) {
            continue;
          }
        }
        if (dbItem[prop] == item[prop]) continue;
        changeList[prop] = {
          old: dbItem[prop],
          new: item[prop]
        };
        dbItem[prop] = item[prop];
      }
    }
    if (Object.keys(changeList).length === 0) changeList = null;
  }
  if (created || changeList) {
    try {
      const { resource: createdItem } =
          await this.container.items.upsert(modelToDb(dbItem));
      id = createdItem.id;
    } catch (e) {
      logger.error(e.stack);
    }
  }
  if (created) {
    logger.debug(`Inserted ${item.category} (${id})`);
  } else if (changeList) {
    logger.debug(`Updated ${item.category} ${JSON.stringify(changeList)}`);
  } else {
    logger.debug(`No updates to ${item.category} (${id})`);
  }
  return { id: id, changeList: changeList, created: created };
}

/**
 * Deletes an item from the database
 * @param {Object} item The category in the collection
 * @returns {boolean} result
 * @throws {Error} if database not initialized
 * @throws {Error} if item.category is invalid
 */
DatabaseContext.prototype.delete = async function (item) {
  if (!this.isInitialized) throw new Error('DatabaseContext not initialized');
  if (!item.category || typeof (item.category) !== 'string') {
    throw new Error(`Invalid category ${item.category}`);
  }
  const filterOn = {};
  filterOn[item.unique] = item[item.unique];
  const found = await this.find(item.category, filterOn);
  if (found.length === 1) {
    try {
      const itemResponse = await this.container
        .item(found[0].id, item.category)
        .delete();
      if (itemResponse.resource === null && itemResponse.statusCode === 204) {
        logger.debug(`Deleted 1 ${item.category}(s)`);
        return true;
      }
    } catch (e) {
      logger.error(e.stack);
    }
  }
  return false;
}

/**
 * Closes the database connection (null op for Cosmos DB)
 */
DatabaseContext.prototype.close = async function () {
  logger.debug('Success: close operation not required on Cosmos DB');
}

module.exports = DatabaseContext;
