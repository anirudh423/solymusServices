const express = require('express');
const cors = require('cors');

const app =     express();
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
  _id:0
}



),'dncrypted Data'

);

console.log('encryption' , encryptionService("[{\"code\":\"maternity\",\"type\":\"percent\",\"value\":0.02},{\"code\":\"hospitalcash\",\"type\":\"absolute\",\"value\":200}]") , 'encryption');

const payloadFull = {
  userId: 'u_12345',
  name: 'Anirudh Pandit',
  email: 'anirudh.pandit@example.com',
  role: 'Administrator',
  tenantId: 'solymus-corp'
};

console.log('decrypted Data:', decryptData('35af95f7a0e3173039c7de1e428495f3527472889852b88f18f912a11babcbeeeb7217ee6f92d32680629d9421b0cbbb313f8feb7ab0168894a52c02a5e5b92d41abc08b93e2f6380b59a34d4ed3b495c481ab009a2def6d1bd65d22a43e1ff89b3cbb54c218dec6a8e9494e9b36c204df1981ec30ca50f08d3a6b773a3ce838a2c94d739d1f57c1c93c6785919ea633e598f771f624f3b4c15aef78a872c083'));

const token = generateToken(payloadFull); 
console.log('token:', token,'token');
console.log(encryptionService("Administrator"));
app.listen(3000, () => {
    console.log(`Server is running on port 3000`);
});