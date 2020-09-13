/**
 * Loader for service modules
 */
'use strict';

const normalizedPath = require('path').join(__dirname);
let modules = {};

require('fs').readdirSync(normalizedPath).forEach(file => {
  let moduleName = file.split('.')[0];
  if (moduleName !== 'index') modules[moduleName] = require(`./${moduleName}`);
});

module.exports = modules;
