'use strict';
require('dotenv').config();
const logger = require('../../logging').loggerProxy(__filename);
//TODO: migrate toDb and fromDb operations from model into repository
const models = require('../models');
//const categories = require('../models/categories.json');
const { toDb, fromDb, dbFilter } = require('../utilities/propertyConversion');

const CosmosClient = require('@azure/cosmos').CosmosClient;
const endpoint = process.env.DB_HOST;
const key = process.env.DB_PASS;
const databaseId = process.env.DB_NAME;
const containerId = process.env.DB_CONTAINER;
const partitionKey = { "kind": "Hash", "paths": [`/${process.env.DB_PARTITION}`] };
const throughput = process.env.DB_THROUGHPUT;

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
DatabaseContext.prototype.initialize = async function() {
  try {
    const databaseResponse = await this.connection.databases
      .createIfNotExists({ id: databaseId });
    if (databaseResponse.statusCode === 201) {
      logger.debug(`Database ${databaseId} created`);
    } else if (databaseResponse.statusCode === 200) {
      logger.debug(`Database ${databaseId} found`);
    }
    this.database = this.connection.database(databaseId);
    const containerResponse = await this.database.containers.createIfNotExists(
      { id: containerId, partitionKey: partitionKey, defaultTtl: -1 },
      { offerThroughput: throughput }
    );
    if (containerResponse.statusCode === 201) {
      logger.debug(`Container ${containerId} created`);
    } else if (containerResponse.statusCode === 200) {
      logger.debug(`Container ${containerId} found`);
    }
    this.container = this.database.container(containerId);
    this.isInitialized = true;
  } catch (err) {
    logger.error(err);
  }
}

function modelFromDb(dbItem, includeUuid) {
  const category = dbItem.category;
  let model = null;
  for (const modelName in models) {
    if (category === models[modelName].prototype.category) {
      model = new models[modelName];
      break;
    }
  }
  if (!model) throw new Error(`No model found for ${category}`);
  const modelProperties = Object.getOwnPropertyNames(model);
  modelProperties.forEach(prop => {
    const dbProp = toDb(prop);
    if (model.hasOwnProperty(prop) && dbItem.hasOwnProperty(dbProp)) {
      const { modelValue } = fromDb(dbProp, dbItem[dbProp]);
      model[prop] = modelValue;
    }
  });
  if (includeUuid) model.uuid = dbItem.id;
  return model;
}

function modelToDb(item) {
  const dbItem = {};
  const itemProperties = Object.getOwnPropertyNames(item);
  itemProperties.forEach(prop => {
    if (item.hasOwnProperty(prop)) {
      const { dbProp, dbValue } = toDb(prop, item[prop]);
      dbItem[dbProp] = dbValue;
    }
  });
  return dbItem;
}

/**
 * Returns database entries matching a criteria
 * @param {string} category 
 * @param {Object} filter key/value pairs for equality filtering
 * @param {Object} options e.g. { limit: 1, desc: 'dbTimestamp' }
 * @returns {Object[]} a list of row objects matching the criteria
 */
DatabaseContext.prototype.find = async function(category, filter, options) {
  if (!this.isInitialized) { throw new Error('DatabaseContext not initialized') }
  let limit = '';
  let order = '';
  if (options) {
    if (options.limit && typeof(options.limit) === 'number') {
      limit = `TOP ${options.limit} `;
    }
    if (options.desc) {
      // TODO: validate that key exists in category
      let k = options.desc;
      if (k === 'dbTimestamp') { k = '_ts'; }
      order = ` ORDER BY c.${k} DESC`;
    } else if (options.asc) {
      let k = options.asc;
      if (k === 'dbTimestamp') { k = '_ts'; }
      order = ` ORDER BY c.${k} ASC`;
    }
  }
  const querySpec = {
    query: `SELECT ${limit}* FROM c`,
  };
  if (typeof(category) === 'string') {
    querySpec.query += ` WHERE c.category = "${category}"`;
  }
  if (filter) {
    filter = dbFilter(filter);
    //: iterate key/value pairs adding query filters
    for (let k in filter) {
      if (filter.hasOwnProperty(k)) {
        let v = filter[k];
        if (typeof(v) === 'string') { v = `"${v}"` }
        querySpec.query += ` AND c.${k} = ${v}`;
      }
    }
  }
  querySpec.query += `${order}`;
  const { resources: items } = await this.container
    .items.query(querySpec).fetchAll();
  const entities = [];
  items.forEach(item => {
    //logger.debug(`Found ${item.id}: ${JSON.stringify(item)}`);
    entities.push(modelFromDb(item, true));
  });
  return entities;
}

/**
 * Returns true if the item is found in the database based on filter criteria
 * If no filter is provided, all properties save id will be criteria
 * @param {Object} item Item to check in the database
 * @param {Object} [filterOn] Optional property name to use as filter criteria
 * @returns {string|boolean} item.id if found or false
 * @throws {Error} if more than one match is found
 */
