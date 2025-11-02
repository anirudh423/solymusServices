const express = require('express');
const cors = require('cors');

const app = express();
const quotePolicyRoutes =   require('./routes/quotePolicyRoutes');
const hospitalRoutes =  require('./routes/hospitalRoutes');
const branchRoutes = require('./routes/branchesRoutes');
const blogsRoutes = require('./routes/blogsRoutes');
const leadsRoutes = require('./routes/leadsRoutes');
const insurersRoutes = require('./routes/insurersRoutes');
const contactRoutes = require('./routes/contactRoutes');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { encryptData, decryptData, encryptionService, generateToken } = require('./utils/encryption.utils');
const rateLimit = require('express-rate-limit');

const PORT = process.env.PORT || 3000;

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 200, 
  standardHeaders: true, 
  legacyHeaders: false,  
  message: { error: 'Too many requests, please try again later.' },
  handler: (req, res, next, options) => {
    
    res.status(options.statusCode).json(options.message);
  }
});

app.use(cors(
    {
        origin: 'http://localhost:5173',
        methods: ['POST'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        credentials: true,
        maxAge: 600
    }
));

app.use(globalLimiter);

app.use(express.json());

app.use('/api/quotePolicy', quotePolicyRoutes, createProxyMiddleware({
    target: 'http://localhost:3001',
    changeOrigin: true,
    
}));

app.use('/api/hospitals', hospitalRoutes,createProxyMiddleware({
    target: 'http://localhost:3002',
    changeOrigin: true,
}));

app.use('/api/branches', branchRoutes,createProxyMiddleware({
    target: 'http://localhost:3003',
    changeOrigin: true,
}));

app.use('/api/blogs', blogsRoutes,createProxyMiddleware({
    target: 'http://localhost:3004',
    changeOrigin: true,
}));

app.use('/api/leads', leadsRoutes,createProxyMiddleware({
    target: 'http://localhost:3005',
    changeOrigin: true,
}));

app.use('/api/insurers', insurersRoutes,createProxyMiddleware({
    target: 'http://localhost:3006',
    changeOrigin: true,
}));

app.use('/api/contact', contactRoutes,createProxyMiddleware({
    target: 'http://localhost:3007',
    changeOrigin: true,
}));

console.log('Encrypted Data:', 
encryptData({
  "_id": "lead_20251102_0001"
}



),'dncrypted Data'

);


const payloadFull = {
  userId: 'u_12345',
  name: 'Anirudh Pandit',
  email: 'anirudh.pandit@example.com',
  role: 'Administrator',
  tenantId: 'solymus-corp'
};

console.log('decrypted Data:', decryptData('aa6312d7b15ef6b5460b0c0b82e91d80d27f3ea43ddcd891a805c2ec195a60a12a5007cde3480a61ee2375544df034ef6b4f7cc0098369c59c062f547306b76a8a1346acd70d03a8ebbf327d7244cddd8f8169bb7748fa925141209f6f0a25b34eec8219c2d682884037640921b70a4cd200a892646d741e7dce16a29175d2b741545946be208931148cf943f6cc8e040f4d449895dd62c5c2d9a6e8a0e2696e1e494ecf662c95ecc788d0fec060ad4606009d79ba7fb1428c87b9bcbc97ca333bc29d827e860e9cce36de5694d0d353214cff1e67dd4d57f9b346444e15f29899a02f787195e586f8c4843db56c51e8ae1327cd9741036777a48da297d8edc51f3464322c1be61acf35aca845e2086599450bf25b172cabbbd9f8b11cf9ecefc6f20b46b2efc1792b04fe01b30467d683bd26da38e3a5557e9fc16e8272991114bf7f8f1af106b57ba424bd7cc0e7340b2a9eb5be5924c573b0c385251f1a69ac6c633ace197dce1392b910af9ab4cbe8e10c5f4a37c045387c22c138d59002f72c3dce70f806cadf29b8d40c83ae09087b2f2da95dacad733421c82cd230a228a1f8a762599b2ca0a67fa880e48b9cd4e3b53e137018cbfadbbcf293dd51d23f9465822f2dfaff1be30a42c0c63489fa32bd82f126be6adedf5a2f7012c2c210bb7622399672dcdb2999d5c458577a618680d75529869df0695b79652071411f45f61e56b7191e98517c925020c76f8d910691dd5b5245a674637b987575a845e74a64aaf1a76a6094b23415baad75de377fda0153b5d7318bb6cf3e07bfe6ec4bf0c01b89cfe2b5cbaf279eebd9ec021d2fcb0a5160392631f1b4e8bdbbcf193272ffde3aa4cfca6e196757d84774fc4266bf5d414e0d3983383a7f278a657dee63c39f67a965901f86ab5d389a0724eac58e5b3cfbd19a6b7f6990dfb047c1ab74c0f1afa14c61b4a73c426be79d1f535357dc5e774aef2565ba9edca787b09c29d882807b1e8f5c8aec6f946e2289f56332cb97cff59d881a846cdcc2359b36765f7346a855a8f396108d39da0f22c5eec3fcf42e9aa1c9a0f90873e23c7e662166b015cdd56d21aba52ef67e926618f9372ca04e3b4bca8392f45826a98e263645818c39b75f09efd458e867a7bb9c41eb8747c32ee3dc2446367994578c9d5228a65db02a26944b46386378d9911d24f7458fc6ef982b8266acb5cc2f75c118942e77492eaeb1111977c4608999dfde54698c689d078bdcd8e78bd98e920f9355c35f098b52998ab013504bbdabce9e70e67b59d08fa21192f79afd6a2d436950b0fbef0b541a7bbffc3f77ca2e8d8f7550a4327e264e728f7e735fc30b1300d543cafc80f6ca6a07ebcf614ac877b38b2986f1343f6e62b932cd5d4bf52cf9cdfb631a97ae5e5ad1214eb60ec9cca5e8ae7d381a36a04004897626e383a09c7635751d81055ffa5609f1afe3dca0ba95b3937e7929c48cd116b3dbd329ea48052c5f1e4d09d3a9495bf67f21c5387e45ea192f2ee360dca4d0cb91d9ea117733b2c878e6f760e1b282e091319808253d443e9c961f331392537cb49311cf2005d6ff9cb5606a9269ad08d5b3e6c497a6fa72a576d7a73236827b8c0097e90d1f574acccf539bdf7239a92e6c8d2100e2ecc910c3a621359a6a219c83943dc3c7b300d0a9b502b5c71dd71b113ba2e690d0e774d0a25a9947963f1f1bdcfdde1777921ce7c63087908c9a73bf4c4d1623f4a169dbd6f628130134cae16cab90a0b527c19018a9b2340e75cbfff631a17b9d899eca8b78ddba52474ab0909278916630691936810a357ae3cf79d5579754d4267915bdb23cd8f61db477'));

const token = generateToken(payloadFull); 
console.log('token:', token,'token');
console.log(encryptionService("Administrator"));
app.listen(3000, () => {
    console.log(`Server is running on port 3000`);
});