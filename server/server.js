// Load path module before dotenv
const path = require('path');
const fs = require('fs');
const os = require('os');

// Load environment variables from unified .env
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

// DEBUG: Verify critical environment variables are loaded
console.log('🔧 Environment Verification after dotenv.config():');
console.log('🔐 JWT Secret:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
console.log('🔗 MongoDB URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
console.log('🔐 SUPER_ADMIN_USERNAME:', process.env.SUPER_ADMIN_USERNAME);
console.log('🔐 SUPER_ADMIN_PASSWORD:', process.env.SUPER_ADMIN_PASSWORD);

// Auto-detect network IP and update environment variables
function detectAndUpdateNetworkIP() {
    let networkIP = 'localhost'; // Declare networkIP outside try block
    try {
      const networkInterfaces = os.networkInterfaces();
      let primaryIP = 'localhost';
      let wifiIP = null;
      let ethernetIP = null;
      
      // Find network IPs
      Object.keys(networkInterfaces).forEach(interfaceName => {
        networkInterfaces[interfaceName].forEach(iface => {
          if (iface.family === 'IPv4' && !iface.internal) {
            // More flexible WiFi detection for different systems
            if ((interfaceName.toLowerCase().includes('wi-fi') || interfaceName.toLowerCase().includes('wlan')) ||
                (interfaceName.toLowerCase().includes('wireless') || interfaceName.toLowerCase().includes('wifi'))) {
              wifiIP = iface.address;
            } else if (interfaceName.toLowerCase().includes('ethernet') || interfaceName.toLowerCase().includes('eth')) {
              ethernetIP = iface.address;
            }
            primaryIP = iface.address;
          }
        });
      });
      
      // Prefer WiFi over Ethernet for mobile access (better for mobile devices)
      networkIP = wifiIP || ethernetIP || primaryIP;
      
      console.log(`🌐 Network Detection Results:`);
      console.log(`   WiFi IP: ${wifiIP || 'Not found'}`);
      console.log(`   Ethernet IP: ${ethernetIP || 'Not found'}`);
      console.log(`   Primary IP: ${primaryIP}`);
      console.log(`   Selected IP: ${networkIP}`);
      
      // Update environment variables dynamically
      process.env.DETECTED_IP = networkIP;
      process.env.BACKEND_HOST = networkIP;
      process.env.BACKEND_PORT = 5000;
      process.env.VITE_FRONTEND_HOST = networkIP;
      process.env.VITE_BACKEND_HOST = networkIP;
      
      // Update CORS origins with detected IP
      const allowedOrigins = [
        `http://localhost:5174`,
        `http://${networkIP}:5174`,
        `http://localhost:3000`,
        `http://${networkIP}:3000`
      ];
      
      // Update ALLOWED_ORIGINS in environment
      process.env.ALLOWED_ORIGINS = allowedOrigins.join(',');
      process.env.CLIENT_URL = allowedOrigins.slice(0, 2).join(',');
      
      console.log(`📝 Updated .env file with IP: ${networkIP}`);
      
      // Update CSP in index.html
      updateCSPInIndexHTML(networkIP);
      
    } catch (error) {
      console.error('❌ Error detecting network IP:', error);
      // Fallback to localhost
      process.env.BACKEND_HOST = 'localhost';
      process.env.VITE_FRONTEND_HOST = 'localhost';
      process.env.VITE_BACKEND_HOST = 'localhost';
      return 'localhost'; // Return 'localhost' here
    }

    return networkIP;
}

// Update .env file with detected IP
function updateEnvFile(networkIP) {
    try {
        // Update server .env file
        const envPath = path.join(__dirname, '.env');
        let envContent = fs.readFileSync(envPath, 'utf8');
        
        // Update IP-related variables in server .env
        envContent = envContent.replace(/FRONTEND_HOST=.*/g, `FRONTEND_HOST=${networkIP}`);
        envContent = envContent.replace(/BACKEND_HOST=.*/g, `BACKEND_HOST=${networkIP}`);
        
        // Update CORS origins in server .env
        const newOrigins = `http://localhost:5174,http://${networkIP}:5174,http://localhost:3000,http://${networkIP}:3000`;
        envContent = envContent.replace(/ALLOWED_ORIGINS=.*/g, `ALLOWED_ORIGINS=${newOrigins}`);
        envContent = envContent.replace(/CLIENT_URL=.*/g, `CLIENT_URL=http://localhost:5174,http://${networkIP}:5174`);
        
        fs.writeFileSync(envPath, envContent);
        
        // Also update root .env file for frontend
        const rootEnvPath = path.join(__dirname, '..', '.env');
        let rootEnvContent = '';
        
        try {
            rootEnvContent = fs.readFileSync(rootEnvPath, 'utf8');
        } catch (error) {
            console.error('❌ Error reading root .env file:', error);
            return;
        }
        
        // Update IP-related variables in root .env
        rootEnvContent = rootEnvContent.replace(/VITE_API_URL=.*/g, `VITE_API_URL=http://${networkIP}:5000`);
        rootEnvContent = rootEnvContent.replace(/VITE_FRONTEND_HOST=.*/g, `VITE_FRONTEND_HOST=${networkIP}`);
        rootEnvContent = rootEnvContent.replace(/VITE_BACKEND_HOST=.*/g, `VITE_BACKEND_HOST=${networkIP}`);
        
        fs.writeFileSync(rootEnvPath, rootEnvContent);
        
        console.log(`📝 Updated both .env files with IP: ${networkIP}`);
    } catch (error) {
        console.error('❌ Failed to update .env files:', error.message);
    }
}

// Update CSP in index.html with detected IP
function updateCSPInIndexHTML(networkIP) {
    try {
        const indexPath = path.join(__dirname, '..', 'index.html');
        let indexContent = fs.readFileSync(indexPath, 'utf8');
        
        // Update CSP connect-src with new IP
        const cspPattern = /connect-src 'self' ws: wss: http:\/\/localhost:5000 http:\/\/[^:]+:5000;/;
        const newCSP = `connect-src 'self' ws: wss: http://localhost:5000 http://${networkIP}:5000;`;
        
        indexContent = indexContent.replace(cspPattern, newCSP);
        
        fs.writeFileSync(indexPath, indexContent);
        console.log(`📝 Updated CSP in index.html with IP: ${networkIP}`);
    } catch (error) {
        console.error('❌ Failed to update CSP in index.html:', error.message);
    }
}

// Detect network IP on startup
const detectedIP = detectAndUpdateNetworkIP();

// Update CSP in index.html with initial detected IP
updateCSPInIndexHTML(detectedIP);

// DEBUG: Verify critical environment variables
console.log('🔧 Environment Verification:');
console.log('🔐 JWT Secret:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
console.log('🔗 MongoDB URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
console.log('🌐 Server Port:', process.env.SERVER_PORT || 'NOT SET');
console.log('🌐 Host:', process.env.SERVER_HOST || 'NOT SET');
console.log('🌐 Detected IP:', process.env.DETECTED_IP || 'NOT SET');

// NOW import routes after environment is loaded
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const queueRoutes = require('./routes/queue');
const usersRoutes = require('./routes/users');
const servicesRoutes = require('./routes/services');
const transactionFlowRoutes = require('./routes/transactionFlow');
const kioskRoutes = require('./routes/kiosk');

// Import middleware
const { authMiddleware } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const PORT = process.env.SERVER_PORT || 5000;

// Socket.IO setup
const io = socketIo(server, {
    cors: {
        origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ["*"],
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    forceNew: true,
    pingTimeout: 60000,
    pingInterval: 25000
});

// Make io globally available
global.io = io;

// Performance optimization: Disable x-powered-by
app.disable('x-powered-by');

// Completely disable helmet for now
// app.use(helmet({
//     crossOriginResourcePolicy: { policy: "cross-origin" },
//     // Completely remove CSP
//     hsts: {
//       maxAge: 31536000,
//       includeSubDomains: true,
//       preload: true
//     },
//     noSniff: true,
//     frameguard: { action: 'deny' },
//     xssFilter: true,
//     referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
// }));

// CORS with performance optimizations
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : true,
    credentials: true,
    // Cache preflight requests for 1 hour
    maxAge: 3600
}));

// Body parser with optimized settings for high load
app.use(express.json({
    limit: '10mb', // Increased for handling larger requests
    verify: (req, res, buf) => {
        // Skip JSON verification for multipart/form-data
        if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
            return;
        }
        try {
            if (buf && buf.length > 0) {
                JSON.parse(buf);
            }
        } catch (e) {
            res.status(400).json({ error: 'Invalid JSON' });
            throw new Error('Invalid JSON');
        }
    }
}));

app.use(express.urlencoded({
    extended: true,
    limit: '10mb', // Increased for high load
    parameterLimit: 100 // Increased for complex forms
}));

// Remove ALL CSP headers completely - aggressive approach
app.use((req, res, next) => {
    // Remove all possible CSP headers
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('X-Content-Security-Policy');
    res.removeHeader('X-WebKit-CSP');
    res.removeHeader('X-Content-Security-Policy-Report-Only');
    res.removeHeader('X-WebKit-CSP-Report-Only');
    
    // Override any CSP headers that might be set later
    const originalSetHeader = res.setHeader;
    res.setHeader = function(name, value) {
        if (name.toLowerCase().includes('content-security-policy')) {
            return res; // Block any CSP headers
        }
        return originalSetHeader.call(this, name, value);
    };
    
    next();
});

// Request timeout and security middleware
app.use((req, res, next) => {
    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Request timeout
    const timeout = setTimeout(() => {
        if (!res.headersSent) {
            res.status(408).json({ error: 'Request timeout' });
        }
    }, 30000); // 30 seconds timeout

    // Clean up timeout on response completion
    const originalEnd = res.end;
    res.end = function(...args) {
        clearTimeout(timeout);
        originalEnd.apply(this, args);
    };

    next();
});

// Static files with caching
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    maxAge: '1d', // Cache for 1 day
    etag: true,
    lastModified: true
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/transaction-flows', transactionFlowRoutes);
app.use('/api/kiosk', kioskRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id} from ${socket.handshake.address}`);
    
    socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
    });
});

// Error handling middleware (required for Express 5)
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    
    if (res.headersSent) {
        return next(err);
    }
    
    res.status(err.status || 500).json({
        status: 'ERROR',
        message: err.message || 'Internal Server Error',
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// IP Synchronization Endpoint
app.post('/api/sync-ip', (req, res) => {
  try {
    const { frontendHost, frontendPort } = req.body;
    
    if (!frontendHost || !frontendPort) {
      return res.status(400).json({ error: 'Frontend host and port are required' });
    }
    
    // Update server .env file with new frontend IP
    const envPath = path.join(__dirname, '.env');
    let envContent = '';
    
    try {
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }
    } catch (error) {
      console.error('Error reading .env file:', error);
    }
    
    // Update or add frontend configuration
    const lines = envContent.split('\n').filter(line => line.trim() !== '');
    const updatedLines = lines.map(line => {
      if (line.startsWith('FRONTEND_HOST=')) {
        return `FRONTEND_HOST=${frontendHost}`;
      } else if (line.startsWith('FRONTEND_PORT=')) {
        return `FRONTEND_PORT=${frontendPort}`;
      }
      return line;
    });
    
    // Add new lines if they don't exist
    if (!lines.some(line => line.startsWith('FRONTEND_HOST='))) {
      updatedLines.push(`FRONTEND_HOST=${frontendHost}`);
    }
    if (!lines.some(line => line.startsWith('FRONTEND_PORT='))) {
      updatedLines.push(`FRONTEND_PORT=${frontendPort}`);
    }
    
    // Write updated .env file
    fs.writeFileSync(envPath, updatedLines.join('\n'));
    
    console.log(`🔄 Updated frontend configuration: ${frontendHost}:${frontendPort}`);
    
    res.json({ 
      message: 'Frontend configuration updated successfully',
      frontendHost,
      frontendPort,
      backendHost: process.env.BACKEND_HOST,
      backendPort: process.env.BACKEND_PORT
    });
  } catch (error) {
    console.error('Error syncing IP:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// Enhanced health check with database status and performance metrics
app.get('/api/health', async (req, res) => {
    try {
        const dbStatus = mongoose.connection.readyState === 1;
        const memoryUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();

        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            database: dbStatus ? 'connected' : 'disconnected',
            network: {
                detectedIP: process.env.DETECTED_IP,
                serverPort: PORT,
                frontendPort: process.env.VITE_FRONTEND_PORT || 5174
            },
            performance: {
                memory: {
                    used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                    total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                    rss: Math.round(memoryUsage.rss / 1024 / 1024)
                },
                cpu: {
                    user: cpuUsage.user,
                    system: cpuUsage.system
                },
                uptime: Math.round(process.uptime()),
                loadAverage: os.loadavg()
            },
            server: {
                workerId: process.pid,
                environment: process.env.NODE_ENV || 'development',
                serverPort: PORT
            }
        });
    } catch (error) {
        res.status(503).json({
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: error.message
        });
    }
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Queueing System API - High Performance',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        network: {
            detectedIP: process.env.DETECTED_IP,
            serverPort: PORT,
            frontendPort: process.env.VITE_FRONTEND_PORT || 5174,
            apiURL: process.env.VITE_API_URL
        },
        performance: {
            clusterMode: true,
            workers: os.cpus().length
        },
        endpoints: {
            health: '/api/health',
            auth: '/api/auth',
            admin: '/api/admin',
            queue: '/api/queue',
            users: '/api/users',
            services: '/api/services',
            transactionFlows: '/api/transaction-flows'
        }
    });
});

// Custom Announcement Endpoint
app.post('/api/custom-announcement', authMiddleware, (req, res) => {
    try {
        const { message, windowNumber, type } = req.body;
        
        // Validate input
        if (!message || !windowNumber || !type) {
            return res.status(400).json({ 
                error: 'Message, window number, and type are required' 
            });
        }
        
        // Validate message length
        if (message.trim().length === 0 || message.trim().length > 200) {
            return res.status(400).json({ 
                error: 'Message must be between 1 and 200 characters' 
            });
        }
        
        // Validate window number
        if (isNaN(windowNumber) || windowNumber < 1 || windowNumber > 99) {
            return res.status(400).json({ 
                error: 'Window number must be between 1 and 99' 
            });
        }
        
        console.log(`🎤 Custom announcement received: "${message.trim()}" for Window ${windowNumber} from user ${req.user.username}`);
        
        // Broadcast custom announcement to all PublicDisplay clients
        io.emit('custom-announcement', {
            message: message.trim(),
            windowNumber: parseInt(windowNumber),
            type: type,
            timestamp: new Date(),
            user: req.user.username
        });
        
        res.json({ 
            success: true, 
            message: 'Custom announcement sent successfully',
            data: {
                message: message.trim(),
                windowNumber: parseInt(windowNumber),
                type: type
            }
        });
        
    } catch (error) {
        console.error('💥 Error in custom announcement endpoint:', error);
        res.status(500).json({ 
            error: 'Internal server error' 
        });
    }
});

// Graceful shutdown endpoint
app.post('/api/graceful-shutdown', (req, res) => {
    res.json({ message: 'Initiating graceful shutdown' });
    console.log('🔄 Manual graceful shutdown initiated');
    process.exit(0);
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});

// Global unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global uncaught exception handler
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    if (error.code && error.code.includes('ECONNREFUSED')) {
        console.log('Database connection error, but keeping server running');
        return;
    }
    // Only exit for critical errors
    if (error.code && (error.code.includes('EACCES') || error.code.includes('EADDRINUSE'))) {
        process.exit(1);
    }
});

// Graceful shutdown handler
let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n${signal} received, starting graceful shutdown...`);

    // Only close server if it exists
    if (server) {
        server.close(async (err) => {
            if (err) {
                console.error('Error closing server:', err);
                process.exit(1);
            }

            console.log('✅ Server closed');

            try {
                await mongoose.connection.close();
                console.log('✅ MongoDB connection closed');
                process.exit(0);
            } catch (error) {
                console.error('Error closing MongoDB connection:', error);
                process.exit(1);
            }
        });

        // Force shutdown after 15 seconds
        setTimeout(() => {
            console.log('⚠️ Forcing shutdown after timeout');
            process.exit(1);
        }, 15000);
    } else {
        console.log('❌ Server not running, exiting immediately');
        process.exit(1);
    }
};

