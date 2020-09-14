//: Wraps mysql with promisify for query and end
'use strict';

const mysql = require('mysql');
const util = require('util');
require('dotenv').config();

const { logger } = require('../../logging');   //.loggerProxy(__filename);
const { modelToDb, modelFromDb, dbFilter, propToDb, isoToMySqlDate } = require('./propertyConversion');
const models = require('../models');

/**
 * Builds up a MySQL schema based on the model definitions
 * @private
 * @returns {object} schema
 */
function buildSchema() {
  const ignore = ['message'];
  const DEFAULT_VARCHAR = 50;
  const longProps = {
    'payload': 50000,
    'version': 100,
    'location': 150,
    'broadcastIds': 150,
    'url': 100,
  };
  const schema = {};
  for (const modelName in models) {
    try {
      const model = new models[modelName];
      if (model.category && !ignore.includes(model.category)) {
        const table = [];
        table.push('id INT NOT NULL AUTO_INCREMENT, PRIMARY KEY(id)');
        const propNames = Object.getOwnPropertyNames(model);
        propNames.forEach(propName => {
          const propVal = model[propName];
          let mySqlDef = `${propToDb(propName)}`;
          if (propName.includes('TimeUtc')) {
            //mySqlDef += ` DATETIME`;
            mySqlDef += ` VARCHAR(25)`;
          } else {
            switch(typeof propVal) {
              case 'boolean':
                mySqlDef += ` BOOLEAN`;
                break;
              case 'number':
                mySqlDef += ` INT`;
                break;
              default:
                let long = false;
                for (const prop in longProps) {
                  if (propName.includes(prop)) {
                    long = true;
                    break;
                  }
                }
                mySqlDef += long ? ` TEXT` : ` VARCHAR(${DEFAULT_VARCHAR})`;
            }
          }
          if (propVal !== null) {
            mySqlDef += ` NOT NULL`;
          } else {
            mySqlDef += ` DEFAULT NULL`;
          }
          table.push(mySqlDef);
        });
        table.push(`_ts DATETIME DEFAULT CURRENT_TIMESTAMP`
            + ` ON UPDATE CURRENT_TIMESTAMP`);
        schema[model.category] = table;
      }
    } catch (e) {
      if (e.message.includes('is not a constructor')) {
        logger.debug(`Skipping ${modelName} not a Model`);
        continue;
      } else {
        throw e;
      }
    }
  }
  return schema;
}

/**
 * DatabaseContext class
 * @constructor
 */
function DatabaseContext() {
  this.type = 'MySQL';
  this.conn = mysql.createConnection({
    host: process.env.MYSQL_DB_HOST,
    user: process.env.MYSQL_DB_USER,
    password: process.env.MYSQL_DB_PASS,
  });
  this.connect = util.promisify(this.conn.connect).bind(this.conn);
  this.query = util.promisify(this.conn.query).bind(this.conn);
  this.end = util.promisify(this.conn.end).bind(this.conn);
  this.isInitialized = false;
}
  
/**
 * Initializes the MySQL database if required
 */
