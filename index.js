'use strict';

const getReturnMessages = require('./src/services/getReturnMessages');
const submitForwardMessages = require('./src/services/submitForwardMessages');
const getForwardStatuses = require('./src/services/getForwardStatuses');
const getForwardMessages = require('./src/services/getForwardMessages');
const getMobiles = require('./src/services/getMobiles');
const messageCodecs = require('./src/infra/messageCodecs');

const eventHandler = require('./src/infra/eventHandler');
const logger = require('./src/infra/logger');

module.exports = {
  getReturnMessages,
  submitForwardMessages,
  getForwardStatuses,
  getForwardMessages,
  getMobiles,
  eventHandler,
  logger,
};