// Signal handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Optimized memory monitoring for high load
let memoryCheckInterval;

const setupMemoryMonitoring = () => {
    if (memoryCheckInterval) {
        clearInterval(memoryCheckInterval);
    }

    memoryCheckInterval = setInterval(() => {
        const memoryUsage = process.memoryUsage();
        const usedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
        const totalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
        
        // Only log memory usage in development or when it's high
        if (process.env.NODE_ENV === 'development' || usedMB > 300) {
            console.log(`💾 Memory: ${usedMB}MB / ${totalMB}MB`);
        }
        
        // Warning threshold
        if (usedMB > 500) {
            console.warn('🚨 High memory usage detected');
            if (global.gc) {
                console.log('🔄 Forcing garbage collection');
                global.gc();
            }
        }
        
        // Check for memory leaks (continuously increasing memory)
        if (usedMB > 1000) {
            console.error('🚨 CRITICAL: Very high memory usage, possible memory leak');
        }
    }, 30000); // Check every 30 seconds for better performance
};

// MongoDB connection
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI;
        console.log('🔗 Connecting to MongoDB...');
        console.log('🔗 MongoDB URI:', mongoURI);
        
        await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10
        });

        console.log('✅ Connected to MongoDB');
        console.log('📊 Database name:', mongoose.connection.name);
        console.log('📊 Database host:', mongoose.connection.host);
        
        // Test database operations
        const testFlow = await mongoose.connection.db.collection('transactionflows').findOne();
        console.log('📊 Test transactionflows collection:', testFlow ? 'has data' : 'empty');
        
        return true;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        return false;
    }
};

