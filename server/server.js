const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const os = require('os');
const fs = require('fs');

// Load environment variables from the correct .env file
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

// DEBUG: Verify critical environment variables are loaded
console.log('🔧 Environment Verification after dotenv.config():');
console.log('🔐 JWT Secret:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
console.log('🔗 MongoDB URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
console.log('🔐 SUPER_ADMIN_USERNAME:', process.env.SUPER_ADMIN_USERNAME);
console.log('🔐 SUPER_ADMIN_PASSWORD:', process.env.SUPER_ADMIN_PASSWORD);

// Auto-detect network IP and update environment variables
function detectAndUpdateNetworkIP() {
    const networkInterfaces = os.networkInterfaces();
    let primaryIP = 'localhost';
    let wifiIP = null;
    let ethernetIP = null;

    // Find network IPs
    Object.keys(networkInterfaces).forEach(interfaceName => {
        networkInterfaces[interfaceName].forEach(iface => {
            if (iface.family === 'IPv4' && !iface.internal) {
                if (interfaceName.toLowerCase().includes('wi-fi') || interfaceName.toLowerCase().includes('wlan')) {
                    wifiIP = iface.address;
                } else if (interfaceName.toLowerCase().includes('ethernet') || interfaceName.toLowerCase().includes('eth')) {
                    ethernetIP = iface.address;
                }
                primaryIP = iface.address;
            }
        });
    });

    // Prefer WiFi over Ethernet for mobile access
    const networkIP = wifiIP || ethernetIP || primaryIP;
    
    console.log(`🌐 Network Detection Results:`);
    console.log(`   WiFi IP: ${wifiIP || 'Not found'}`);
    console.log(`   Ethernet IP: ${ethernetIP || 'Not found'}`);
    console.log(`   Primary IP: ${primaryIP}`);
    console.log(`   Selected IP: ${networkIP}`);

    // Update environment variables dynamically
    process.env.DETECTED_IP = networkIP;
    process.env.VITE_API_URL = `http://${networkIP}:5000`;
    process.env.VITE_FRONTEND_HOST = networkIP;
    process.env.VITE_BACKEND_HOST = networkIP;

    // Update CORS origins with detected IP
    const allowedOrigins = [
        `http://localhost:5174`,
        `http://${networkIP}:5174`,
        `http://localhost:3000`,
        `http://${networkIP}:3000`
    ];
    process.env.ALLOWED_ORIGINS = allowedOrigins.join(',');
    process.env.CLIENT_URL = allowedOrigins.slice(0, 2).join(',');

    // Update .env file with new IP
    updateEnvFile(networkIP);

    return networkIP;
}

// Update .env file with detected IP
function updateEnvFile(networkIP) {
    try {
        const envPath = path.join(__dirname, '.env');
        let envContent = fs.readFileSync(envPath, 'utf8');
        
        // Update IP-related variables
        envContent = envContent.replace(/VITE_API_URL=.*/g, `VITE_API_URL=http://${networkIP}:5000`);
        envContent = envContent.replace(/VITE_FRONTEND_HOST=.*/g, `VITE_FRONTEND_HOST=${networkIP}`);
        envContent = envContent.replace(/VITE_BACKEND_HOST=.*/g, `VITE_BACKEND_HOST=${networkIP}`);
        
        // Preserve existing superadmin credentials if they exist
        if (!envContent.includes('SUPER_ADMIN_USERNAME=')) {
            envContent += '\n# Super Admin Configuration\nSUPER_ADMIN_EMAIL=admin@queueing.com\nSUPER_ADMIN_PASSWORD=SuperAdmin123!';
        }
        if (!envContent.includes('JWT_SECRET=')) {
            envContent += '\n# JWT Secret\nJWT_SECRET=queueing@2025system';
        }
        if (!envContent.includes('MONGODB_URI=')) {
            envContent += '\n# Database Configuration (MongoDB Atlas)\nMONGODB_URI=mongodb+srv://servandoytio:qDn2Se8cKbWaPCeN@merncluster.2veth.mongodb.net/?appName=mernCluster';
        }
        
        // Update CORS origins
        const newOrigins = `http://localhost:5174,http://${networkIP}:5174,http://localhost:3000,http://${networkIP}:3000`;
        envContent = envContent.replace(/ALLOWED_ORIGINS=.*/g, `ALLOWED_ORIGINS=${newOrigins}`);
        envContent = envContent.replace(/CLIENT_URL=.*/g, `CLIENT_URL=http://localhost:5174,http://${networkIP}:5174`);
        
        fs.writeFileSync(envPath, envContent);
        console.log(`📝 Updated .env file with IP: ${networkIP}`);
    } catch (error) {
        console.error('❌ Failed to update .env file:', error.message);
    }
}

// Detect network IP on startup
const detectedIP = detectAndUpdateNetworkIP();

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
    transports: ['websocket', 'polling']
});

// Make io globally available
global.io = io;

// Performance optimization: Disable x-powered-by
app.disable('x-powered-by');

// Security middleware with performance optimizations
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // Disable non-essential security features for better performance
    contentSecurityPolicy: false,
    hsts: false
}));

// CORS with performance optimizations
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : true,
    credentials: true,
    // Cache preflight requests for 1 hour
    maxAge: 3600
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // limit each IP to 1000 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(limiter);

// Body parser with optimized settings for high load
app.use(express.json({
    limit: '10mb', // Increased for handling larger requests
    verify: (req, res, buf) => {
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

// Optimized request timeout middleware
app.use((req, res, next) => {
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
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
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
                serverPort: PORT,
                maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS || 1000,
                rateLimitWindow: process.env.RATE_LIMIT_WINDOW_MS || 900000
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
            maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS || 1000,
            rateLimitWindow: process.env.RATE_LIMIT_WINDOW_MS || 900000,
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
        const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://servandoytio:qDn2Se8cKbWaPCeN@merncluster.2veth.mongodb.net/queueing-system?appName=mernCluster';
        console.log('🔗 Connecting to MongoDB...');
        console.log('🔗 MongoDB URI:', mongoURI);
        
        await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10,
            bufferCommands: false
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
        console.log('📝 Environment variables updated. Restart server for full effect.');
    }
}, 60000); // Check every minute

startServer();

module.exports = app;
