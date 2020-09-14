'use strict';

const isatdataproMicroservices = require('../index');
const { getReturnMessages, eventHandler } = isatdataproMicroservices;
const event = eventHandler.emitter;
const API_POLLING_INTERVAL_SECONDS = 30;

const onNewReturnMessage = function(message) {
  console.log(`New return message: ${JSON.stringify(message)}`);
};

const onNewMobile = function(mobile) {
  console.log(`New mobile: ${JSON.stringify(mobile)}`);
};

const onApiOutage = function(detail) {
  console.log(`API outage: ${JSON.stringify(detail)}`);
};

const onApiRecovery = function(detail) {
  console.log(`API recovery: ${JSON.stringify(detail)}`);
};

(async () => {
  event.on('NewReturnMessage', onNewReturnMessage);
  event.on('NewMobile', onNewMobile);
  event.on('ApiOutage', onApiOutage);
  event.on('ApiRecovery', onApiRecovery);

  await getReturnMessages();
  setInterval(async function() {
    await getReturnMessages();
  }, API_POLLING_INTERVAL_SECONDS * 1000);

  event.off('NewReturnMessage', onNewReturnMessage);
  event.off('NewMobile', onNewMobile);
  event.off('ApiOutage', onApiOutage);
  event.off('ApiRecovery', onApiRecovery);
})();
