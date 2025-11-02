const express = require('express');
const { decryptData, encryptData, encryptionService, verifyToken } = require('../utils/encryption.utils');
const { dbConnect } = require('../database/config');
const { logger, childLogger, logDir } = require('../utils/logger.utils');
const router = express.Router();

router.post('/create', async(req,res)=>{
    logger.info('Processing insurer creation');
    try {
        const log =  childLogger({ route: 'create-insurer' });

        var data = decryptData(req.body.encryptedData);
        if (!data) {
            log.error('Decrypted data is invalid');
            return res.status(400).send('Invalid encrypted data');
        }   
        var collection = await dbConnect('Solymus', 'insurers');
        
        var response = await collection.insertOne({
            _id:data._id,
            name:encryptionService(data.name),
            logoUrl:encryptionService(data.logoUrl),
            website:encryptionService(data.website),
            supportedProducts:encryptData(data.supportedProducts),
            forms:encryptData(data.forms)
        });
        if (!response.acknowledged) {
            log.debug('Insurer not created successfully', { insurerId: data._id });
            return res.status(400).send(encryptData({ message: 'Insurer not created successfully' }));
        };
        log.debug('Insurer created successfully', { insurerId: data._id });
        res.status(200).send(encryptData({ message: 'Insurer created successfully' }));

    } catch (error) {
        const log =  childLogger({ route: 'create-insurer', error: error.message });
        log.error('Error processing insurer creation', error);
        return res.status(500).send('Internal server error');
    }
});

router.post('/request', async (req,res) => {
    logger.info('Processing insurers request');
    try {
        const log = childLogger({route : 'insurer-request'});

        var collection = await dbConnect('Solymus', 'insurers');
        var response = await collection.find({}).toArray();
        log.debug('Insurers fetched successfully', { count: response.length });
        res.status(200).send(encryptData({ insurers: response }));
    } catch (error) {
        const log = childLogger({ route: 'insurer-request', error: error.message });
        log.error('Error processing insurer request', error);
        return res.status(500).send('Internal server error');
    }
});

router.post('/update', async (req,res) => {
    logger.info('Processing insurers update');
    try {
        const log = childLogger({ route: 'update-insurer' });
        var data = decryptData(req.body.encryptedData);
        if (!data) {
            log.error('Decrypted data is invalid');
            return res.status(400).send('Invalid encrypted data');
        }
        var collection = await dbConnect('Solymus', 'insurers');
        var response = await collection.updateOne(
            { _id: data._id },
            { $set: {
                name:encryptionService(data.name),
            logoUrl:encryptionService(data.logoUrl),
            website:encryptionService(data.website),
            supportedProducts:encryptData(data.supportedProducts),
            forms:encryptData(data.forms)
            } }
        );
        if (!response.acknowledged) {
            log.debug('Insurer not updated successfully', { insurerId: data._id });
            return res.status(400).send(encryptData({ message: 'Insurer not updated successfully' }));
        };
        log.debug('Insurer updated successfully', { insurerId: data._id });
        res.status(200).send(encryptData({ message: 'Insurer updated successfully' }));

    } catch (error) {
        const log = childLogger({ route: 'update-insurer', error: error.message });
        log.error('Error processing insurer update', error);
        return res.status(500).send('Internal server error');
    }
});

router.post('/delete', async (req,res) => {
    logger.info('Processing insurers deletion');
    try {
        const log = childLogger({ route: 'delete-insurer' });
        var data = decryptData(req.body.encryptedData);
        if (!data) {
            log.error('Decrypted data is invalid');
            return res.status(400).send('Invalid encrypted data');
        }
        var collection = await dbConnect('Solymus', 'insurers');
        var response = await collection.deleteOne({ _id: data._id });
        if (!response.acknowledged) {
            log.debug('Insurer not deleted successfully', { insurerId: data._id });
            return res.status(400).send(encryptData({ message: 'Insurer not deleted successfully' }));
        };
        log.debug('Insurer deleted successfully', { insurerId: data._id });
        res.status(200).send(encryptData({ message: 'Insurer deleted successfully' }));

    } catch (error) {
        const log = childLogger({ route: 'delete-insurer', error: error.message });
        log.error('Error processing insurer deletion', error);
        return res.status(500).send('Internal server error');
    }
})

module.exports = router;