// Start server
const startServer = async () => {
    try {
        console.log(`🔧 Starting Queueing System Server...`);

        // Initialize memory monitoring
        setupMemoryMonitoring();

        const dbConnected = await connectDB();
        if (!dbConnected) {
            console.error('❌ Failed to connect to database. Please check your database configuration.');
            console.log('🔄 Retrying in 5 seconds...');
            setTimeout(startServer, 5000);
            return;
        }

        console.log('✅ Database connection established');

        server.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Queueing System Server is running!`);
            console.log(`📡 Port: ${PORT}`);
            console.log(`🌐 Local access: http://localhost:${PORT}`);
            console.log(`🌐 Network access:`);
            
            // Get network interfaces and display all available IPs
            const networkInterfaces = os.networkInterfaces();
            Object.keys(networkInterfaces).forEach(interfaceName => {
                networkInterfaces[interfaceName].forEach(iface => {
                    if (iface.family === 'IPv4' && !iface.internal) {
                        console.log(`   http://${iface.address}:${PORT}`);
                    }
                });
            });
            
            console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`📊 API Documentation: http://localhost:${PORT}/api/health`);
            console.log(`🔌 Socket.IO: WebSocket and polling enabled`);
            console.log(`🌍 CORS: Enabled for all origins`);
            console.log(`⚡ Rate Limiting: ${process.env.RATE_LIMIT_MAX_REQUESTS || 1000} requests per ${parseInt(process.env.RATE_LIMIT_WINDOW_MS || 900000) / 60000} minutes per IP`);
            console.log(`🛡️ Security: Helmet middleware enabled`);
            console.log(`💾 MongoDB: Connected`);
            console.log(`🌐 Detected Network IP: ${process.env.DETECTED_IP}`);
            console.log(`📱 Frontend URL: http://${process.env.DETECTED_IP}:${process.env.VITE_FRONTEND_PORT || 5174}`);
        });

        // Handle server errors
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`❌ Port ${PORT} is already in use`);
                console.log('💡 Try using a different port or stop the existing process');
            } else {
                console.error('❌ Server error:', error);
            }
            process.exit(1);
        });

        server.on('close', () => {
            console.log(`🛑 Server closed`);
            if (memoryCheckInterval) {
                clearInterval(memoryCheckInterval);
            }
        });

        // Optimized connection handling for high load
        server.on('connection', (socket) => {
            socket.setTimeout(60000); // Increased timeout for high load
            socket.setKeepAlive(true, 30000); // Reduced keepalive for better resource management
            socket.setNoDelay(true); // Disable Nagle's algorithm for better performance
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        console.log('🔄 Retrying in 5 seconds...');
        setTimeout(startServer, 5000);
    }
};

// Monitor network changes and update IP if needed
setInterval(() => {
    const newIP = detectAndUpdateNetworkIP();
    if (newIP !== process.env.DETECTED_IP) {
        console.log(`🔄 Network IP changed from ${process.env.DETECTED_IP} to ${newIP}`);
        console.log('📝 Environment variables and CSP updated. Restart frontend for full effect.');
        
        // Update CSP in index.html when IP changes
        updateCSPInIndexHTML(newIP);
    }
}, 60000); // Check every minute

startServer();

module.exports = app;
