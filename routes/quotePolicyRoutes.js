const express = require('express');
const { decryptData, encryptData, encryptionService, verifyToken } = require('../utils/encryption.utils');
const { dbConnect } = require('../database/config');
const { logger, childLogger, logDir } = require('../utils/logger.utils');
const { quickQuote } = require('../utils/quick-quote.utils');
const { computeFullQuote } = require('../utils/full-quote.utils');
const multer = require('multer');

const router = express.Router();
const csvParser = require('csv-parser');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { child } = require('winston');
const Razorpay = require('razorpay');
const { route } = require('./quotePolicyRoutes');

const RAZORPAY_KEY_ID = "rzp_test_W0q8bCk2g0pA4Z";
const RAZORPAY_KEY_SECRET = "u9V4n4v1qzK1Yl7SmHqXKq7V";

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.warn('Razorpay keys not configured');
}

const razorpay = (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET)
  ? new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET })
  : null;
router.get('/', (req, res) => {
    console.log('Received quote policy request:', req.body);
    res.status(200).send('Request received and being processed.');
});

router.post('/submit-claim', async (req, res) => {
    logger.info('Processing claim submission');
    try {
        const log = childLogger({ route: 'submit-claim' });
        var data = decryptData(req.body.encryptedData);
        if (!data) {
            log.error('Decrypted data is invalid');
            return res.status(400).send('Invalid encrypted data');

        }

        var collection = await dbConnect('Solymus', 'claimRejections');
        var response = await collection.insertOne({
            _id: data._id,
            name: encryptionService(data.name),
            policyNumber: data.policyNumber,
            insurer: encryptionService(data.insurer),
            reason: encryptionService(data.reason),
            phone: encryptionService(data.phone),
            email: encryptionService(data.email),
            redirectUrl: encryptionService(data.redirectUrl)
        });

        if (response.acknowledged) {
            log.debug('Claim rejection submitted successfully');
            res.status(200).send(encryptData({ message: 'Claim rejection submitted successfully' }));
        }

    } catch (error) {
        const log = childLogger({ route: 'submit-claim', error: error.message });
        log.error('Error processing claim submission', { error });
        res.status(500).send(encryptData({ message: 'Error processing claim submission' }));
    }


});

router.post('/quick', async (req, res) => {
    logger.info('Processing quick quote request');
    try {
        const log = childLogger({ route: 'quick-quote' });
        var data = decryptData(req.body.encryptedData);
        if (!data) {
            log.error('Decrypted data is invalid');
            return res.status(400).send('Invalid encrypted data');
        }
        var response = quickQuote({
            age: data.age,
            product: data.product,
            sumInsured: data.sumInsured,
            tenureYears: data.tenureYears,
            paymentFrequency: data.paymentFrequency,
            smoker: data.smoker
        })
        log.debug('Quick quote computed successfully', { quote: response });
        res.status(200).send(encryptData({ quote: response }));
    } catch (error) {
        log.error('Error processing quick quote request', { error });
        res.status(500).send(encryptData({ message: 'Error processing quick quote request' }));
    }
});

router.post('/full', async (req, res) => {
    logger.info('Processing full quote request');
    try {
        const log = childLogger({ route: 'full-quote' });
        var data = decryptData(req.body.encryptedData);
        if (!data) {
            log.error('Decrypted data is invalid');
            return res.status(400).send('Invalid encrypted data');
        }
        var collection = await dbConnect('Solymus', 'quoteRules');
        var response = await collection.find({}).toArray();

        log.debug('Full quote rules fetched successfully', { count: response.length });
        var result = await computeFullQuote(response, data);
        log.debug('Full quote computed successfully', { quote: result });
        res.status(200).send(encryptData({ quote: result }));
    } catch (error) {
        const log = childLogger({ route: 'full-quote', error: error.message });
        log.error('Error processing full quote request', { error });
        res.status(500).send(encryptData({ message: 'Error processing full quote request' }));
    }
})

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



    return {
        _id: id,
        minAge: parseInt(pick('minAge')),
        maxAge: parseInt(pick('maxAge')),
        basePremium: parseInt(pick('basePremium')),
        sumInsured: parseInt(pick('sumInsured')),
        addOns: String(pick('addOns') ?? '').trim(),
        effectiveFrom: String(pick('effectiveFrom') ?? '').trim(),
        productType: String(pick('productType') ?? '').trim()
    };
}


