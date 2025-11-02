const express = require('express');
const { decryptData, encryptData, encryptionService, verifyToken } = require('../utils/encryption.utils');
const { dbConnect } = require('../database/config');
const { logger, childLogger, logDir } = require('../utils/logger.utils');
const router = express.Router();
const csvParser = require('csv-parser');
const fs = require('fs');
const os = require('os');
const path = require('path');

router.post('/', async (req, res) => {
    logger.info('Processing hospitals');
    try {
        const log = childLogger({ route: 'hospitals' });



        var collection = await dbConnect('Solymus', 'hospitals');
        var response = await collection.find({}).toArray();
        if (!response) {
            log.error('No hospitals found');
            return res.status(404).send(encryptData({ message: 'No hospitals found' }));
        }
        log.debug('Hospitals retrieved successfully');
        res.status(200).send(encryptData({ message: 'Hospitals retrieved successfully', data: response }));
    } catch (error) {
        const log = childLogger({ route: 'hospitals', error: error.message });
        log.error('Error processing hospitals', { error });
        res.status(500).send(encryptData({ message: 'Error processing hospitals' }));
    }
});

router.post('/id', async (req,res)=>{
    logger.info('Processing hospital details by id');
    try {
        const log = childLogger({route : 'hospital-by-id'});
        var data = decryptData(req.body.encryptedData);
        if(!data){
            log.error('Decrypted data is invalid');
            return res.status(400).send(encryptData({message:'Invalid encrypted data'}));
        }
        var collection = await dbConnect('Solymus','hospitals');
        var response = await collection.find({_id:data._id}).toArray();
        if(!response || response.length === 0){
            log.error('Hospital not found');
            return res.status(404).send(encryptData({message : 'Hospital not found'}));
        }
        log.debug('Hospital details retrieved successfully');
        res.status(200).send(encryptData({message : 'Hospital details retrieved successfully', data : response}));
    } catch (error) {
        const log = childLogger({route : 'hospital-by-id', error: error.message });
        log.error('Error processing hospital by id', { error });
        res.status(500).send(encryptData({message : 'Error processing hospital by id'}));
    }
});

router.post('/addHospital', async(req,res)=>{
    logger.info('Adding new hospital');
    try {
        const log = childLogger({route : 'add-hospital'});
        var authHeader = req.headers.authorization;
        console.log('authHeader:', authHeader);
        if (!authHeader) {
            logger.error('token missing');
            return res.status(401).send(encryptData({ message: 'Authorization token missing' }));
        };
        if (!authHeader.startsWith('Bearer')) {
            logger.error('invalid token format');
            return res.status(403).send(encryptData({ message: 'Invalid token format' }));
        };
        const token = authHeader.slice(7).trim();
        console.log('verifying token:', token);
        let payload = verifyToken(token);
        if (!payload) {
            logger.error('invalid token');
            return res.status(403).send(encryptData({ message: 'Invalid token' }));
        };
        const isAdmin = (Array.isArray(payload.role) && payload.role.includes('Administrator')) || payload.role === 'Administrator';
        if (!isAdmin) {
            logger.error('role missing in token');
            return res.status(403).send(encryptData({ message: 'Role missing in token' }));

        };
        
        var data = decryptData(req.body.encryptedData);
        if(!data){
            log.error('Decrypted data is invalid');
            return res.status(400).send(encryptData({message:'Invalid encrypted data'}));
        }
        var collection = await dbConnect('Solymus','hospitals');
        var response = await collection.insertOne({
            _id:parseInt(data._id),
            name:encryptionService(data.name.toString()),
            address : encryptionService(data.address.toString()),
            city : encryptionService(data.city.toString()),
            state : encryptionService(data.state.toString()),
            pincode : encryptionService(data.pincode.toString()),
            services : encryptionService(data.services.toString()),
            phone : encryptionService(data.phone.toString()),
            lat : encryptionService(data.lat.toString()),
            lng : encryptionService(data.lng.toString())
        });
        if(response.acknowledged){
            log.debug('Hospital added successfully');
            res.status(200).send(encryptData({message : 'Hospital added successfully'}));
        }
    } catch (error) {
        const log = childLogger({route : 'add-hospital', error: error.message });
        log.error('Error adding hospital', { error });
        res.status(500).send(encryptData({message : 'Error adding hospital'}));
    }
})

const { ObjectId } = require('mongodb');
const multer = require('multer');

