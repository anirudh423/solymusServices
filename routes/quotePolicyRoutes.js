const express = require('express');
const { decryptData, encryptData, encryptionService } = require('../utils/encryption.utils');
const { dbConnect } = require('../database/config');
const { logger, childLogger, logDir } = require('../utils/logger.utils');
const { quickQuote } = require('../utils/quick-quote.utils');
const router = express.Router();

router.get('/', (req, res) => {
    console.log('Received quote policy request:', req.body);
    res.status(200).send('Request received and being processed.');
});

router.post('/submit-claim', async (req, res) => {
    logger.info('Processing claim submission');
    try {
        const log =  childLogger({ route: 'submit-claim' });
        var data = decryptData(req.body.encryptedData);
        if (!data) {
            log.error('Decrypted data is invalid');
            return res.status(400).send('Invalid encrypted data');

        }

        var collection = await dbConnect('Solymus', 'claimRejections');
        var response = await collection.insertOne({
            _id:data._id,
            name:encryptionService(data.name),
            policyNumber:data.policyNumber,
            insurer:encryptionService(data.insurer),
            reason:encryptionService(data.reason),
            phone:encryptionService(data.phone),
            email:encryptionService(data.email),
            redirectUrl:encryptionService(data.redirectUrl)
        });
        
        if (response.acknowledged) {
            log.debug('Claim rejection submitted successfully');
            res.status(200).send(encryptData({ message: 'Claim rejection submitted successfully' }));
        }

    } catch (error) {
        const log =  childLogger({ route: 'submit-claim', error: error.message });
        log.error('Error processing claim submission', { error });
        res.status(500).send(encryptData({ message: 'Error processing claim submission' }));
    }


});

router.post('/quick' , async (req,res) => {
    logger.info('Processing quick quote request');
    try {
        const log =  childLogger({ route: 'quick-quote' });
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
})

module.exports = router;