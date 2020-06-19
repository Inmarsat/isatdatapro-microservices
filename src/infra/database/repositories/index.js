'use strict';
require('dotenv').config();

let repository;

const dbType = process.env.DB_TYPE;
if (dbType == 'azureCosmos') {
  repository = require('./azureCosmosRepository');
} else if (dbType == 'mysql') {
  repository = require('./mysqlRepository');
} else {
  throw new Error(`Unsupported Database Type ${dbType}`);
}

module.exports = repository;