router.post('/id/update', async (req, res) => {
  logger.info('Updating hospital details by id');
  const log = childLogger({ route: 'update-hospital-by-id' });

  try {
    const authHeader = req.headers.authorization;
    log.debug('authHeader:', { authHeader });
    if (!authHeader) {
      logger.error('token missing');
      return res.status(401).send(encryptData({ message: 'Authorization token missing' }));
    }
    if (!authHeader.startsWith('Bearer ')) {
      logger.error('invalid token format');
      return res.status(403).send(encryptData({ message: 'Invalid token format' }));
    }

    const token = authHeader.slice(7).trim();
    let payload;
    try {
      payload = verifyToken(token);
    } catch (err) {
      logger.error('token verification failed', { err: { message: err.message, stack: err.stack } });
      return res.status(401).send(encryptData({ message: 'Invalid or expired token' }));
    }

    const isAdmin = (Array.isArray(payload.role) && payload.role.includes('Administrator'))
      || payload.role === 'Administrator'
      || (Array.isArray(payload.role) && payload.role.includes('admin'))
      || payload.role === 'admin';

    if (!isAdmin) {
      logger.warn('forbidden - insufficient role', { role: payload.role });
      return res.status(403).send(encryptData({ message: 'Admin role required' }));
    }

    if (!req.body || !req.body.encryptedData) {
      log.error('missing encryptedData in request body');
      return res.status(400).send(encryptData({ message: 'Missing encrypted data' }));
    }

    const data = decryptData(req.body.encryptedData);
    if (!data || !data._id) {
      log.error('Decrypted data invalid or missing _id', { data });
      return res.status(400).send(encryptData({ message: 'Invalid encrypted data' }));
    }

    let filterId = data._id;
    if (typeof filterId === 'string' && ObjectId.isValid(filterId)) {
      filterId = new ObjectId(filterId);
    } else if (typeof filterId === 'number') {
    } else if (typeof filterId === 'string') {
      const maybeNum = Number(filterId);
      if (!Number.isNaN(maybeNum)) filterId = maybeNum;
    }

    const upsertFields = {};
    const maybeSet = (key) => {
      if (data[key] !== undefined && data[key] !== null) {
        const raw = data[key].toString().trim();
        if (raw.length > 0) upsertFields[key] = encryptionService(raw);
      }
    };

    ['name','address','city','state','pincode','services','phone','lat','lng'].forEach(maybeSet);

    if (Object.keys(upsertFields).length === 0) {
      log.warn('no valid fields provided to update', { id: filterId });
      return res.status(400).send(encryptData({ message: 'No fields to update' }));
    }

    const collection = await dbConnect('Solymus', 'hospitals');
    const response = await collection.updateOne(
      { _id: filterId },
      { $set: upsertFields }
    );

    if (response && response.acknowledged) {
      if (response.modifiedCount && response.modifiedCount > 0) {
        log.info('Hospital updated successfully', { id: filterId, modifiedCount: response.modifiedCount });
        return res.status(200).send(encryptData({ message: 'Hospital updated successfully' }));
      } else {
        log.info('Update acknowledged but no changes applied', { id: filterId, result: response });
        return res.status(200).send(encryptData({ message: 'No changes made' }));
      }
    }

    log.error('update not acknowledged', { id: filterId, result: response });
    return res.status(500).send(encryptData({ message: 'Failed to update hospital' }));

  } catch (error) {
    logger.error('Unhandled error updating hospital', {
      route: 'update-hospital-by-id',
      error: { message: error.message, stack: error.stack }
    });
    return res.status(500).send(encryptData({ message: 'Internal server error' }));
  }
});

