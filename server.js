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
  "quoteRequest": {
    "productType": "health",
    "age": 35,
    "sumInsured": 500000,
    "paymentFrequency": "annual",
    "addOnsRequested": ["maternity","hospitalcash"]
  },
  "customer": {
    "name": "Rajesh Kumar",
    "email": "rajesh.kumar@example.com",
    "phone": "+919876543210",
    "customerId": "c_12345"  // optional internal id
  },
  "payment": {
    "provider": "stripe",         // "stripe" or "razorpay" (or "manual")
    "currency": "INR",            // currency code
    "returnUrl": "https://app.example.com/pay/complete" // for redirect flows
  },
  "idempotencyKey": "client-provided-unique-key-abc-123" // recommended
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

console.log('decrypted Data:', decryptData('a66836a0bd3449e5888914294676edc0'));

const token = generateToken(payloadFull); 
console.log('token:', token,'token');
console.log(encryptionService("Administrator"));
app.listen(3000, () => {
    console.log(`Server is running on port 3000`);
});