// server.cjs
const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Get ML service URL from environment (Render provides this)
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'https://object-detection-ml-58ow.onrender.com';

// Middlewares
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Uploads
const upload = multer({ dest: path.join(__dirname, 'uploads') });

// ===== RATE LIMITING =====
// Protect detection endpoint from abuse
const detectLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 requests per 15 min per IP
  message: { 
    error: 'Too many detection requests from this IP.',
    message: 'Please try again in 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  // Skip successful requests from counting (optional)
  skipSuccessfulRequests: false,
  // Custom handler for when limit is exceeded
  handler: (req, res) => {
    console.log(`⚠️ Rate limit exceeded: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: '15 minutes',
      limit: 10,
      window: '15 minutes'
    });
  }
});

// General API rate limiter (less strict)
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Max 30 requests per minute
  message: { error: 'Too many API requests. Please slow down.' }
});

// Apply rate limiters
app.use('/api/detect', detectLimiter); // Strict limit for ML detection
app.use('/api', apiLimiter); // General limit for all API calls

// ===== LOGGING & MONITORING =====
// Log all API requests
app.use('/api', (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] API Request: ${req.method} ${req.path} from ${req.ip}`);
  next();
});

// ===== PROXY TO ML SERVER =====
app.use('/api', createProxyMiddleware({
  target: ML_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api': '' },
  onError: (err, req, res) => {
    console.error('❌ Proxy error:', err.message);
    res.status(503).json({ 
      error: 'ML service temporarily unavailable',
      message: 'The detection service is currently unavailable. Please try again in a moment.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`➡️  Proxying to ML service: ${req.method} ${req.path}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`✅ ML service responded: ${proxyRes.statusCode}`);
  }
}));

// ===== HEALTH CHECK =====
app.get('/health', (req, res) => {
  res.json({ 
    ok: true, 
    service: 'Object Detection API',
    mlService: ML_SERVICE_URL,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    rateLimit: {
      detection: '10 requests per 15 minutes',
      general: '30 requests per minute'
    }
  });
});

// ===== STATUS ENDPOINT =====
// Useful for checking if services are running
app.get('/status', async (req, res) => {
  try {
    // Try to reach ML service
    const mlHealthUrl = `${ML_SERVICE_URL}/health`;
    const fetch = require('node-fetch');
    const mlResponse = await fetch(mlHealthUrl);
    const mlStatus = mlResponse.ok ? 'online' : 'degraded';
    
    res.json({
      frontend: 'online',
      mlService: mlStatus,
      mlServiceUrl: ML_SERVICE_URL,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      frontend: 'online',
      mlService: 'offline',
      mlServiceUrl: ML_SERVICE_URL,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ===== 404 HANDLER =====
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: {
      api: '/api/detect (POST)',
      health: '/health (GET)',
      status: '/status (GET)'
    }
  });
});

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: 'Something went wrong on the server.',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ===== START SERVER =====
app.listen(PORT, '0.0.0.0', () => {
  console.log('═══════════════════════════════════════');
  console.log('✅ Object Detection Server Started');
  console.log('═══════════════════════════════════════');
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🤖 ML Service: ${ML_SERVICE_URL}`);
  console.log(`⏱️  Rate Limits:`);
  console.log(`   - Detection: 10 requests / 15 min`);
  console.log(`   - General: 30 requests / minute`);
  console.log('═══════════════════════════════════════');
});