DatabaseContext.prototype.initialize = async function() {
  const dbName = process.env.MYSQL_DB_NAME;
  let success = true;
  try {
    let exists =
        await this.query(`SHOW DATABASES LIKE "${dbName}"`);
    if (exists.length === 0) {
      const { protocol41: dbCreated } =
          await this.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
      if (dbCreated) {
        logger.info(`Created database ${dbName}`);
        const { protocol41: usingDb } = await this.query(`USE ${dbName}`);
        if (usingDb) {
          const schema = buildSchema();
          for (let tableName in schema) {
            if (schema.hasOwnProperty(tableName)) {
              let tQuery = `CREATE TABLE IF NOT EXISTS ${tableName}(`;
              const table = schema[tableName];
              for (let column=0; column < table.length; column++) {
                if (column > 0) tQuery += ', ';
                tQuery += table[column];
              }
              tQuery += ')';
              const { protocol41: tableCreated } = await this.query(tQuery);
              if (tableCreated) {
                logger.debug(`Created table ${tableName}`);
              } else {
                success = false;
                break;
                //throw new Error(`tableCreated failed`);
              }
            }
          }
        } else {
          success = false;
          //throw new Error(`usingDb failed`);
        }
      } else {
        success = false;
        //throw new Error(`dbCreated failed`);
      }
    } else {
      const { protocol41: usingDb } = await this.query(`USE ${dbName}`);
      logger.debug(`Using database ${dbName}`);
    }
  } catch (err) {
    success = false;
    logger.error(err.stack);
  } finally {
    if (success) {
      this.isInitialized = true;
    } else {
      const { protocol41: dbDeleted } =
          await this.query(`DROP DATABASE IF EXISTS ${dbName}`);
      if (!dbDeleted) {
        throw new Error(`Failed to initialize MySQL database`);
      }
    }
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
 * @param {Date} [older] Searches for records older than the Date
 * @returns {Object[]} a list of row objects matching the criteria
 * @throws {Error} if database not initialized
 * @throws {Error} if category is invalid
 */
DatabaseContext.prototype.find =
    async function(category, include, exclude, options, older) {
  if (!this.isInitialized) throw new Error('DatabaseContext not initialized');
  if (!category || typeof(category) !== 'string') {
    throw new Error(`Invalid category ${category}`);
  }
  const table = category;
  let limit = '';
  let order = '';
  if (options) {
    if (options.limit && typeof(options.limit) === 'number') {
      limit = ` LIMIT ${options.limit}`;
    }
    if (options.desc) {
      // TODO: validate that key exists in model (based on category)
      let k = options.desc;
      if (k === 'dbTimestamp') k = '_ts';
      order = ` ORDER BY ${k} DESC`;
    } else if (options.asc) {
      let k = options.asc;
      if (k === 'dbTimestamp') k = '_ts';
      order = ` ORDER BY ${k} ASC`;
    }
  }
  const querySpec = {
    query: `SELECT * FROM ${table} WHERE category="${category}"`,
  };
  if (include) {
    include = dbFilter(include);
    for (let k in include) {
      if (include.hasOwnProperty(k)) {
        let v = include[k];
        if (typeof(v) === 'string') v = `"${v}"`;
        querySpec.query += ` AND ${k}=${v}`;
      }
    }
  }
  if (exclude) {
    exclude = dbFilter(exclude);
    for (let k in exclude) {
      if (exclude.hasOwnProperty(k)) {
        let v = exclude[k];
        if (typeof(v) === 'string') v = `"${v}"`;
        querySpec.query += ` AND ${k}<>${v}`;
      }
    }
  }
  if (older) {
    older = dbFilter(older);
    for (const agedKey in older) {
      querySpec.query += ` AND ${agedKey}<"${older[agedKey]}"`;
    }
  }
  querySpec.query += `${order}`;
  const items = await this.query(querySpec.query);
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
 * @throws {Error} if multiple matching entries found in database/table
 */
DatabaseContext.prototype.upsert = async function(item, filterOn) {
  if (!this.isInitialized) throw new Error('DatabaseContext not initialized');
  if (!item.category || typeof(item.category) !== 'string') {
    throw new Error(`Invalid category ${item.category}`);
  }
  const table = item.category;
  let created = false;
  let id;
  let dbItem;
  let changeList = null;
  if (!filterOn && item.unique) {
    filterOn = {};
  } else if (!(typeof filterOn === 'object')) {
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
    errStr = (`${found.length} ${item.category} entities matching`
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
      logger.debug(`Upserting ${dbItem.category}`);
      const query = `REPLACE INTO ${table} SET ?`;
      const { insertId } = await this.query(query, [modelToDb(dbItem)]);
      id = insertId;
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
DatabaseContext.prototype.delete = async function(item) {
  if (!this.isInitialized) throw new Error('DatabaseContext not initialized');
  if (!item.category || typeof(item.category) !== 'string') {
    throw new Error(`Invalid category ${item.category}`);
  }
  const table = item.category;
  const filterOn = {};
  filterOn[item.unique] = item[item.unique];
  if (item.unique.includes('TimeUtc')) {
    filterOn[item.unique] = isoToMySqlDate(item[item.unique]);
  }
  const found = await this.find(item.category, filterOn);
  if (found.length === 1) {
    let query = `DELETE FROM ${table} WHERE id=${found[0].id}`;
    try {
      const { affectedRows } = await this.query(query);
      logger.debug(`Deleted ${affectedRows} ${item.category}(s)`
          + ` (${item[item.unique]})`);
      return true;
    } catch (e) {
      logger.error(e.stack);
    }
  }
  return false;
}

DatabaseContext.prototype.removeAged = async function() {
  for (const modelName in models) {
    const model = new models[modelName];
    if (!model.ttl) continue;
    const TTL_HOURS = model.ttl / 3600;
    const agedDate = new Date();
    agedDate.setUTCHours(agedDate.getUTCHours() - TTL_HOURS);
    //:TEST agedDate.setUTCSeconds(agedDate.getUTCSeconds() - 5);
    let agedFilter = {};
    agedFilter[model.agedKey] = isoToMySqlDate(agedDate.toISOString());
    const aged = await this.find(model.category, null, null, null, agedFilter);
    if (aged.length > 0) {
      logger.debug(`Deleting ${aged.length} aged ${model.category}(s)`);
      let deletedCount = 0;
      for (let i=0; i < aged.length; i++) {
        const deleted = await this.delete(aged[i]);
        if (deleted) deletedCount += 1;
      }
      logger.info(`Deleted ${deletedCount} aged ${model.category}(s)`);
    } else {
      logger.debug(`No ${model.category} aged`);
    }
  }
}

/**
 * Closes the database connection
 */
DatabaseContext.prototype.close = async function() {
  try {
    await this.end();
    logger.debug('Success: closed MySQL connection');
  } catch (e) {
    logger.error(e.stack);
    throw e;
  }
}

module.exports = DatabaseContext;