router.post('/id/delete', async (req,res)=>{
  logger.info('deleting hospital by id');
  try {
    const log = childLogger({route : 'delete-hospital-by-id'});
    var authHeader = req.headers.authorization;
    if (!authHeader) {
        log.error('token missing');
        return res.status(401).send(encryptData({ message: 'Authorization token missing' }));
    }
    if (!authHeader.startsWith('Bearer ')) {
        log.error('invalid token format');
        return res.status(403).send(encryptData({ message: 'Invalid token format' }));
    };
    const token = authHeader.slice(7).trim();
    let payload;
    try {
      payload = verifyToken(token);
    } catch (err) {
      log.error('token verification failed', { err: { message: err.message, stack: err.stack } });
      return res.status(401).send(encryptData({ message: 'Invalid or expired token' }));
    };
    const isAdmin = (Array.isArray(payload.role) && payload.role.includes('Administrator'))
      || payload.role === 'Administrator'
      || (Array.isArray(payload.role) && payload.role.includes('admin'))
      || payload.role === 'admin';
    if (!isAdmin) {
      log.warn('forbidden - insufficient role', { role: payload.role });
      return res.status(403).send(encryptData({ message: 'Admin role required' }));
    }
    var data = decryptData(req.body.encryptedData);
    if(!data || !data._id){
        log.error('Decrypted data is invalid or missing _id');
        return res.status(400).send(encryptData({message:'Invalid encrypted data'}));
    };
    let filterId = data._id;
    if (typeof filterId === 'string' && ObjectId.isValid(filterId)) {
      filterId = new ObjectId(filterId);
    } else if (typeof filterId === 'number') {
    } else if (typeof filterId === 'string') {
      const maybeNum = Number(filterId);
      if (!Number.isNaN(maybeNum)) filterId = maybeNum;
    };
    var collection = await dbConnect('Solymus','hospitals');
    var response = await collection.deleteOne({_id:filterId});
    if(response && response.acknowledged){
      if(response.deletedCount && response.deletedCount > 0){
        log.info('Hospital deleted successfully', {id:filterId, deletedCount: response.deletedCount});
        return  res.status(200).send(encryptData({message : 'Hospital deleted successfully'}));
      } else {
        log.info('No hospital found to delete', {id:filterId, result: response});
        return res.status(404).send(encryptData({message : 'No hospital found to delete'}));
      }
    };
  } catch (error) {
    log.error('Unhandled error deleting hospital', {
      route: 'delete-hospital-by-id',
      error: { message: error.message, stack: error.stack }
    });
    return res.status(500).send(encryptData({ message: 'Internal server error' }));
  }
});

const upload = multer({
  dest: path.join(os.tmpdir(), 'solymus-uploads'),
  limits: { fileSize: 10 * 1024 * 1024 } 
});


function normalizeRow(raw) {
  const pick = (k) => raw[k] !== undefined && raw[k] !== null ? raw[k] : undefined;

  const idRaw = pick('_id') ?? pick('id'); 
  if (idRaw === undefined || idRaw === '') return null;

  let id = idRaw;
  if (typeof idRaw === 'string' && /^[0-9]+$/.test(idRaw)) id = parseInt(idRaw, 10);

  const name = pick('name') ?? '';
  if (!name || String(name).trim().length === 0) return null;

  return {
    _id: id,
    name: String(name).trim(),
    address: String(pick('address') ?? '').trim(),
    city: String(pick('city') ?? '').trim(),
    state: String(pick('state') ?? '').trim(),
    pincode: String(pick('pincode') ?? '').trim(),
    services: String(pick('services') ?? '').trim(),
    phone: String(pick('phone') ?? '').trim(),
    lat: String(pick('lat') ?? '').trim(),
    lng: String(pick('lng') ?? '').trim()
  };
}


