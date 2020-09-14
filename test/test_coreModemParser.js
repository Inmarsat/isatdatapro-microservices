'use strict';

const { coreModem } = require('../src/infra/messageCodecs');

const returnMessages = {
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
  broadcastIds: {
    payloadJson: {
      "name":"broadcastIDs",
      "codecServiceId":0,
      "codecMessageId":115,
      "fields":[
        {
          "name":"broadcastIDs",
          "dataType":"array",
          "arrayElements":[
            {"index":0,"fields":[{"name":"id","stringValue":"01234567","dataType":"unsignedint"}]},
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
    //payloadRaw: [0,115,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    otaMessageSize: 50,
  },
  rxMetrics: {
    payloadJson: {
      "name":"rxMetrics",
      "codecServiceId":0,
      "codecMessageId":99,
      "fields":[
        {"name":"reserved","stringValue":"0","dataType":"unsignedint"},
        {"name":"period","stringValue":"LastFullMinute","dataType":"enum"},
        {"name":"packets","stringValue":"0","dataType":"unsignedint"},
        {"name":"packetsOK","stringValue":"0","dataType":"unsignedint"},
        {"name":"averageCNO","stringValue":"0","dataType":"unsignedint"},
        {"name":"samples","stringValue":"0","dataType":"unsignedint"},
        {"name":"channelErrorRate","stringValue":"0","dataType":"unsignedint"},
        {"name":"uwErrorRate","stringValue":"0","dataType":"unsignedint"}
      ]
    }
  },
  txMetrics: {
    payloadJson: {
      "name": "txMetrics",
      "codecServiceId": 0,
      "codecMessageId": 100,
      "fields": [
        { "name": "period", "stringValue": "LastFullMinute", "dataType": "enum" },
        { "name": "packetTypeMask", "stringValue": "0", "dataType": "unsignedint" },
        {
          "name": "txMetrics", "dataType": "array", "arrayElements": [
            {
              "index": 0, "fields": [{ "name": "PacketsTotal", "stringValue": "0", "dataType": "unsignedint" },
              { "name": "PacketsSuccess", "stringValue": "0", "dataType": "unsignedint" },
              { "name": "PacketsFailed", "stringValue": "0", "dataType": "unsignedint" }
              ]
            }]
        }
      ]
    }
  },
  txMetrics2: {
    payloadJson: {
      "name": "txMetrics",
      "codecServiceId": 0,
      "codecMessageId": 100,
      "fields": [
        {
          "name": "period",
          "stringValue": "LastPartialDay",
          "dataType": "enum"
        },
        {
          "name": "packetTypeMask",
          "stringValue": "3",
          "dataType": "unsignedint"
        },
        {
          "name": "txMetrics",
          "dataType": "array",
          "arrayElements": [
            {
              "index": 0,
              "fields": [
                {
                  "name": "PacketsTotal",
                  "stringValue": "17",
                  "dataType": "unsignedint"
                },
                {
                  "name": "PacketsSuccess",
                  "stringValue": "17",
                  "dataType": "unsignedint"
                },
                {
                  "name": "PacketsFailed",
                  "stringValue": "0",
                  "dataType": "unsignedint"
                }
              ]
            },
            {
              "index": 1,
              "fields": [
                {
                  "name": "PacketsTotal",
                  "stringValue": "8",
                  "dataType": "unsignedint"
                },
                {
                  "name": "PacketsSuccess",
                  "stringValue": "8",
                  "dataType": "unsignedint"
                },
                {
                  "name": "PacketsFailed",
                  "stringValue": "0",
                  "dataType": "unsignedint"
                }
              ]
            }
          ]
        }
      ]
    },
  },
  lastRxMetrics: {
    payloadJson: {
      "name":"lastRxMetrics",
      "codecServiceId":0,
      "codecMessageId":98,
      "fields":[
        {"name":"sipValid","stringValue":"False","dataType":"boolean"},
        {"name":"subframe","stringValue":"512","dataType":"unsignedint"},
        {"name":"packets","stringValue":"0","dataType":"unsignedint"},
        {"name":"packetsOK","stringValue":"0","dataType":"unsignedint"},
        {"name":"frequencyOffset","stringValue":"0","dataType":"unsignedint"},
        {"name":"timingOffset","stringValue":"0","dataType":"unsignedint"},
        {"name":"packetCNO","stringValue":"0","dataType":"unsignedint"},
        {"name":"uwCNO","stringValue":"0","dataType":"unsignedint"},
        {"name":"uwRSSI","stringValue":"0","dataType":"unsignedint"},
        {"name":"uwSymbols","stringValue":"0","dataType":"unsignedint"},
        {"name":"uwErrors","stringValue":"0","dataType":"unsignedint"},
        {"name":"packetSymbols","stringValue":"0","dataType":"unsignedint"},
        {"name":"packetErrors","stringValue":"0","dataType":"unsignedint"}
      ]
    }
  }
};

const forwardMessages = {
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
  getRxMetrics: {
    payloadJson: {
      "name":"getRxMetrics",
      "codecServiceId":0,
      "codecMessageId":99,
      "isForward":"True",
      "fields":[
        {"name":"reserved","stringValue":"0","dataType":"unsignedint"},
        {"name":"period","stringValue":"LastFullMinute","dataType":"enum"}
      ]
    }
  },
  getTxMetrics: {
    payloadJson: {
      "name":"getTxMetrics",
      "codecServiceId":0,
      "codecMessageId":100,
      "isForward":"True",
      "fields":[
        {"name":"reserved","stringValue":"0","dataType":"unsignedint"},
        {"name":"period","stringValue":"LastFullMinute","dataType":"enum"}
      ]
    }
  },
};

function test() {
  let returnCase = 0;
  const returnTests = [
    'none',
  ];
  for (let testCase in returnMessages) {
    if (returnTests[0] === 'none') break;
    if (returnTests.length === 0 || returnTests.includes(testCase)) {
      returnCase += 1;
      let message = returnMessages[testCase];
      message.messageId = returnCase;
      message.mobileId = '00000000MFREE3D';
      message.codecServiceId = 0;
      message.receiveTimeUtc = new Date().toISOString().substring(0, 19) + 'Z';
      message.mailboxTimeUtc = message.receiveTimeUtc;
      let response = coreModem.parse(message);
      console.log(`${JSON.stringify(response)}`);
    }
  }
  
  let forwardCase = 0;
  const forwardTests = [
    'setSleepSchedule',
  ];
  for (let testCase in forwardMessages) {
    if (forwardTests[0] === 'none') break;
    if (forwardTests.length === 0 || forwardTests.includes(testCase)) {
      forwardCase += 1;
      let match = true;
      let payloadJson;
      switch (testCase) {
        case 'reset':
          payloadJson = coreModem.commandMessages.reset();
          break;
        case 'setSleepSchedule':
          payloadJson = coreModem.commandMessages.setWakeupPeriod('None');
          break;
        case 'setTxMute':
          payloadJson = coreModem.commandMessages.setTxMute(true);
          break;
        case 'getPosition':
          payloadJson = coreModem.commandMessages.getLocation();
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
  }
}

//test();
