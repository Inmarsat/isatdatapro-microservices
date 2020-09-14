const submitMessage = require('../src/services/submitForwardMessages');
const events = require('../src/infra/eventHandler').emitter;

const testSubmitForward = async(mobileId, message) => {
  try {
    events.addListener('NewMobile', (detail) => {
      console.log('New Mobile found: ' + detail);
    });
    let submission;
    if (message instanceof Array) {
      submission = { payloadRaw: message };
    } else if (typeof message === 'object' && 'command' in message) {
      if ('command' in message) {
        submission = { modemCommand: message };
      } else {
        submission = { payloadJson: message };
      }
    }
    await submitMessage(mobileId, submission);
  } catch (err) {
    console.log(err);
  }
};

//testSubmitForward(testDevice, [0, 72]);
const ping = {
  command: 'ping',
  params: null,
};
const reset = {
  command: 'reset',
  params: 'ModemPreserve',
};
const setWakeupPeriod = {
  command: 'setWakeupPeriod',
  params: 'Seconds30',
};
const mute = {
  command: 'setTxMute',
  params: true,
};
const unmute = {
  command: 'setTxMute',
  params: false,
};
const getLocation = {
  command: 'getLocation',
};
const getConfiguration = {
  command: 'getConfiguration',
};
const getBroadcastIds = {
  command: 'getBroadcastIds',
};
const getTxMetrics = {
  command: 'getTxMetrics',
  params: 'SinceReset'
};
const getRxMetrics = {
  command: 'getRxMetrics',
  params: undefined,
};

const testDevice = require('../config/local.settings.json').testTerminal;
//testSubmitForward(testDevice, ping);