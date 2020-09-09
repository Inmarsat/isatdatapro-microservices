/**
 * Loader for database models
 */
'use strict';

const normalizedPath = require('path').join(__dirname);
let models = {};
const EXCLUDES = ['categories', 'index', 'Model', 'Message', 'MessagePayloadJson'];

require('fs').readdirSync(normalizedPath).forEach(file => {
  let moduleName = file.split('.')[0];
  if (!EXCLUDES.includes(moduleName)) {
    models[moduleName] = require(`./${moduleName}`);
  }
});

module.exports = models;
