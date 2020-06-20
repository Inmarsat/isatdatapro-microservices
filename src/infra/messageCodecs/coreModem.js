'use strict';

const codecServiceId = 0;
const logger = require('../logger').loggerProxy(__filename);

logger.warn(`Codec not implemented for SIN ${codecServiceId}`);

//TODO parsers
module.exports = {
  codecServiceId,
};
