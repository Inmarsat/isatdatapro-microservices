'use strict';
const Model = require('./Model');
const category = require('./categories.json').satelliteGateway;

/**
 * Represents a satellite messaging gateway / network API
 * @constructor
 * @param {string} name A shorthand identifier for the satellite service operator
 * @param {string} url The URL of the satellite gateway/API
 */
function SatelliteGateway(name, url) {
  Model.call(this, category);
  this.name = typeof(name) === 'string' ? name : 'UNKNOWN';
  this.url = typeof(url) === 'string' ? url : 'https://';
  this.alive = true;   //: assume true on creation
  this.aliveChangeTimeUtc = '1970-01-01T00:00:00Z';
}

SatelliteGateway.prototype = Object.create(Model.prototype);
SatelliteGateway.prototype.constructor = SatelliteGateway;

module.exports = SatelliteGateway;
