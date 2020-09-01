'use strict';
const Model = require('./Model');
const category = require('./categories.json').satelliteGateway;

function SatelliteGateway(name, url) {
  Model.call(this, category);
  this.name = typeof(name) === 'string' ? name : null;
  this.url = typeof(url) === 'string' ? url : null;
  this.alive = true;   //: assume true on creation
  this.aliveChangeTimeUtc = '1970-01-01T00:00:00Z';
}

SatelliteGateway.prototype = Object.create(Model.prototype);
SatelliteGateway.prototype.constructor = SatelliteGateway;

module.exports = SatelliteGateway;
