const submitMessage = require('../src/services/submitForwardMessages');
const events = require('../src/infra/eventHandler').emitter;

const testSubmitForward = async(mobileId, message) => {
  try {
    events.addListener('NewForwardMessage', (detail) => {
      console.log(`New Forward Message submitted: ${JSON.stringify(detail)}`);
    });
    events.addListener('NewMobile', (detail) => {
      console.log(`New Mobile found: ${JSON.stringify(detail)}`);
    });
    let submission;
    if (message instanceof Array) {
      submission = { payloadRaw: message };
    } else if (typeof message === 'object') {
      if ('command' in message) {
        submission = { modemCommand: message };
      } else {
        submission = { payloadJson: message };
      }
    }
    const submittedMessage = await submitMessage(mobileId, submission);
    console.log(`Submitted messageId ${JSON.stringify(submittedMessage)}` +
        ` to ${mobileId}`);
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
  codecServiceId: 0,
  codecMessageId: 70,
  fields: [
    {
      name: 'wakeupPeriod',
      stringValue: '0'
    }
  ]
  //command: 'setWakeupPeriod',
  //params: 'Seconds30',
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
// testSubmitForward(testDevice, ping);