DatabaseContext.prototype.exists = async function(item, filterOn) {
  if (!this.isInitialized) { throw new Error('DatabaseContext not initialized') }
  const category = item.category;
  let filter = {};
  if (!filterOn) {
    filter = dbFilter(Object.assign(filter, item));
    delete filter.id;   //: invalid duplicate criteria
  } else {
    filter = dbFilter(filterOn);
  }
  // TODO: should be able to query and add objects/arrays to Cosmos or query JSON.stringified
  for (let prop in filter) {
    if (item.hasOwnProperty(prop) && typeof(filter[prop]) === 'string') {
      try {
        if (typeof(JSON.parse(filter[prop])) === 'object') {
          logger.warn(`Removing object ${category}.${prop} from exists/find filter`);
          delete filter[prop];
        }
      } catch (err) {
        if (err.message.includes('JSON')) {
          //: property remains a filter
        } else {
          err.message = `${category}.${prop}: ` + err.message;
          throw err;
        }
      }
    } else if (!item.hasOwnProperty(prop)) {
      throw new Error(`item does not contain property ${prop}`);
    }
  }
  // TODO? delete other metadata with _ or prototypes?
  const matches = await this.find(category, filter);
  if (matches.length > 0) {
    if (matches.length === 1) {
      return matches[0].uuid;
    } else {
      throw new Error(`Multiple duplicates found with ${JSON.stringify(filter)}`);
    }
  }
  return false;
}

/**
 * Creates a new entity in the database if the uniqueness filter is not matched
 * Note: this is a subset of upsert
 * @param {Object} newItem The item to look for in the database
 * @param {Object} [filterOn] Optional filter on properties defining "exists"
 * @returns {Object} {id, category, created}
 */
DatabaseContext.prototype.createIfNotExists = async function(newItem, filterOn) {
  if (!this.isInitialized) { throw new Error('DatabaseContext not initialized') }
  const exists = await this.exists(newItem, filterOn);
  if (!exists) {
    const { resource: createdItem } = await this.container.items.upsert(newItem);
    //logger.debug(`Item ${createdItem.id} inserted into database`);
    return { id: createdItem.id, category: createdItem.category, created: true };
  } else {
    return { id: exists, category: newItem.category, created: false };
  }
}

/**
 * Returns a specific entity from the database
 * @param {string} id The id in the collection
 * @param {string} category The category in the collection
 * @returns {Object} The item from the collection
 */
DatabaseContext.prototype.read = async function(id, category) {
  if (!this.isInitialized) { throw new Error('DatabaseContext not initialized') }
  const { resource: item } = await this.container
    .item(id, category).read();
  //logger.debug(`Item ${id}: ${JSON.stringify(item)}`);
  return item;
}

/**
 * Updates an existing entity in the database or creates a new one.
 * Null and undefined values are not pushed in an update.
 * If the item includes a timestamp field indicated by _utc it will discard update if
 * older than that property in the database entity.
 * TODO: update function to 
 * @param {Object} item The item to upsert
 * @param {Object} [filterOn] Optional filter on properties defining "exists"
 * @param {Object} [newerThan] Optional filter on properties involving timestamp
 * @returns {Object} { id, changeCount, created }
 */
DatabaseContext.prototype.upsert = async function(item, filterOn) {
  if (!this.isInitialized) throw new Error('DatabaseContext not initialized');
  const newItem = Object.assign({}, modelToDb(item));
  let changeCount = 0;
  let changeList = null;
  let { id, category, created } = await this.createIfNotExists(newItem, filterOn);
  if (!created) {
    let dbItem = await this.read(id, category);
    let revert = Object.assign({}, dbItem);
    changeList = {};
    for (const prop in dbItem) {
      if (dbItem.hasOwnProperty(prop) && newItem.hasOwnProperty(prop)) {
          if (dbItem[prop] != newItem[prop]
              && newItem[prop] !== null
              && typeof(newItem[prop]) !== 'undefined') {
            //if (prop.includes('_utc')) {
            if (item.newest && prop.includes(toDb(item.newest))) {
              let dbTime = new Date(dbItem[prop]);
              let itemTime = new Date(newItem[prop]);
              if (dbTime > itemTime) {
                logger.warn(`Discarding update as ${prop} in database ${dbTime} is newer than ${itemTime}`);
                dbItem = revert;
                changeCount = 0;
                changeList = null;
                break;
              }
            }
            changeList[prop] = {
              old: dbItem[prop],
              new: newItem[prop]
            };
            dbItem[prop] = newItem[prop];
            changeCount += 1;
          }
      }
    }
    const { resource: updatedItem } = await this.container
      .item(id, category)
      .replace(dbItem);
    // TODO: check which db metadata gets auto-updated e.g. _ts
    logger.debug(`${category} ${updatedItem.id} updated ${changeCount} properties`);
  } else {
    logger.debug(`${category} added to database (${id})`);
  }
  return { id: id, changeList: changeList, created: created };
}

/**
 * @param {string} id The id in the collection
 * @param {string} category The category in the collection
 * @returns {Object} result
 */
DatabaseContext.prototype.delete = async function(id, category) {
  if (!this.isInitialized) { throw new Error('DatabaseContext not initialized') }
  const itemResponse = await this.container
    .item(id, category)
    .delete();
  //logger.debug(`${category} item ${id} removed from database`);
  if (itemResponse.resource === null && itemResponse.statusCode === 204) {
    return true
  }
  return false;
}

DatabaseContext.prototype.close = async function() {
  logger.debug('Success: close operation not required on Cosmos DB');
}

module.exports = DatabaseContext;
