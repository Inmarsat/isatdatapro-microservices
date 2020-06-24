'use strict';

const parser = require('../src/infra/messageCodecs/coreModem');
const ReturnMessage = require('../src/infra/database/models/messageReturn');
const { payloadJson, Field } = require('../src/infra/database/models/messagePayloadJson');

const returnMessages = {
  /*
  modemRegistration: {
    payloadJson: {
      "name":"modemRegistration",
      "codecServiceId":0,
      "codecMessageId":0,
      "fields":[
        {"name":"hardwareMajorVersion","stringValue":"0","dataType":"unsignedint"},
        {"name":"hardwareMinorVersion","stringValue":"0","dataType":"unsignedint"},
        {"name":"softwareMajorVersion","stringValue":"0","dataType":"unsignedint"},
        {"name":"softwareMinorVersion","stringValue":"0","dataType":"unsignedint"},
        {"name":"product","stringValue":"0","dataType":"unsignedint"},
        {"name":"wakeupPeriod","stringValue":"None","dataType":"enum"},
        {"name":"lastResetReason","stringValue":"Unknown","dataType":"enum"},
        {"name":"virtualCarrier","stringValue":"0","dataType":"unsignedint"},
        {"name":"beam","stringValue":"0","dataType":"unsignedint"},
        {"name":"vain","stringValue":"0","dataType":"unsignedint"},
        {"name":"reserved","stringValue":"0","dataType":"unsignedint"},
        {"name":"operatorTxState","stringValue":"0","dataType":"unsignedint"},
        {"name":"userTxState","stringValue":"0","dataType":"unsignedint"},
        {"name":"broadcastIDCount","stringValue":"0","dataType":"unsignedint"}
      ]
    },
    payloadRaw: [0, 97, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    otaMessageSize: 15,
  },
  protocolError: {
    payloadJson: {
      "name":"protocolError",
      "codecServiceId":0,
      "codecMessageId":2,
      "fields":[
        {"name":"reserved","stringValue":"0","dataType":"unsignedint"},
        {"name":"messageReference","stringValue":"0","dataType":"unsignedint"},
        {"name":"errorCode","stringValue":"0","dataType":"unsignedint"},
        {"name":"errorInfo","stringValue":"0","dataType":"unsignedint"}
      ]
    }
  },
  sleepSchedule: {
    payloadJson: {
      "name":"sleepSchedule",
      "codecServiceId":0,
      "codecMessageId":70,
      "fields":[
        {"name":"wakeupPeriod","stringValue":"None","dataType":"enum"},
        {"name":"mobileInitiated","stringValue":"False","dataType":"boolean"},
        {"name":"messageReference","stringValue":"0","dataType":"unsignedint"}
      ]
    }
  },
  position: {
    payloadJson: {
      "name":"position",
      "codecServiceId":0,
      "codecMessageId":72,
      "fields":[
        {"name":"fixStatus","stringValue":"0","dataType":"unsignedint"},
        {"name":"latitude","stringValue":"0","dataType":"signedint"},
        {"name":"longitude","stringValue":"0","dataType":"signedint"},
        {"name":"altitude","stringValue":"0","dataType":"signedint"},
        {"name":"speed","stringValue":"0","dataType":"unsignedint"},
        {"name":"heading","stringValue":"0","dataType":"unsignedint"},
        {"name":"dayOfMonth","stringValue":"0","dataType":"unsignedint"},
        {"name":"minuteOfDay","stringValue":"0","dataType":"unsignedint"}
      ]
    }
  },
  configuration: {
    payloadJson: {
      "name":"configuration",
      "codecServiceId":0,
      "codecMessageId":97,
      "fields":[
        {"name":"hardwareMajorVersion","stringValue":"0","dataType":"unsignedint"},
        {"name":"hardwareMinorVersion","stringValue":"0","dataType":"unsignedint"},
        {"name":"softwareMajorVersion","stringValue":"0","dataType":"unsignedint"},
        {"name":"softwareMinorVersion","stringValue":"0","dataType":"unsignedint"},
        {"name":"product","stringValue":"0","dataType":"unsignedint"},
        {"name":"wakeupPeriod","stringValue":"None","dataType":"enum"},
        {"name":"lastResetReason","stringValue":"Unknown","dataType":"enum"},
        {"name":"virtualCarrier","stringValue":"0","dataType":"unsignedint"},
        {"name":"beam","stringValue":"0","dataType":"unsignedint"},
        {"name":"vain","stringValue":"0","dataType":"unsignedint"},
        {"name":"reserved","stringValue":"0","dataType":"unsignedint"},
        {"name":"operatorTxState","stringValue":"0","dataType":"unsignedint"},
        {"name":"userTxState","stringValue":"0","dataType":"unsignedint"},
        {"name":"broadcastIDCount","stringValue":"0","dataType":"unsignedint"}
      ]
    },
    payloadRaw: [0, 97, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    otaMessageSize: 15,
  },
  pingResponse: {
    payloadJson: {
      "name":"pingResponse",
      "codecServiceId":0,
      "codecMessageId":112,
      "fields":[
        {"name":"requestTime","stringValue":"0","dataType":"unsignedint"},
        {"name":"responseTime","stringValue":"0","dataType":"unsignedint"}
      ]
    },
    payloadRaw: [0, 112, 0, 0, 0, 0],
    otaMessageSize: 6,
  },
  pingRequest: {
    payloadJson: {
      "name":"pingRequest",
      "codecServiceId":0,
      "codecMessageId":113,
      "fields":[
        {"name":"requestTime","stringValue":"0","dataType":"unsignedint"}
      ]
    },
    payloadRaw: [0, 113, 0, 0],
    otaMessageSize: 4,
  },
  */
  broadcastIds: {
    payloadJson: {
      "name":"broadcastIDs",
      "codecServiceId":0,
      "codecMessageId":115,
      "fields":[
        {
          "name":"broadcastIDs",
          "dataType":"array",
          "elements":[
            {"index":0,"fields":[{"name":"id","stringValue":"0","dataType":"unsignedint"}]},
            {"index":1,"fields":[{"name":"id","stringValue":"0","dataType":"unsignedint"}]},
            {"index":2,"fields":[{"name":"id","stringValue":"0","dataType":"unsignedint"}]},
            {"index":3,"fields":[{"name":"id","stringValue":"0","dataType":"unsignedint"}]},
            {"index":4,"fields":[{"name":"id","stringValue":"0","dataType":"unsignedint"}]},
            {"index":5,"fields":[{"name":"id","stringValue":"0","dataType":"unsignedint"}]},
            {"index":6,"fields":[{"name":"id","stringValue":"0","dataType":"unsignedint"}]},
            {"index":7,"fields":[{"name":"id","stringValue":"0","dataType":"unsignedint"}]},
            {"index":8,"fields":[{"name":"id","stringValue":"0","dataType":"unsignedint"}]},
            {"index":9,"fields":[{"name":"id","stringValue":"0","dataType":"unsignedint"}]},
            {"index":10,"fields":[{"name":"id","stringValue":"0","dataType":"unsignedint"}]},
            {"index":11,"fields":[{"name":"id","stringValue":"0","dataType":"unsignedint"}]},
            {"index":12,"fields":[{"name":"id","stringValue":"0","dataType":"unsignedint"}]},
            {"index":13,"fields":[{"name":"id","stringValue":"0","dataType":"unsignedint"}]},
            {"index":14,"fields":[{"name":"id","stringValue":"0","dataType":"unsignedint"}]},
            {"index":15,"fields":[{"name":"id","stringValue":"0","dataType":"unsignedint"}]}
          ]
        }
      ]
    },
    payloadRaw: [0,115,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    otaMessageSize: 50,
  },
  rxMetrics: {
    payloadJson: {
      "Name":"rxMetrics",
      "SIN":0,
      "MIN":99,
      "Fields":[
        {"Name":"reserved","Value":"0","Type":"unsignedint"},
        {"Name":"period","Value":"LastFullMinute","Type":"enum"},
        {"Name":"packets","Value":"0","Type":"unsignedint"},
        {"Name":"packetsOK","Value":"0","Type":"unsignedint"},
        {"Name":"averageCNO","Value":"0","Type":"unsignedint"},
        {"Name":"samples","Value":"0","Type":"unsignedint"},
        {"Name":"channelErrorRate","Value":"0","Type":"unsignedint"},
        {"Name":"uwErrorRate","Value":"0","Type":"unsignedint"}
      ]
    }
  },
  txMetrics: {
    payloadJson: {
      "Name":"txMetrics",
      "SIN":0,
      "MIN":100,
      "Fields":[
        {"Name":"reserved","Value":"0","Type":"unsignedint"},
        {"Name":"period","Value":"LastFullMinute","Type":"enum"},
        {"Name":"packetTypeMask","Value":"0","Type":"unsignedint"},
        {"Name":"txMetrics","Type":"array","Elements":[
          {"Index":0,"Fields":[{"Name":"PacketsTotal","Value":"0","Type":"unsignedint"},
          {"Name":"PacketsSuccess","Value":"0","Type":"unsignedint"},
          {"Name":"PacketsFailed","Value":"0","Type":"unsignedint"}
        ]}]}
      ]
    }
  },
  lastRxMetrics: {
    payloadJson: {
      "Name":"lastRxMetrics",
      "SIN":0,
      "MIN":98,
      "Fields":[
        {"Name":"sipValid","Value":"False","Type":"boolean"},
        {"Name":"subframe","Value":"512","Type":"unsignedint"},
        {"Name":"packets","Value":"0","Type":"unsignedint"},
        {"Name":"packetsOK","Value":"0","Type":"unsignedint"},
        {"Name":"frequencyOffset","Value":"0","Type":"unsignedint"},
        {"Name":"timingOffset","Value":"0","Type":"unsignedint"},
        {"Name":"packetCNO","Value":"0","Type":"unsignedint"},
        {"Name":"uwCNO","Value":"0","Type":"unsignedint"},
        {"Name":"uwRSSI","Value":"0","Type":"unsignedint"},
        {"Name":"uwSymbols","Value":"0","Type":"unsignedint"},
        {"Name":"uwErrors","Value":"0","Type":"unsignedint"},
        {"Name":"packetSymbols","Value":"0","Type":"unsignedint"},
        {"Name":"packetErrors","Value":"0","Type":"unsignedint"}
      ]
    }
  }
};

const forwardMessages = {
  /*
  reset: {
    payloadJson: {
      "name":"reset",
      "codecServiceId":0,
      "codecMessageId":68,
      "isForward": true,
      "fields":[
        {"name":"resetType","stringValue":"TerminalModemFlush","dataType":"enum"}
      ]
    },
    payloadRaw: [0, 68, 3],
    otaMessageSize: 3,
  },
  setSleepSchedule: {
    payloadJson: {
      "name":"setSleepSchedule",
      "codecServiceId":0,
      "codecMessageId":70,
      "isForward": true,
      "fields":[
        {"name":"wakeupPeriod","stringValue":"None","dataType":"enum"}
      ]
    },
    payloadRaw: [0, 70, 0],
    otaMessageSize: 3,
  },
  setTxMute: {
    payloadJson: {
      "name":"setTxMute",
      "codecServiceId":0,
      "codecMessageId":71,
      "isForward": true,
      "fields":[
        {"name":"reserved","stringValue":"0","dataType":"unsignedint"},
        {"name":"txMute","stringValue":"True","dataType":"boolean"}
      ]
    },
    payloadRaw: [0, 71, 0],
    otaMessageSize: 3,
  },
  getPosition: {
    payloadJson: {"name":"getPosition","codecServiceId":0,"codecMessageId":72,"isForward": true},
    payloadRaw: [0, 72],
    otaMessageSize: 2,
  },
  */
  getRxMetrics: {
    payloadJson: {
      "Name":"getRxMetrics",
      "SIN":0,
      "MIN":99,
      "IsForward":"True",
      "Fields":[
        {"Name":"reserved","Value":"0","Type":"unsignedint"},
        {"Name":"period","Value":"LastFullMinute","Type":"enum"}
      ]
    }
  },
  getTxMetrics: {
    payloadJson: {
      "Name":"getTxMetrics",
      "SIN":0,
      "MIN":100,
      "IsForward":"True",
      "Fields":[
        {"Name":"reserved","Value":"0","Type":"unsignedint"},
        {"Name":"period","Value":"LastFullMinute","Type":"enum"}
      ]
    }
  },
};

let returnCase = 0;
for (let testCase in returnMessages) {
  returnCase += 1;
  let message = returnMessages[testCase];
  message.messageId = returnCase;
  message.mobileId = '00000000MFREE3D';
  message.codecServiceId = 0;
  message.receiveTimeUtc = new Date().toISOString().substring(0, 19) + 'Z';
  message.mailboxTimeUtc = message.receiveTimeUtc;
  let response = parser.parseCoreModem(message);
  console.log(`${JSON.stringify(response)}`);
}

let forwardCase = 0;
for (let testCase in forwardMessages) {
  forwardCase += 1;
  let match = true;
  let payloadJson;
  switch (testCase) {
    case 'reset':
      payloadJson = parser.commandMessages.reset();
      break;
    case 'setSleepSchedule':
      payloadJson = parser.commandMessages.setWakeupPeriod('None');
      break;
    case 'setTxMute':
      payloadJson = parser.commandMessages.setTxMute(true);
      break;
    case 'getPosition':
      payloadJson = parser.commandMessages.getLocation();
      break;
    default:
      console.log(`No encoding defined for ${testCase}`);
  }
  if (payloadJson) {
    const benchmark = forwardMessages[testCase].payloadJson;
    for (let prop in benchmark) {
      if (benchmark.hasOwnProperty(prop)) {
        if (payloadJson.hasOwnProperty(prop)) {
          if (payloadJson[prop] instanceof Array) {
            payloadJson[prop].forEach(subProp => {
              if (benchmark[prop][subProp] !== payloadJson[prop][subProp]) {
                console.log(`Mismatch ${subProp}`);
                match = false;
              }
            });
          } else {
            if (benchmark[prop] != payloadJson[prop]) {
              console.log(`Mismatch ${prop}`);
              match = false;
            }
            }
        } else {
          console.log(`Mismatch ${prop}`);
          match = false;
        }
      }
    }
    if (match) { console.log(`Matched ${testCase}`) }
  }
}