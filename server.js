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

console.log('encryption' , encryptionService("[{\"code\":\"maternity\",\"type\":\"percent\",\"value\":0.02},{\"code\":\"hospitalcash\",\"type\":\"absolute\",\"value\":200}]") , 'encryption');

const payloadFull = {
  userId: 'u_12345',
  name: 'Anirudh Pandit',
  email: 'anirudh.pandit@example.com',
  role: 'Administrator',
  tenantId: 'solymus-corp'
};

console.log('decrypted Data:', decryptData('b56ebe1a73fa1bf011cddc969db8813f5ef9b50c13d7f2cb4a931bdc197a271d4a169a11d2a38e3c8c6df3ede56794cc4160a7e6e57b38fa5c3a49f7fcfbcbc2feba84364d0fb151b276c0c9528d195e998134d45558c50f9935c8fc311a9f09e655ada452d1437302330c89f80769a85a444a740ac88bfca6fd5e8fa8795f272d9041ab529820b185c8c60c7cb777324754ef70b2d13462f6e4f5fd294ed1abd74598c7b17d072ddc3da9047624aa8b598f624697931ac202076c922ba038b528e8a7801f81e3834f9cb852ea29da3d4a7dcc0bbd005a2ebbe012ee288d87927c7fc8427288bc1bc888baa12e2980b62d074237808285557fa1f95b3d3e9396d991270bb1a6cde362bb5beb1217bc39906d7b975c29a9d96ae566f31c48f35bb2cf4372729c0e4326f0f69e6363349fc3c9e41db7451be1148f20ac96057e2e9e27a518bb2500744ed96c525a485b99ded2ca6eb843f6a74bfa500437c9e516cec3919237b86ef86eddadc1746eb2955616aa08513265a871ab62e783c9e1a714cc26fb0d729aba3784162a68114d99319d51cd3586f8679631d99ed824e51af4f120f8f34feffa4d295466b0ecd0d26e6f05a0c5b346bee861e5a8be7fcfaa22c5e8a53a2b226cbc9abfd88385d44948715110c07873e752c3191d2d528f05a9a6e212fb65738924f78f8cd18bec3fc6e0dffc8482f475b96d028c2e98a957e4e80da5ef69b23a8f5872759681ab2b9fe96a28be397f6456233aece5bf0d37acd9790e926bd3664bdc2b6f72337719'));

const token = generateToken(payloadFull); 
console.log('token:', token,'token');
console.log(encryptionService("Administrator"));
app.listen(3000, () => {
    console.log(`Server is running on port 3000`);
});