router.post('/bulk-upload', upload.single('file'), async (req, res) => {
    logger.info('Bulk uploading quote rules (file upload)');
    const log = childLogger({ route: 'bulk-upload-quote-rules' });

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
                minAge: (normalized.minAge),
                maxAge: (normalized.maxAge),
                basePremium: (normalized.basePremium),
                sumInsured: (normalized.sumInsured),
                addOns: encryptionService(normalized.addOns),
                effectiveFrom: encryptionService(normalized.effectiveFrom),
                productType: encryptionService(normalized.productType)
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
                log.error('JSON does not contain array of quote rules');
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
                let items = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.quoteRules) ? parsed.quoteRules : []);
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

        try { fs.unlinkSync(tmpPath); } catch (e) { }

        if (documents.length === 0) {
            log.warn('No valid quote rules documents to insert', { processedCount, invalidCount });
            return res.status(400).send(encryptData({ message: 'No valid records found in uploaded file', processedCount, invalidCount }));
        }


        const collection = await dbConnect('Solymus', 'quoteRules');
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
            route: 'bulk-upload-quote-rules',
            error: { message: error.message, stack: error.stack }
        });
        return res.status(500).send(encryptData({ message: 'Internal server error' }));
    }
});

router.post('/retrieve', async (req, res) => {
    logger.info('Processing Quote retrieval');
    try {
        const log = childLogger({ route: 'retrieve' });
        const data = await decryptData(req.body.encryptedData);
        if (!data) {
            log.error("data not present");
            res.status(500).send(encryptData({message:'data not present'}));
        };
        var collection = await dbConnect('Solymus','quotes');
        var response = await collection.find({_id : data._id}).toArray();
        log.debug('retrieveing data based on id');
        res.status(200).send(encryptData({message:'successfully retrieving data',data:response}));

    } catch (error) {
        const log = childLogger({route : 'retrieve'});
        log.error(error.message);
        res.status(500).send(encryptData({message:'internal server error'}));
    }
})

router.post('/purchase', async (req,res) => {
    logger.info('policy purhcase')
    try {
        const log = childLogger({route: 'policy purchase'})
        const data = decryptData(req.body.encryptedData)
        if (!data) {
            log.error('invalid data')
            res.status(400).send(encryptData({message:'invalid data'}));
        }
        const rulesColl = await dbConnect('Solymus', 'quoteRules');
    const pricingRules = await rulesColl.find({}).toArray();

    const quote = computeFullQuote(pricingRules, data.quoteRequest, { debug: false });
    const currency = (data.payment.currency || 'INR').toUpperCase();
    const amountInUnits = parseInt(quote.totalPayable || 0);
    const amountForProvider =  Math.round(amountInUnits * 100);

    const purchaseId = 'purchase';
    const now = new Date().toISOString();
    

    const orderOptions = {
      amount: amountForProvider,
      currency,
      receipt: purchaseId, 
      notes: { purchaseId, customerName: data.customer.name }
    };

    let order;
    
var instance = new Razorpay({ key_id: 'YOUR_KEY_ID', key_secret: 'YOUR_SECRET' })

order = await instance.orders.create({
  amount: 50000,
  currency: "INR",
  receipt: "receipt#1",
  notes: {
    key1: "value3",
    key2: "value2"
  }
})    
    } catch (error) {

        const log = childLogger({route : 'error'});
        log.error(error.message)
        res.status(500).send(encryptData({message : error.message}))
    }
});

router.post('/status/id' , async (req,res) => {
    logger.info('status id policy');
    try {
        const log = childLogger ({route : 'status id quote policy'});
        const data = await decryptData(req.body.encryptedData);
        if (!data) {
            log.error('invalid data');
            res.status(400).send(encryptData({message:'invalid data'}));
        };
        var collection = await dbConnect('Solymus' , 'policies');
        var response = await collection.find({_id : data._id}).toArray();
        log.debug('successful retrieval of policies');
        res.status(200).send(encryptData({message:'successful retrieval of policies' , data : response}));
    } catch (error) {
        const log = childLogger ( { route : 'status id quote policy'});
        log.error(error.message);
        res.status(500).send(encryptData({message : 'internal server error'}));
    }
})

module.exports = router;