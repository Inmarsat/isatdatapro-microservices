/**
 * Loader for utility modules
 */

const normalizedPath = require('path').join(__dirname);
let modules = {};

require('fs').readdirSync(normalizedPath).forEach(file => {
  let moduleName = file.split('.')[0];
  modules[moduleName] = require(`./${moduleName}`);
});

module.exports = modules;
