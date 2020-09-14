'use strict';

require('dotenv').config();
const crypto = require('crypto');
const algorithm = 'aes-256-ctr';
const IV_LENGTH = 16;
const cryptoSecret = process.env.MAILBOX_SECRET;

/**
 * Encrypts a string using AES-256
 * @param {string} text The text to encrypt
 * @returns {string} encrypted text (hex)
 */
function encrypt(text, secret){
  if (typeof(secret) === 'undefined') secret = cryptoSecret;
  if (text.length === 0 || typeof(secret) !== 'string') return text;
  const key = crypto.createHash('sha256').update(String(secret))
      .digest('base64').substr(0, 32);
  const keyBytes = Buffer.from(key, 'utf8');
  const ivBytes = crypto.randomBytes(IV_LENGTH);
  const ivText = ivBytes.toString('base64');
  const cipher = crypto.createCipheriv(algorithm, keyBytes, ivBytes);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return `${ivText}:${encrypted}`;
}
 
/**
 * Decrypts an AES-256 encrypted string
 * @param {string} text The text to decrypt
 * @returns {string} decrypted text (utf8)
 */
function decrypt(text, secret){
  if (typeof(secret) === 'undefined') secret = cryptoSecret;
  if (text.length === 0 || typeof(secret) !== 'string') return text;
  const key = crypto.createHash('sha256').update(String(secret))
      .digest('base64').substr(0, 32);
  const [ivText, encrypted] = text.split(':');
  const keyBytes = Buffer.from(key, 'utf8');
  const ivBytes = Buffer.from(ivText, 'base64');
  let decipher = crypto.createDecipheriv(algorithm, keyBytes, ivBytes);
  let decrypted = String(decipher.update(Buffer.from(encrypted, 'base64')));
  return decrypted;
}
 
module.exports = { encrypt, decrypt };

/* SELF-TEST
const testStr = 'this is a test';
let encrypted = encrypt(testStr);
console.log(encrypted);
console.log(decrypt(encrypted));
// */