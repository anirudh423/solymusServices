const express = require('express');
const { decryptData, encryptData, encryptionService, verifyToken } = require('../utils/encryption.utils');
const { dbConnect } = require('../database/config');
const { logger, childLogger, logDir } = require('../utils/logger.utils');
const router = express.Router();

router.post('/create', async(req,res)=>{
    logger.info('Processing contact creation');
    try {
        const log =  childLogger({ route: 'create-contact' });

        var data = decryptData(req.body.encryptedData);
        if (!data) {
            log.error('Decrypted data is invalid');
            return res.status(400).send('Invalid encrypted data');
        }   
        var collection = await dbConnect('Solymus', 'contacts');
        
        var response = await collection.insertOne({
            _id:data._id,
            name:encryptionService(data.name),
            email:encryptionService(data.email),
            phone:encryptionService(data.phone),
            message:encryptData(data.message),
            serviceInterest:encryptData(data.serviceInterest)
        });
        if (!response.acknowledged) {
            log.debug('Contact not created successfully', { contactId: data._id });
            return res.status(400).send(encryptData({ message: 'Contact not created successfully' }));
        };
        log.debug('Contact created successfully', { contactId: data._id });
        res.status(200).send(encryptData({ message: 'Contact created successfully' }));

    } catch (error) {
        const log =  childLogger({ route: 'create-contact', error: error.message });
        log.error('Error processing contact creation', error);
        return res.status(500).send('Internal server error');
    }
});

router.post('/request', async (req,res) => {
    logger.info('Processing contact request');
    try {
        const log = childLogger({route : 'contact-request'});

        var collection = await dbConnect('Solymus', 'contacts');
        var response = await collection.find({}).toArray();
        log.debug('Contacts fetched successfully', { count: response.length });
        res.status(200).send(encryptData({ contacts: response }));
    } catch (error) {
        const log = childLogger({ route: 'contact-request', error: error.message });
        log.error('Error processing contact request', error);
        return res.status(500).send('Internal server error');
    }
});

router.post('/update', async (req,res) => {
    logger.info('Processing contact update');
    try {
        const log = childLogger({ route: 'update-contact' });
        var data = decryptData(req.body.encryptedData);
        if (!data) {
            log.error('Decrypted data is invalid');
            return res.status(400).send('Invalid encrypted data');
        }
        var collection = await dbConnect('Solymus', 'contacts');
        var response = await collection.updateOne(
            { _id: data._id },
            { $set: {
                name:encryptionService(data.name),
            email:encryptionService(data.email),
            phone:encryptionService(data.phone),
            message:encryptData(data.message),
            serviceInterest:encryptData(data.serviceInterest)
            } }
        );
        if (!response.acknowledged) {
            log.debug('Contact not updated successfully', { contactId: data._id });
            return res.status(400).send(encryptData({ message: 'Contact not updated successfully' }));
        };
        log.debug('Contact updated successfully', { contactId: data._id });
        res.status(200).send(encryptData({ message: 'Contact updated successfully' }));

    } catch (error) {
        const log = childLogger({ route: 'update-contact', error: error.message });
        log.error('Error processing contact update', error);
        return res.status(500).send('Internal server error');
    }
});

router.post('/delete', async (req,res) => {
    logger.info('Processing contacts deletion');
    try {
        const log = childLogger({ route: 'delete-contacts' });
        var data = decryptData(req.body.encryptedData);
        if (!data) {
            log.error('Decrypted data is invalid');
            return res.status(400).send('Invalid encrypted data');
        }
        var collection = await dbConnect('Solymus', 'contacts');
        var response = await collection.deleteOne({ _id: data._id });
        if (!response.acknowledged) {
            log.debug('Contact not deleted successfully', { contactId: data._id });
            return res.status(400).send(encryptData({ message: 'Contact not deleted successfully' }));
        };
        log.debug('Contact deleted successfully', { contactId: data._id });
        res.status(200).send(encryptData({ message: 'Contact deleted successfully' }));

    } catch (error) {
        const log = childLogger({ route: 'delete-contact', error: error.message });
        log.error('Error processing contact deletion', error);
        return res.status(500).send('Internal server error');
    }
})

module.exports = router;