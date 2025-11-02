const express = require('express');
const { decryptData, encryptData, encryptionService, verifyToken } = require('../utils/encryption.utils');
const { dbConnect } = require('../database/config');
const { logger, childLogger, logDir } = require('../utils/logger.utils');
const router = express.Router();

router.post('/create', async(req,res)=>{
    logger.info('Processing lead creation');
    try {
        const log =  childLogger({ route: 'create-lead' });

        var data = decryptData(req.body.encryptedData);
        if (!data) {
            log.error('Decrypted data is invalid');
            return res.status(400).send('Invalid encrypted data');
        }   
        var collection = await dbConnect('Solymus', 'leads');
        
        var response = await collection.insertOne({
            _id:data._id,
            name:encryptionService(data.name),
            phone:encryptionService(data.phone),
            source:encryptionService(data.source),
            insurerId:data.insurerId,
            formType:encryptionService(data.formType)
        });
        if (!response.acknowledged) {
            log.debug('Lead not created successfully', { leadId: data._id });
            return res.status(400).send(encryptData({ message: 'Lead not created successfully' }));
        };
        log.debug('Lead created successfully', { leadId: data._id });
        res.status(200).send(encryptData({ message: 'Lead created successfully' }));

    } catch (error) {
        const log =  childLogger({ route: 'create-lead', error: error.message });
        log.error('Error processing lead creation', error);
        return res.status(500).send('Internal server error');
    }
});

router.post('/request', async (req,res) => {
    logger.info('Processing lead request');
    try {
        const log = childLogger({route : 'lead-request'});

        var collection = await dbConnect('Solymus', 'leads');
        var response = await collection.find({}).toArray();
        log.debug('Leads fetched successfully', { count: response.length });
        res.status(200).send(encryptData({ leads: response }));
    } catch (error) {
        const log = childLogger({ route: 'lead-request', error: error.message });
        log.error('Error processing lead request', error);
        return res.status(500).send('Internal server error');
    }
});

router.post('/update', async (req,res) => {
    logger.info('Processing lead update');
    try {
        const log = childLogger({ route: 'update-lead' });
        var data = decryptData(req.body.encryptedData);
        if (!data) {
            log.error('Decrypted data is invalid');
            return res.status(400).send('Invalid encrypted data');
        }
        var collection = await dbConnect('Solymus', 'leads');
        var response = await collection.updateOne(
            { _id: data._id },
            { $set: {
                name:encryptionService(data.name),
            phone:encryptionService(data.phone),
            source:encryptionService(data.source),
            insurerId:data.insurerId,
            formType:encryptionService(data.formType)
            } }
        );
        if (!response.acknowledged) {
            log.debug('Lead not updated successfully', { leadId: data._id });
            return res.status(400).send(encryptData({ message: 'Lead not updated successfully' }));
        };
        log.debug('Lead updated successfully', { leadId: data._id });
        res.status(200).send(encryptData({ message: 'Lead updated successfully' }));

    } catch (error) {
        const log = childLogger({ route: 'update-lead', error: error.message });
        log.error('Error processing lead update', error);
        return res.status(500).send('Internal server error');
    }
});

router.post('/delete', async (req,res) => {
    logger.info('Processing lead deletion');
    try {
        const log = childLogger({ route: 'delete-lead' });
        var data = decryptData(req.body.encryptedData);
        if (!data) {
            log.error('Decrypted data is invalid');
            return res.status(400).send('Invalid encrypted data');
        }
        var collection = await dbConnect('Solymus', 'leads');
        var response = await collection.deleteOne({ _id: data._id });
        if (!response.acknowledged) {
            log.debug('Lead not deleted successfully', { leadId: data._id });
            return res.status(400).send(encryptData({ message: 'Lead not deleted successfully' }));
        };
        log.debug('Lead deleted successfully', { leadId: data._id });
        res.status(200).send(encryptData({ message: 'Lead deleted successfully' }));

    } catch (error) {
        const log = childLogger({ route: 'delete-lead', error: error.message });
        log.error('Error processing lead deletion', error);
        return res.status(500).send('Internal server error');
    }
})

module.exports = router;