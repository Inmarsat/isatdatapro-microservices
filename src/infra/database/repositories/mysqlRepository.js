// TODO CLEANUP/DOC
// Wraps mysql with promisify for query and end
// TODO: JSDoc

const mysql = require('mysql');
const util = require('util');

const dbConfig = require('dotenv').config();

/**
 * DbConnection class
 * @constructor
 */
function DbConnection() {
  this.type = 'MySQL';
  this.conn = mysql.createConnection({
    host: dbConfig.DB_HOST,
    user: dbConfig.DB_USER,
    password: dbConfig.DB_PASS,
  });
  this.connect = util.promisify(this.conn.connect).bind(this.conn);
  this.query = util.promisify(this.conn.query).bind(this.conn);
  this.end = util.promisify(this.conn.end).bind(this.conn);
}
  
DbConnection.prototype.initialize = async function() {
  let exists = await this.query(`SHOW DATABASES LIKE "${dbConfig.DB_NAME}"`);
  if (exists.length === 0) {
    await this.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.DB_NAME}`);
    console.log(`Created database ${dbConfig.DB_NAME}`);
    await this.query(`USE ${dbConfig.DB_NAME}`);
    for (let tableName in SCHEMA) {
      if (SCHEMA.hasOwnProperty(tableName)) {
        let tQuery = `CREATE TABLE IF NOT EXISTS ${tableName}(`;
        const table = SCHEMA[tableName];
        for (let column=0; column < table.length; column++) {
          if (column > 0) tQuery += ', ';
          tQuery += table[column];
        }
        tQuery += ')';
        await this.query(tQuery);
        console.log(`Created table ${tableName}`);
      }
    }
  } else {
    await this.query(`USE ${dbConfig.DB_NAME}`);
    console.debug(`Using database ${dbConfig.DB_NAME}`);
  }
}

// Maps IDP API property : database column name
const API_MAP = {
  getMobileOriginatedMessages: {
    'category': 'api_call',
    'operation': 'get_return_messages',
    'ErrorID': 'error_id',
    'NextStartUTC': 'next_start_utc',
    'NextStartID': 'next_start_id',
    'More': 'more',
  },
  MessageMobileOriginated: {
    'category': 'message_mobile_originated',
    'ID': 'message_id',
    'MessageUTC': 'mailbox_receive_time',
    'ReceiveUTC': 'satellite_receive_time',
    'RegionName': 'satellite_region',
    'SIN': 'codec_service_id',
    'MIN': 'codec_message_id',
    'Name': 'codec_name',
    'MobileID': 'mobile_id',
    'OTAMessageSize': 'size',
    'RawPayload': 'payload_blob',
    'Payload': 'payload_json',
  },
  submitMobileTerminatedMessages: {
    'category': 'api_call',
    'operation': 'submit_messages',
    'ErrorID': 'error_id',
  },
  submitMobileTerminatedCancelations: {
    'category': 'api_call',
    'operation': 'submit_cancelations',
    'ErrorID': 'error_id',
  },
  getMobileTerminatedMessages: {
    'category': 'api_call',
    'operation': 'get_forward_messages',
    'ErrorID': 'error_id',
  },
  getMobileTerminatedStatuses: {
    'category': 'api_call',
    'operation': 'get_forward_statuses',
    'ErrorID': 'error_id',
    'NextStartUTC': 'next_start_utc',
    'More': 'more',
  },
  // MessageMobileTerminated applies to forward messages and statuses
  MessageMobileTerminated: {
    'category': 'message_mobile_terminated',
    'DestinationID': 'mobile_id',
    'ForwardMessageID': 'message_id',
    'OTAMessageSize': 'size',
    'StateUTC': 'state_time',
    // StateUTC for get_forward_statuses and StatusUTC for get_forward_messages?
    // 'StatusUTC': 'state_time',
    'ErrorID': 'error_id',
    'UserMessageID': 'user_message_id',
    'ScheduledSendUTC': 'scheduled_send_time',
    'TerminalWakeupPeriod': 'wakeup_period',
    'IsClosed': 'closed',
    'State': 'state_code',
    'ErrorID': 'error_id',
    // next set are returned by get_forward_messages
    'CreateUTC': 'submit_time',
    'ReferenceNumber': 'reference_number',
    'SIN': 'codec_service_id',
    'MIN': 'codec_message_id',
    'IsForward': 'codec_is_forward',
    'Name': 'codec_name',
    'RawPayload': 'payload_blob',
    'Payload': 'payload_json',
  },
  getMobileInfo: {
    'category': 'mobile',
    'ID': 'id',
    'Description': 'description',
    'LastRegistrationUTC': 'last_registration_time',
    'RegionName': 'satellite_region',
  },
  /*
  getBroadcastInfo: {
    'category': 'broadcast_group',
    'ID': 'id',
    'Description': 'description',
  },
  */
};

// Defines MySQL schema based on IDP API property map
const SCHEMA = {
  api_call: [
    'id INT NOT NULL AUTO_INCREMENT, PRIMARY KEY(id)',
    'category VARCHAR(25) DEFAULT "api_call"',
    'operation VARCHAR(45) NOT NULL',
    'success BOOLEAN NOT NULL',
    'call_time VARCHAR(45) NOT NULL',
    'gateway_url VARCHAR(45) DEFAULT NULL',
    'mailbox_id VARCHAR(45) DEFAULT NULL',
    'access_id VARCHAR(25) DEFAULT NULL',
    'error_id INT DEFAULT NULL',
    'error_description VARCHAR(45) DEFAULT NULL',
    'next_start_id INT DEFAULT NULL',
    'next_start_utc VARCHAR(25) DEFAULT NULL',
    'high_watermark VARCHAR(25) DEFAULT NULL',
    'message_count INT DEFAULT 0',
    // _ts timestamp and ttl time to live to align with CosmosDB
    '_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    `ttl INT DEFAULT ${dbConfig.apiCallLogTimeToLive}`,
  ],
  api_gateway: [
    'id INT NOT NULL AUTO_INCREMENT, PRIMARY KEY(id)',
    'category VARCHAR(25) DEFAULT "api_gateway"',
    'name VARCHAR(25) NOT NULL',
    'url VARCHAR(100) NOT NULL',
  ],
  mailbox: [
    'id INT NOT NULL AUTO_INCREMENT, PRIMARY KEY(id)',
    'category VARCHAR(25) DEFAULT "mailbox"',
    'description VARCHAR(25) NOT NULL',
    'api_gateway_name VARCHAR(25) NOT NULL',
    // mailbox_id could be different format on different message gateways
    'mailbox_id VARCHAR(25) NOT NULL',
    'access_id VARCHAR(25) NOT NULL',
    'password VARCHAR(25) NOT NULL',
    'message_definition_file BLOB DEFAULT NULL',
  ],
  mobile: [
    // Use Mobile ID as primary key as globally unique
    'id VARCHAR(15) NOT NULL, PRIMARY KEY(id)',
    'category VARCHAR(25) DEFAULT "mobile"',
    'description VARCHAR(50) DEFAULT ""',
    'mailbox_id VARCHAR(25) NOT NULL',
    'last_message_received_time TIMESTAMP DEFAULT NULL',
    'modem_hardware_version VARCHAR(10) DEFAULT NULL',
    'modem_firmware_version VARCHAR(10) DEFAULT NULL',
    'modem_product_id VARCHAR(10) DEFAULT NULL',
    'last_registration_time TIMESTAMP DEFAULT NULL',
    'registration_region VARCHAR(25) DEFAULT NULL',
    'wakeup_period INT DEFAULT 0',
    'broadcast_id_list VARCHAR(256) DEFAULT NULL',
    'modem_type VARCHAR(25) DEFAULT NULL',
    'asset_type VARCHAR(50) DEFAULT NULL',
    'location JSON DEFAULT NULL',
  ],
  /*
  broadcast_group: [
    // Use Broadcast ID as primary key as globally unique
    'id VARCHAR(15) NOT NULL, PRIMARY KEY(id)',
    'category VARCHAR(25) DEFAULT "broadcast_group"',
    'description VARCHAR(50) DEFAULT ""',
    'mailbox_id VARCHAR(25) NOT NULL',
    'beam_mask INT DEFAULT NULL',
    'retransmit_count TINYINT DEFAULT NULL',
  ],
  */
  message_mobile_originated: [
    // id not using gateway assigned messaging id due to possible overlap
    'id INT NOT NULL AUTO_INCREMENT, PRIMARY KEY(id)',
    'category VARCHAR(25) DEFAULT "message_mobile_originated"',
    'mobile_id VARCHAR(15) NOT NULL',
    'message_id BIGINT UNSIGNED NOT NULL',
    `${API_MAP.MessageMobileOriginated['MessageUTC']} TIMESTAMP DEFAULT NULL`,
    `${API_MAP.MessageMobileOriginated['ReceiveUTC']} TIMESTAMP DEFAULT NULL`,
    `${API_MAP.MessageMobileOriginated['SIN']} TINYINT UNSIGNED NOT NULL`,
    `${API_MAP.MessageMobileOriginated['MIN']} TINYINT UNSIGNED DEFAULT NULL`,
    // 'codec_is_forward BOOLEAN DEFAULT false',
    `size SMALLINT UNSIGNED DEFAULT NULL`,
    `${API_MAP.MessageMobileOriginated['RawPayload']} BLOB DEFAULT NULL`,
    `${API_MAP.MessageMobileOriginated['Payload']} JSON DEFAULT NULL`,
    `${API_MAP.MessageMobileOriginated['Name']} VARCHAR(50) DEFAULT NULL`,
    // Time to live compatible with Cosmos DB
    `ttl INT DEFAULT ${dbConfig.messageTimeToLive}`,

  ],
  message_mobile_terminated: [
    'id INT NOT NULL AUTO_INCREMENT, PRIMARY KEY(id)',
    'category VARCHAR(25) DEFAULT "message_mobile_terminated"',
    'mobile_id VARCHAR(15) NOT NULL',
    'message_id BIGINT UNSIGNED NOT NULL',
    `${API_MAP.MessageMobileTerminated['UserMessageID']} BIGINT DEFAULT NULL`,
    `size SMALLINT UNSIGNED DEFAULT NULL`,
    'submit_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    'error_id SMALLINT UNSIGNED DEFAULT NULL',
    `${API_MAP.MessageMobileTerminated['State']} TINYINT UNSIGNED DEFAULT NULL`,
    'state_description VARCHAR(25) DEFAULT NULL',
    'state_time TIMESTAMP DEFAULT NULL',
    'closed BOOLEAN DEFAULT NULL',
    `${API_MAP.MessageMobileTerminated['ScheduledSendUTC']} TIMESTAMP DEFAULT NULL`,
    `${API_MAP.MessageMobileTerminated['ReferenceNumber']} INT DEFAULT NULL`,
    `${API_MAP.MessageMobileTerminated['RawPayload']} BLOB DEFAULT NULL`,
    `${API_MAP.MessageMobileTerminated['Payload']} JSON DEFAULT NULL`,
    `${API_MAP.MessageMobileTerminated['SIN']} TINYINT UNSIGNED NOT NULL`,
    `${API_MAP.MessageMobileTerminated['MIN']} TINYINT UNSIGNED DEFAULT NULL`,
    `${API_MAP.MessageMobileTerminated['Name']} VARCHAR(50) DEFAULT NULL`,
    // Time to live compatible with Cosmos DB
    `ttl INT DEFAULT ${dbConfig.messageTimeToLive}`,
  ],
};

/**
 * Creates the database if it does not exist
 */
async function initialize() {
  let exists = await query(`SHOW DATABASES LIKE "${dbConfig.DB_NAME}"`);
  if (exists.length === 0) {
    await query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.DB_NAME}`);
    console.log(`Created database ${dbConfig.DB_NAME}`);
    await query(`USE ${dbConfig.DB_NAME}`);
    for (let tableName in SCHEMA) {
      if (SCHEMA.hasOwnProperty(tableName)) {
        let tQuery = `CREATE TABLE IF NOT EXISTS ${tableName}(`;
        const table = SCHEMA[tableName];
        for (let column=0; column < table.length; column++) {
          if (column > 0) tQuery += ', ';
          tQuery += table[column];
        }
        tQuery += ')';
        await query(tQuery);
        console.log(`Created table ${tableName}`);
      }
    }
  } else {
    await query(`USE ${dbConfig.DB_NAME}`);
    console.log(`Database ${dbConfig.DB_NAME} exists`);
  }
}

/**
 * Returns a dictionary of API property mappings based on item category
 * @param {Object} item The item to be mapped
 * @returns {Object} A dictionary map of API property name to db column name
 */
function getApiMap(item) {
  if (!item.category) throw new Error('Missing item.category for API map');
  for (let itemType in API_MAP) {
    if (API_MAP.hasOwnProperty(itemType)) {
      if (API_MAP[itemType]['category'] === item.category) {
        return API_MAP[itemType];
      }
    }
  }
}

function getTableSchema(item) {
  if (!item.category) throw new Error('Missing item.category for Table lookup');
  for (let tableName in SCHEMA) {
    if (SCHEMA.hasOwnProperty(tableName)) {
      if (tableName === item.category) return [tableName, getApiMap(item)];
    }
  }
}

/* COMMENT OUT FOR TEST ONLY
console.log('WARNING: DATABASE CREATION TEST MODE');
//const db = new DbConnection();
async function test() {
  //await db.initialize();
  //await db.end();
}
test();
// */

module.exports = DbConnection;

/*
module.exports = {
  connect,
  query,
  end,
  initialize,
  getTableSchema,
};
// */