router.post('/bulk-upload', upload.single('file'), async (req, res) => {
  logger.info('Bulk uploading hospitals (file upload)');
  const log = childLogger({ route: 'bulk-upload-hospitals' });

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      log.error('token missing');
      return res.status(401).send(encryptData({ message: 'Authorization token missing' }));
    }
    if (!authHeader.startsWith('Bearer ')) {
      log.error('invalid token format');
      return res.status(403).send(encryptData({ message: 'Invalid token format' }));
    }

    const token = authHeader.slice(7).trim();
    let payload;
    try {
      payload = verifyToken(token);
    } catch (err) {
      log.error('token verification failed', { err: { message: err.message, stack: err.stack } });
      return res.status(401).send(encryptData({ message: 'Invalid or expired token' }));
    }

    const isAdmin = (Array.isArray(payload.role) && payload.role.includes('Administrator'))
      || payload.role === 'Administrator'
      || (Array.isArray(payload.role) && payload.role.includes('admin'))
      || payload.role === 'admin';
    if (!isAdmin) {
      log.error('role missing in token');
      return res.status(403).send(encryptData({ message: 'Admin role required' }));
    }

    if (!req.file) {
      log.error('no file uploaded');
      return res.status(400).send(encryptData({ message: 'No file uploaded' }));
    }

    const tmpPath = req.file.path;
    const originalName = req.file.originalname || '';
    const ext = path.extname(originalName).toLowerCase();

    const documents = [];
    let invalidCount = 0;
    let processedCount = 0;

    function pushDoc(normalized) {
      if (!normalized) {
        invalidCount++;
        return;
      }
      const doc = {
        _id: normalized._id,
        name: encryptionService(normalized.name),
        address: encryptionService(normalized.address || ''),
        city: encryptionService(normalized.city || ''),
        state: encryptionService(normalized.state || ''),
        pincode: encryptionService(normalized.pincode || ''),
        services: encryptionService(normalized.services || ''),
        phone: encryptionService(normalized.phone || ''),
        lat: encryptionService(normalized.lat || ''),
        lng: encryptionService(normalized.lng || '')
      };
      documents.push(doc);
    }

    const isJson = ext === '.json' || req.file.mimetype === 'application/json' || req.file.mimetype === 'text/json';
    const isCsv = ext === '.csv' || req.file.mimetype === 'text/csv' || req.file.mimetype === 'application/vnd.ms-excel';

    if (isJson) {
      const raw = fs.readFileSync(tmpPath, 'utf8');
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        fs.unlinkSync(tmpPath);
        log.error('JSON parse error', { message: err.message });
        return res.status(400).send(encryptData({ message: 'Uploaded JSON is invalid' }));
      }

      let items = [];
      if (Array.isArray(parsed)) items = parsed;
      else if (parsed && Array.isArray(parsed.hospitals)) items = parsed.hospitals;
      else {
        fs.unlinkSync(tmpPath);
        log.error('JSON does not contain array of hospitals');
        return res.status(400).send(encryptData({ message: 'JSON must be array or { hospitals: [...] }' }));
      }

      items.forEach(raw => {
        const normalized = normalizeRow(raw);
        if (normalized) {
          pushDoc(normalized);
        } else {
          invalidCount++;
        }
        processedCount++;
      });

    } else if (isCsv) {
      await new Promise((resolve, reject) => {
        const stream = fs.createReadStream(tmpPath)
          .pipe(csvParser({ mapHeaders: ({ header }) => header.trim() }))
          .on('data', (row) => {
            processedCount++;
            const normalized = normalizeRow(row);
            if (normalized) pushDoc(normalized);
            else invalidCount++;
          })
          .on('end', () => resolve())
          .on('error', (err) => reject(err));
      });
    } else {
      try {
        const raw = fs.readFileSync(tmpPath, 'utf8');
        const parsed = JSON.parse(raw);
        let items = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.hospitals) ? parsed.hospitals : []);
        if (items.length === 0) throw new Error('not-json-array');
        items.forEach(raw => {
          const normalized = normalizeRow(raw);
          if (normalized) pushDoc(normalized);
          else invalidCount++;
          processedCount++;
        });
      } catch (err) {
        await new Promise((resolve, reject) => {
          fs.createReadStream(tmpPath)
            .pipe(csvParser({ mapHeaders: ({ header }) => header.trim() }))
            .on('data', (row) => {
              processedCount++;
              const normalized = normalizeRow(row);
              if (normalized) pushDoc(normalized);
              else invalidCount++;
            })
            .on('end', () => resolve())
            .on('error', (err2) => reject(err2));
        });
      }
    }

    try { fs.unlinkSync(tmpPath); } catch (e) {}

    if (documents.length === 0) {
      log.warn('No valid hospital documents to insert', { processedCount, invalidCount });
      return res.status(400).send(encryptData({ message: 'No valid records found in uploaded file', processedCount, invalidCount }));
    }

   
    const collection = await dbConnect('Solymus', 'hospitals');
    let insertResult;
    try {
      insertResult = await collection.insertMany(documents, { ordered: false });
    } catch (insertErr) {
      log.error('insertMany returned error', { error: { message: insertErr.message, writeErrors: insertErr.writeErrors?.length ?? 0 } });
      insertResult = insertErr.result || insertErr;
    }

    const insertedCount = insertResult.insertedCount || (insertResult.nInserted || 0);
    const failedCount = processedCount - insertedCount;

    log.info('Bulk upload summary', { processedCount, insertedCount, failedCount, invalidCount });

    return res.status(200).send(encryptData({
      message: 'Bulk upload completed',
      processedCount,
      insertedCount,
      failedCount,
      invalidCount
    }));
  } catch (error) {
    log.error('Unhandled error during bulk upload', {
      route: 'bulk-upload-hospitals',
      error: { message: error.message, stack: error.stack }
    });
    return res.status(500).send(encryptData({ message: 'Internal server error' }));
  }
});

module.exports = router;