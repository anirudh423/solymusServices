const crypto = require("crypto");
const { nanoid } = require("nanoid/non-secure");
const jwt = require('jsonwebtoken');

const secretKey = Buffer.from("qwertyuiopasdfghjklzxcvbnm123456"); 
const iv = Buffer.from("1234567890123456"); 


function encryptData(data) {
  try {
    const cipher = crypto.createCipheriv("aes-256-cbc", secretKey, iv);

    let encrypted = cipher.update(JSON.stringify(data), "utf-8", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Encryption failed");
  }
}

function decryptData(encryptedData) {
  try {
    const decipher = crypto.createDecipheriv("aes-256-cbc", secretKey, iv);
let decrypted = decipher.update(encryptedData, "hex", "utf-8"); 
decrypted += decipher.final("utf-8");
    return JSON.parse(decrypted);
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Decryption failed");
  }
}

function encryptionService(data) {
  try {
    const cipher = crypto.createCipheriv("aes-256-cbc", secretKey, iv);

    let encrypted = cipher.update(data, "utf-8", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Encryption failed");
  }
}

function decryptionService(encryptedData) {
  try {
    const decipher = crypto.createDecipheriv("aes-256-cbc", secretKey, iv);
let decrypted = decipher.update(encryptedData, "hex", "utf-8"); 
decrypted += decipher.final("utf-8");
    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Decryption failed");
  }
}

function generateToken(payload = {}, opts = {}) {
  const signOpts = {
    algorithm: 'HS256',
    expiresIn: '1h',
    issuer: 'solymus business solutions llp',
    audience: 'solymus business solutions llp clients',
    jwtid: opts.jwtid || nanoid(),
  };

  const safePayload = { ...payload }; 
  return jwt.sign(safePayload, Buffer.from("qwertyuiopasdfghjklzxcvbnm123456"), signOpts);
}


function verifyToken(token) {
  if (!token) throw new Error('NO_TOKEN_PROVIDED');

  const verifyOpts = {
    algorithms: ['HS256'],
    issuer: 'solymus business solutions llp',
    audience: 'solymus business solutions llp clients',
    clockTolerance: 5, 
  };

  return jwt.verify(token, Buffer.from('qwertyuiopasdfghjklzxcvbnm123456'), verifyOpts);
}



module.exports = {
  encryptData,
  decryptData,
    encryptionService,
    decryptionService,
    generateToken,
    verifyToken

};