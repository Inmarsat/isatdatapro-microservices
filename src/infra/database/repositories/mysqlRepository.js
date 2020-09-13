//: Wraps mysql with promisify for query and end
'use strict';

const mysql = require('mysql');
const util = require('util');
const dbConfig = require('dotenv').config();
//const dbConfig = require('../../../../test/_private_mysql');

const logger = require('../../logging').loggerProxy(__filename);
const { modelToDb, modelFromDb, dbFilter } = require('./propertyConversion');
const models = require('../models');

/**
 * Builds up a MySQL schema based on the model definitions
 * @private
 * @returns {object} schema
 */
function buildSchema() {
  const ignore = ['message'];
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
          let mySqlDef = `${toDb(propName)}`;
          switch(typeof propVal) {
            case 'boolean':
              mySqlDef += ` BOOLEAN`;
              break;
            case 'string':
              const len = propName.includes('url') ? 150 : 50;
              mySqlDef += ` VARCHAR(${len})`;
              break;
            case 'number':
              mySqlDef += ` INT`;
              break;
            default:
              if (propName.includes('payload') || propVal instanceof Array) {
                mySqlDef += ` JSON`;
              } else {
                mySqlDef += ` VARCHAR(50)`;
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
    host: dbConfig.DB_HOST,
    user: dbConfig.DB_USER,
    password: dbConfig.DB_PASS,
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
  try {
    let exists = await this.query(`SHOW DATABASES LIKE "${dbConfig.DB_NAME}"`);
    if (exists.length === 0) {
      await this.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.DB_NAME}`);
      logger.info(`Created database ${dbConfig.DB_NAME}`);
      await this.query(`USE ${dbConfig.DB_NAME}`);
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
          await this.query(tQuery);
          logger.debug(`Created table ${tableName}`);
        }
      }
    } else {
      await this.query(`USE ${dbConfig.DB_NAME}`);
      logger.debug(`Using database ${dbConfig.DB_NAME}`);
    }
    this.isInitialized = true;
  } catch (err) {
    logger.error(err);
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
    async function(category, include, exclude, options) {
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
  querySpec.query += `${order}`;
  const items = await this.query(querySpec.query);
  logger.debug(`Found ${items.length} matching ${category}(es)`);
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
      const query = `REPLACE INTO ${table} SET ?`;
      const { insertId } = await this.query(query, [modelToDb(dbItem)]);
      id = insertId;
    } catch (e) {
      logger.error(e);
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
  const found = await this.find(item.category, filterOn);
  if (found.length === 1) {
    let query = `DELETE FROM ${table} WHERE id=${found[0].id}`;
    try {
      const { affectedRows } = await this.query(query);
      logger.debug(`Deleted ${affectedRows} ${item.category}(s)`);
      return true;
    } catch (e) {
      logger.error(e);
    }
  }
  return false;
}

/**
 * Closes the database connection
 */
DatabaseContext.prototype.close = async function() {
  try {
    await this.end();
    logger.debug('Success: closed MySQL connection');
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

module.exports = DatabaseContext;
