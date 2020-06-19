'use strict';
const config = require('../../../../config/local.settings.json').database;
const logger = require('../../logger').loggerProxy(__filename);
// TODO: robust generic config file
const CosmosClient = require('@azure/cosmos').CosmosClient;
const propertyConversion = require('../utilities/propertyConversion');

const endpoint = config.endpoint;
const key = config.key;
const databaseId = config.databaseId;
const containerId = config.containerId;
const partitionKey = config.partitionKey;
const throughput = config.throughput;


function DatabaseContext() {
  this.type = 'CosmosDB';
  this.connection = new CosmosClient({ endpoint, key });
  this.isInitialized = false;
}

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
    if (err) { logger.error(err); }
  }
}

/**
 * @param {string} category 
 * @param {object} filter key/value pairs for equality filtering
 * @param {object} options e.g. { limit: 1, desc: 'dbTimestamp' }
 * @returns {object} a list of row objects matching the criteria
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
  const { resources: items } = await this.container.items
    .query(querySpec).fetchAll();
  /*
  items.forEach(item => {
    logger.debug(`Found ${item.id}: ${JSON.stringify(item)}`);
  });
  */
  return items;
}

/**
 * Returns true if the item is found in the database based on filter criteria
 * If no filter is provided, all properties save id will be criteria
 * @param {object} item Item to check in the database
 * @param {object} [filterOn] Optional property name to use as filter criteria
 * @returns {string|boolean} item.id if found or false
 * @throws {Error} if more than one match is found
 */
DatabaseContext.prototype.exists = async function(item, filterOn) {
  if (!this.isInitialized) { throw new Error('DatabaseContext not initialized') }
  const category = item.category;
  let filter = {};
  if (!filterOn) {
    filter = Object.assign(filter, item);
    delete filter.id;   //: invalid duplicate criteria
  } else {
    filter = filterOn;
  }
  filter = propertyConversion.dbFilter(filterOn);
  // TODO: should be able to query and add objects/arrays to Cosmos or query JSON.stringified
  for (let prop in filter) {
    if (item.hasOwnProperty(prop) && typeof(filter[prop]) === 'string') {
      try {
        let isObject = JSON.parse(filter[prop]);
        logger.warn(`Removing object ${category}.${prop} from exists/find filter`);
        delete filter[prop];
      } catch (err) {
        if (err.message.includes('in JSON at position')) {
          //: property remains a filter
        } else {
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
      return matches[0].id;
    } else {
      throw new Error(`Multiple duplicates found with ${JSON.stringify(filter)}`);
    }
  }
  return false;
}

/**
 * @param {object} newItem 
 * @returns {number} created item id
 */
DatabaseContext.prototype.create = async function(newItem) {
  if (!this.isInitialized) { throw new Error('DatabaseContext not initialized') }
  const { resource: createdItem } = await this.container.items.upsert(newItem);
  //logger.debug(`Item ${createdItem.id} inserted into database`);
  return { id: createdItem.id, category: createdItem.category };
}

/**
 * @param {object} newItem The item to look for in the database
 * @param {object} [filterOn] Optional filter on properties defining "exists"
 * @returns {object} {id, category, created}
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
 * @param {string} id The id in the collection
 * @param {string} category The category in the collection
 * @returns {object} The item from the collection
 */
DatabaseContext.prototype.read = async function(id, category) {
  if (!this.isInitialized) { throw new Error('DatabaseContext not initialized') }
  const { resource: item } = await this.container
    .item(id, category).read();
  //logger.debug(`Item ${id}: ${JSON.stringify(item)}`);
  return item;
}

/**
 * Updates an existing entity in the database
 * @param {object} item The item to update (must exist in db)
 * @returns {object} { updatedItem, changeCount }
 */
DatabaseContext.prototype.update = async function(item) {
  if (!this.isInitialized) { throw new Error('DatabaseContext not initialized') }
  let changeCount = 0;
  if (item.id) {
    const oldItem = await this.read(item.id, item.category);
    let { resource: updatedItem } = await this.container
      .item(item.id, item.category)
      .replace(item);
    for (let prop in oldItem) {
      if (oldItem.hasOwnProperty(prop) && prop[0] !== '_') {
        if (updatedItem.hasOwnProperty(prop)) {
          if (oldItem[prop] !== updatedItem[prop]) {
            changeCount += 1;
          }
        } else {
          changeCount += 1;
        }
      }
    }
    //logger.debug(`Item ${updatedItem.id} updated ${changeCount} properties`);
  } else {
    throw new Error('Update must include unique id');
  }
  return { id: item.id, changeCount: changeCount };
}

/**
 * Updates an existing entity in the database or creates a new one
 * @param {object} item The item to update (must exist in db)
 * @param {object} [filterOn] Optional filter on properties defining "exists"
 * @returns {object} { updatedItem, changeCount }
 */
DatabaseContext.prototype.upsert = async function(item, filterOn) {
  if (!this.isInitialized) { throw new Error('DatabaseContext not initialized') }
  let changeCount = 0;
  let { id, category, created } = await this.createIfNotExists(item, filterOn);
  if (!created) {
    item.id = id;
    const oldItem = await this.read(id, category);
    const { resource: updatedItem } = await this.container
      .item(id, category)
      .replace(item);
    for (let prop in oldItem) {
      if (oldItem.hasOwnProperty(prop) && prop[0] !== '_') {
        if (updatedItem.hasOwnProperty(prop)) {
          if (oldItem[prop] !== updatedItem[prop]) {
            changeCount += 1;
            logger.debug(`${category} ${prop} updated (${id})`);
          }
        } else {
          changeCount += 1;
          logger.debug(`${category} ${prop} updated (${id})`);
        }
      }
    }
    //logger.debug(`Item ${updatedItem.id} updated ${changeCount} properties`);
  } else {
    logger.debug(`${category} added to database (${id})`);
  }
  return { id: id, changeCount: changeCount, created: created };
}

/**
 * @param {string} id The id in the collection
 * @param {string} category The category in the collection
 * @returns {object} result
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
