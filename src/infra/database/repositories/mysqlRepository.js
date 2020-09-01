// TODO CLEANUP/DOC
// Wraps mysql with promisify for query and end
// TODO: JSDoc

const mysql = require('mysql');
const util = require('util');
//const dbConfig = require('dotenv').config();
const dbConfig = require('../../../../test/_private_mysql');
const models = require('../models');
const toDb = require('../utilities/propertyConversion').toDb; 

/**
 * Builds up a MySQL schema based on the model definitions
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
        for (let i=0; i < propNames.length; i++) {
          const propName = propNames[i];
          if (propName === 'category') continue;
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
        }
        schema[model.category] = table;
      }
    } catch (e) {
      if (e.message.includes('is not a constructor')) {
        console.debug(`Skipping ${modelName} not a Model`);
        continue;
      } else {
        throw e;
      }
    }
  }
  return schema;
}

/**
 * DbConnection class
 * @constructor
 */
function DbConnection() {
  this.type = 'MySQL';
  this.conn = mysql.createConnection({
    host: dbConfig.DB_HOST,
    user: dbConfig.DB_USER,
    password: dbConfig.DB_PASS,
  });
  this.connect = util.promisify(this.conn.connect).bind(this.conn);
  this.query = util.promisify(this.conn.query).bind(this.conn);
  this.end = util.promisify(this.conn.end).bind(this.conn);
}
  
/**
 * Initializes the MySQL database if required
 */
DbConnection.prototype.initialize = async function() {
  let exists = await this.query(`SHOW DATABASES LIKE "${dbConfig.DB_NAME}"`);
  if (exists.length === 0) {
    await this.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.DB_NAME}`);
    console.log(`Created database ${dbConfig.DB_NAME}`);
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
        console.log(`Created table ${tableName}`);
      }
    }
  } else {
    await this.query(`USE ${dbConfig.DB_NAME}`);
    console.debug(`Using database ${dbConfig.DB_NAME}`);
  }
}

/* COMMENT OUT FOR TEST ONLY
console.log('WARNING: DATABASE CREATION TEST MODE');
const db = new DbConnection();
async function test() {
  //console.log(JSON.stringify(buildSchema(), null, 2));
  await db.initialize();
  await db.end();
}
test();
// */

module.exports = DbConnection;
