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
  "customerId": "c_12345",    
  "name": "Rajesh Kumar",      
  "age": 35,
  "product": "health",        
  "sumInsured": 500000,        
  "tenureYears": 1,            
  "paymentFrequency": "annual" 
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

console.log('decrypted Data:', decryptData('b56ebe1a73fa1bf011cddc969db8813f79494ea0df44d25d03c84431db0d6fda2360f49b9f97da648f403cb32875cbd515af9ebbcf44c841014d916bac89c03504e4bb944c936d10aae6aa8bf4d1c17e8f12bf1bf9b3fe38276a0644c6fb4427c691ccc6116cec6de6819888e431e162312454ac53305fe22412b2379153ee1c51999ffacbdba962a02c166ad22df9b827e818173d473a90ca890371823d9d937e45b761eb624b65040eabd25bdf6f1b74ab38a72c984a29bfbd8da87d26a1ba98008683c83c08619601d8128f244fc3d8624551e1558fb3e76431875c6931a7ed68bc597ca5b8a9e8c8f02d03b6c89cec85640569dd5550fe3410f8a7cf895249c4a3213d8dc714de2cf242986d0af03fb08fee83eb4cba474fd590cda40e4431b26f96f2bf2f936a352752d34c8d5b3bfe3a2726c3fc48a8267606851d75e3a6d06169b0f604f6a116dabe52fc323f68eed09181b9bcdf30f67a3aeb9c0897a259e41cf24144be72fec61d1b2addcba16570ff9f7b1039394619d3570e9585e987b90f731e518626dcb09d55082123'));

const token = generateToken(payloadFull); 
console.log('token:', token,'token');
console.log(encryptionService("Administrator"));
app.listen(3000, () => {
    console.log(`Server is running on port 3000`);
});