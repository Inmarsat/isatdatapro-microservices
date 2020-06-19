const getStatuses = require('../src/services/getForwardStatuses');
const emitter = require('../src/infra/eventHandler');

const testGetStatuses = async() => {
  try {
    emitter.addListener('ForwardMessageStateChange', (detail) => {
      console.log('Forward message state change: ' + detail);
    });
    emitter.addListener('OtherForwardMessage', (detail) => {
      console.log('Other client submitted Forward Message: ' + detail);
    });
    await getStatuses(console);
  } catch (err) {
    console.log(err);
  }
};

//testGetStatuses();