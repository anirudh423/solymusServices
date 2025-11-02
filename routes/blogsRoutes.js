const express = require('express');
const { decryptData, encryptData, encryptionService, verifyToken } = require('../utils/encryption.utils');
const { dbConnect } = require('../database/config');
const { logger, childLogger, logDir } = require('../utils/logger.utils');
const router = express.Router();

router.post('/create', async (req,res) => {
    logger.info('Processing branch creation');
    try {
        const log =  childLogger({ route: 'create-branch' });

        var data = decryptData(req.body.encryptedData);
        if (!data) {
            log.error('Decrypted data is invalid');
            return res.status(400).send('Invalid encrypted data');
        }
        var collection = await dbConnect('Solymus', 'blogs');
        var response = await collection.insertOne({
            _id : data._id,
            title : encryptionService(data.title),
            slug : encryptionService(data.slug),
            category : encryptionService(data.category),
            tags : encryptData(data.tags),
            content : encryptionService(data.content),
            metaTitle : encryptionService(data.metaTitle),
            metaDescription : encryptionService(data.metaDescription),
            readTime : encryptionService(data.readTime),
            author : encryptionService(data.author)
        });
        if (!response.acknowledged) {
            log.debug('Blog not created successfully', { blogId: data._id });
            return res.status(400).send(encryptData({ message: 'Blog not created successfully' }));
        };
        log.debug('Blog created successfully', { blogId: data._id });
        res.status(200).send(encryptData({ message: 'Blog created successfully' }));
    } catch (error) {
        const log =  childLogger({ route: 'create-branch', error: error.message });
        log.error('Error processing branch creation', error);
        return res.status(500).send('Internal server error');
    }
});

router.post('/request', async (req,res) => {
    logger.info('Processing blog request');
    try {
        const log = childLogger({route : 'blog-request'});
        var collection = await dbConnect('Solymus', 'blogs');
        var response = await collection.find({}).toArray();
        log.debug('Blogs fetched successfully', { count: response.length });
        res.status(200).send(encryptData({ blogs: response }));
    } catch (error) {
        const log = childLogger({ route: 'blog-request', error: error.message });
        log.error('Error processing blog request', error);
        return res.status(500).send('Internal server error');
    }
});

router.post('/update', async (req,res) => {
    logger.info('Processing blog update');
    try {
        const log =  childLogger({ route: 'update-blog' });
        var data = decryptData(req.body.encryptedData);
        if (!data) {
            log.error('Decrypted data is invalid');
            return res.status(400).send('Invalid encrypted data');
        }

        var collection = await dbConnect('Solymus', 'blogs');
        var response = await collection.updateOne(
            { _id: data._id },
            {
                $set: {
                    title: encryptionService(data.title),
                    slug: encryptionService(data.slug),
                    category: encryptionService(data.category),
                    tags: encryptData(data.tags),
                    content: encryptionService(data.content),
                    metaTitle: encryptionService(data.metaTitle),
                    metaDescription: encryptionService(data.metaDescription),
                    readTime: encryptionService(data.readTime),
                    author: encryptionService(data.author)
                }
            }
        );
        if (!response.acknowledged) {
            log.debug('Blog not updated successfully', { blogId: data._id });
            return res.status(400).send(encryptData({ message: 'Blog not updated successfully' }));
        };
        log.debug('Blog updated successfully', { blogId: data._id });
        res.status(200).send(encryptData({ message: 'Blog updated successfully' }));
    } catch (error) {
        const log =  childLogger({ route: 'update-blog', error: error.message });
        log.error('Error processing blog update', error);
        return res.status(500).send('Internal server error');
    }
});

router.post('/delete', async (req,res) => {
    logger.info('Processing blog deletion');
    try {
        const log =  childLogger({ route: 'delete-blog' });
        var data = decryptData(req.body.encryptedData);
        if (!data) {
            log.error('Decrypted data is invalid');
            return res.status(400).send('Invalid encrypted data');
        }
        var collection = await dbConnect('Solymus', 'blogs');
        var response = await collection.deleteOne({ _id: data._id });
        if (!response.acknowledged) {
            log.debug('Blog not deleted successfully', { blogId: data._id });
            return res.status(400).send(encryptData({ message: 'Blog not deleted successfully' }));
        };
        log.debug('Blog deleted successfully', { blogId: data._id });
        res.status(200).send(encryptData({ message: 'Blog deleted successfully' }));
    } catch (error) {
        const log =  childLogger({ route: 'delete-blog', error: error.message });
        log.error('Error processing blog deletion', error);
        return res.status(500).send('Internal server error');
    }
});

module.exports = router;