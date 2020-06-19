const config = require('../../../config/local.settings.json').database;
const CosmosClient = require('@azure/cosmos').CosmosClient;

const endpoint = config.endpoint;
const key = config.key;
const databaseId = config.databaseId;
const containerId = config.containerId;
const partitionKey = config.partitionKey;
const throughput = config.throughput;


function DatabaseContext() {
  this.type = 'CosmosDB';
  this.connnection = new CosmosClient({ endpoint, key });
  this.database = this.connnection.database(databaseId);
  this.container = this.database.container(containerId);
}

DatabaseContext.prototype.initialize = async function() {
  try {
    await this.connnection.databases.createIfNotExists(
      { id: databaseId }
    );
    await this.connnection.database(databaseId).containers.createIfNotExists(
      { id: containerId, partitionKey: partitionKey, defaultTtl: -1 },
      { offerThroughput: throughput }
    );
  } catch (err) {
    if (err) { console.error('Something bad happened'); }
  }
}

/**
 * @param {string} category 
 * @param {object} filter key/value pairs for equality filtering
 * @param {object} options e.g. { limit: 1, desc: 'dbTimestamp' }
 * @returns {object} a list of row objects matching the criteria
 */
DatabaseContext.prototype.find = async function(category, filter, options) {
  let limit = '';
  let order = '';
  if (options) {
    if (options.limit && typeof(options.limit) === 'Number') {
      limit = `TOP ${options.limit}`;
    }
    if (options.desc) {
      // TODO: validate that key exists in model
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
    query: `SELECT ${limit} * FROM c`,
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
    .query(querySpec)
    .fetchAll();
  items.forEach(item => {
    console.log(`Found ${item.id}: ${JSON.stringify(item)}`);
  });
  return items;
}

/**
 * @param {object} newItem 
 * @returns {number} created item id
 */
DatabaseContext.prototype.create = async function(newItem) {
  const { resource: createdItem } = await this.container.items.upsert(newItem);
  console.log(`Item ${createdItem.id} inserted into database`);
  return createdItem.id;
}

/**
 * @param {number|string} id The unique ID of the item in the collection
 * @returns {object} The item from the collection
 */
DatabaseContext.prototype.read = async function(id) {
  const { resource: item } = await this.container.item(id).read();
  console.log(`Item ${id}: ${JSON.stringify(item)}`);
  return item;
}

/**
 * @param {object} item
 * @returns {object} result
 */
DatabaseContext.prototype.update = async function(item) {
  const { resource: updatedItem } = await this.container
    .item(item.id, item.category)
    .replace(item);
  console.log(`Item ${updatedItem.id} updated`);
  return updatedItem;
}

/**
 * @param {object} item Object containing at least id and category
 * @returns {object} result
 */
DatabaseContext.prototype.delete = async function(item) {
  const { resource: result } = await this.container
    .item(item.id, item.category)
    .delete();
  console.log(`Item ${item.id} removed from database`);
  return result;
}

module.exports = DatabaseContext;
