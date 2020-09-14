'use strict';

//const logger = require('../../logging').loggerProxy(__filename);
require('dotenv').config();
const dbType = (process.env.DB_TYPE).toLowerCase();
const models = require('../models');

/**
 * Converts camelCase to snake_case
 * @private
 * @param {string} propName The property name in camelCase
 * @returns {string} snake_case property name
 */
function camelToSnakeCase_(propName) {
  let snake_case = propName;
  ///*  Comment out to enable
  snake_case = propName.replace(/([A-Z])/g, ($1) => {
    return '_' + $1.toLowerCase();
  });
  //*/
  return snake_case;
}

/**
 * Converts snake_case to camelCase
 * @private
 * @param {string} propName The property name in snake_case
 * @returns {string} camelCase property name
 */
function snakeToCamelCase_(propName) {
  let camelCase = propName;
  ///*  Comment out to enable
  camelCase = propName.replace(/([_][a-z])/ig, ($1) => {
    return $1.toUpperCase().replace('_', '');
  });
  //*/
  return camelCase;
}

/**
 * Converts a property and optionally its value to database-compatible
 * @param {string} modelProp The model property
 * @param {any} [modelValue] Optional property value
 * @returns {(string|{dbProp: string, dbValue: any})} the db property name/object
 */
function propToDb(modelProp, modelValue) {
  let dbProp = camelToSnakeCase_(modelProp);
  if (typeof(modelValue) !== 'undefined') {
    let dbValue = modelValue;
    if (modelValue instanceof Array || modelValue instanceof Object) {
      dbValue = JSON.stringify(modelValue);
    } else if (dbType.includes('mysql')
        && modelProp.includes('TimeUtc')) {
      dbValue = isoToMySqlDate(dbValue);
    }
    return { dbProp, dbValue };
  }
  return dbProp;
}

function isoToMySqlDate(date) {
  if (date) return date.replace('T', ' ').replace('Z', '');
  return date;
}

function mySqlDateToIso(date) {
  if (date) return date.replace(' ', 'T') + 'Z';
  return date;
}

/**
 * Converts database-compatible to model property and optionally its value
 * @param {string} dbProp The property name/key from the database
 * @param {any} [dbValue] Optional value stored in the database
 * @returns {(string|{prop: string, value: any})} the model property name/object
 */
function propFromDb(dbProp, dbValue) {
  let modelProp = snakeToCamelCase_(dbProp);
  if (typeof(dbValue) !== 'undefined') {
    let modelValue = dbValue;
    if (dbType.includes('mysql') 
        && modelProp.includes('TimeUtc')) {
      modelValue = mySqlDateToIso(dbValue);
    } else if (typeof(dbValue) === 'string') {
      try {
        modelValue = JSON.parse(dbValue);
        if (modelProp === 'mailboxId') modelValue = String(modelValue);
      } catch (err) {
        if (err.message.includes('JSON')) {
          //: modelValue = dbValue
        } else {
          throw err;
        }
      }
    }
    return { modelProp, modelValue };
  }
  return modelProp;
}

/**
 * Returns an Entity based on Model defined by category from a database read
 * camelCase tags, JSON objects and Arrays
 * @private
 * @param {Object} dbItem The raw item retrieved from the database
 * @param {boolean} [includeDbId] Adds the primary database key id to the Model
 * @returns {Object} entity based on Model category
 * @throws {Error} if no model matching the item.category is found
 */
function modelFromDb(dbItem, includeDbId) {
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
    const dbProp = propToDb(prop);
    if (model.hasOwnProperty(prop) && dbItem.hasOwnProperty(dbProp)) {
      const { modelValue } = propFromDb(dbProp, dbItem[dbProp]);
      model[prop] = modelValue;
    }
  });
  if (includeDbId) model.id = dbItem.id;
  return model;
}

/**
 * Returns an database-formatted entry from a Model/Entity
 * snake_case tags, stringified JSON/Arrays
 * @private
 * @param {Object} item The Model-defined Entity
 * @returns {Object} database-compatible entry
 */
function modelToDb(item) {
  const dbItem = {};
  const itemProperties = Object.getOwnPropertyNames(item);
  itemProperties.forEach(prop => {
    if (item.hasOwnProperty(prop)) {
      const { dbProp, dbValue } = propToDb(prop, item[prop]);
      dbItem[dbProp] = dbValue;
    }
  });
  return dbItem;
}

/**
 * Returns a database-compatible filter for queries
 * @param {Object} filter A filter key/value set
 * @returns {Object} the database-compatible filter
 */
function dbFilter(filter) {
  let newFilter = {};
  for (let param in filter) {
    if (!filter.hasOwnProperty(param)) continue;
    let dbName = propToDb(param);
    newFilter[dbName] = filter[param];
  }
  return newFilter;
}

module.exports = {
  dbFilter,
  modelToDb,
  modelFromDb,
  propToDb,
  propFromDb,
  isoToMySqlDate,
};
