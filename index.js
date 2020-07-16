'use strict';

const updateMailbox = require('./src/services/updateMailbox');
const updateSatelliteGateway = require('./src/services/updateSatelliteGateway');
const getReturnMessages = require('./src/services/getReturnMessages');
const submitForwardMessages = require('./src/services/submitForwardMessages');
const getForwardStatuses = require('./src/services/getForwardStatuses');
const getForwardMessages = require('./src/services/getForwardMessages');
const getMobiles = require('./src/services/getMobiles');
const messageCodecs = require('./src/infra/messageCodecs');

const eventHandler = require('./src/infra/eventHandler');
const logging = require('./src/infra/logging');

module.exports = {
  updateMailbox,
  updateSatelliteGateway,
  getReturnMessages,
  submitForwardMessages,
  getForwardStatuses,
  getForwardMessages,
  getMobiles,
  messageCodecs,
  eventHandler,
  logging,
};
