const express = require('express');
const { decryptData, encryptData, encryptionService, verifyToken } = require('../utils/encryption.utils');
const { dbConnect } = require('../database/config');
const { logger, childLogger, logDir } = require('../utils/logger.utils');
const router = express.Router();

router.post('/create', async(req,res)=>{
    logger.info('Processing branch creation');
    try {
        const log =  childLogger({ route: 'create-branch' });

        var data = decryptData(req.body.encryptedData);
        if (!data) {
            log.error('Decrypted data is invalid');
            return res.status(400).send('Invalid encrypted data');
        }   
        var collection = await dbConnect('Solymus', 'branches');
        
        var response = await collection.insertOne({
            _id:data._id,
            name:encryptionService(data.name),
            address :encryptionService(data.address),
            city:encryptionService(data.city),
            state:encryptionService(data.state),
            contactPerson:encryptionService(data.contactPerson),
            phone:encryptionService(data.phone),
            workingHours:encryptionService(data.workingHours)
        });
        if (!response.acknowledged) {
            log.debug('Branch not created successfully', { branchId: data._id });
            return res.status(400).send(encryptData({ message: 'Branch not created successfully' }));
        };
        log.debug('Branch created successfully', { branchId: data._id });
        res.status(200).send(encryptData({ message: 'Branch created successfully' }));
        
    } catch (error) {
        const log =  childLogger({ route: 'create-branch', error: error.message });
        log.error('Error processing branch creation', error);
        return res.status(500).send('Internal server error');
    }
});

router.post('/request', async (req,res) => {
    logger.info('Processing branch request');
    try {
        const log = childLogger({route : 'branch-request'});
        
        var collection = await dbConnect('Solymus', 'branches');
        var response = await collection.find({}).toArray();
        log.debug('Branches fetched successfully', { count: response.length });
        res.status(200).send(encryptData({ branches: response }));
    } catch (error) {
        const log = childLogger({ route: 'branch-request', error: error.message });
        log.error('Error processing branch request', error);
        return res.status(500).send('Internal server error');
    }
});

router.post('/update', async (req,res) => {
    logger.info('Processing branch update');
    try {
        const log = childLogger({ route: 'update-branch' });
        var data = decryptData(req.body.encryptedData);
        if (!data) {
            log.error('Decrypted data is invalid');
            return res.status(400).send('Invalid encrypted data');
        }
        var collection = await dbConnect('Solymus', 'branches');
        var response = await collection.updateOne(
            { _id: data._id },
            { $set: {
                name: encryptionService(data.name),
                address: encryptionService(data.address),
                city: encryptionService(data.city),
                state: encryptionService(data.state),
                contactPerson: encryptionService(data.contactPerson),
                phone: encryptionService(data.phone),
                workingHours: encryptionService(data.workingHours)
            } }
        );
        if (!response.acknowledged) {
            log.debug('Branch not updated successfully', { branchId: data._id });
            return res.status(400).send(encryptData({ message: 'Branch not updated successfully' }));
        };
        log.debug('Branch updated successfully', { branchId: data._id });
        res.status(200).send(encryptData({ message: 'Branch updated successfully' }));

    } catch (error) {
        const log = childLogger({ route: 'update-branch', error: error.message });
        log.error('Error processing branch update', error);
        return res.status(500).send('Internal server error');
    }
});

router.post('/delete', async (req,res) => {
    logger.info('Processing branch deletion');
    try {
        const log = childLogger({ route: 'delete-branch' });
        var data = decryptData(req.body.encryptedData);
        if (!data) {
            log.error('Decrypted data is invalid');
            return res.status(400).send('Invalid encrypted data');
        }
        var collection = await dbConnect('Solymus', 'branches');
        var response = await collection.deleteOne({ _id: data._id });
        if (!response.acknowledged) {
            log.debug('Branch not deleted successfully', { branchId: data._id });
            return res.status(400).send(encryptData({ message: 'Branch not deleted successfully' }));
        };
        log.debug('Branch deleted successfully', { branchId: data._id });
        res.status(200).send(encryptData({ message: 'Branch deleted successfully' }));

    } catch (error) {
        const log = childLogger({ route: 'delete-branch', error: error.message });
        log.error('Error processing branch deletion', error);
        return res.status(500).send('Internal server error');
    }
})

module.exports = router;