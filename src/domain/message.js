import Entity from './entity';

class ReturnMessage extends Entity {
  constructor(id) {
    super('message_return');
    this.id = id;
    this.receiveTimeUtc = '';
    this.mailboxTimeUtc = '';
    this.payload_raw = [];
    this.payload_json = {};
  }
}

class ForwardMessage extends Entity {
  constructor(id) {
    super('message_forward');
    this.id = id;
    this.stateTimeUtc = '';
    this.mailboxTimeUtc = '';
    this.payload_raw = [];
    this.payload_json = {};
  }
}