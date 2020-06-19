'use strict';
const dotenv = require('dotenv').config();
const crypto = require('crypto');
const algorithm = 'aes-256-cbc';
const key = process.env.CRYPTO_KEY;

/**
 * Encrypts a string using AES-256-CBC
 * @param {string} text The text to encrypt
 * @returns {string} encrypted text (hex)
 */
function encrypt(text){
  if (text.length === 0) return text;
  const cipher = crypto.createCipher(algorithm, key)
  let encrypted = cipher.update(text,'utf8','hex')
  encrypted += cipher.final('hex');
  return encrypted;
}
 
/**
 * Decrypts an AES-256-CBC encrypted string
 * @param {string} text The text to decrypt
 * @returns {string} decrypted text (utf8)
 */
function decrypt(text){
  if (text.length === 0) return text;
  const decipher = crypto.createDecipher(algorithm, key)
  let decrypted = decipher.update(text,'hex','utf8')
  decrypted += decipher.final('utf8');
  return decrypted;
}
 
module.exports = { encrypt, decrypt };
