# Developer Guide - Queue Management System

## 📋 Table of Contents
1. [System Architecture](#system-architecture)
2. [Development Environment Setup](#development-environment-setup)
3. [Frontend Development](#frontend-development)
4. [Backend Development](#backend-development)
5. [Database Development](#database-development)
6. [API Development](#api-development)
7. [Real-time Communication](#real-time-communication)
8. [Security Implementation](#security-implementation)
9. [Testing and Quality Assurance](#testing-and-quality-assurance)
10. [Deployment and DevOps](#deployment-and-devops)

## System Architecture

### Technology Stack Overview

#### Frontend Stack
```
React 19.2.0          - Modern UI framework with concurrent features
TypeScript 5.9.3      - Type-safe JavaScript development
Vite 7.2.4           - Fast build tool and development server
Tailwind CSS 3.4.19   - Utility-first CSS framework
React Router 7.13.0   - Client-side routing
Socket.io Client 4.8.3 - Real-time communication client
Axios 1.13.4          - HTTP client with interceptors
Heroicons 2.2.0       - Consistent icon system
Headless UI 2.2.9     - Accessible UI components
Lucide React 0.563.0   - Additional icon set
```

#### Backend Stack
```
Node.js                - JavaScript runtime environment
Express.js 4.18.2     - Web application framework
Socket.io 4.7.4       - Real-time bidirectional communication
MongoDB 8.0.3          - NoSQL document database
Mongoose 8.0.3         - MongoDB object modeling
JWT 9.0.2             - JSON Web Token authentication
bcrypt 6.0.0          - Password hashing and security
bcryptjs 2.4.3        - Legacy password compatibility
CORS 2.8.5            - Cross-origin resource sharing
Helmet 8.1.0          - Security middleware
Express Rate Limit 8.2.1 - API rate limiting
Multer 2.0.2          - File upload handling
Nodemailer 6.9.7      - Email sending capabilities
Dotenv 16.3.1         - Environment variable management
```

### System Components

#### Frontend Architecture
```
src/
├── components/           # React components
│   ├── public/          # Public-facing components
│   ├── admin/           # Admin interface components
│   └── window/          # Window operator components
├── contexts/            # React contexts for state management
├── config/              # Configuration files
├── types/               # TypeScript type definitions
├── assets/              # Static assets
└── App.tsx              # Main application component
```

#### Backend Architecture
```
server/
├── models/              # MongoDB data models
├── routes/              # API route handlers
├── middleware/          # Express middleware
├── server.js            # Main server application
└── seed.js              # Database seeding script
```

## Development Environment Setup

### Prerequisites

#### Required Software
```bash
# Node.js (v16 or higher)
node --version

# npm or yarn
npm --version

# Git
git --version

# MongoDB Atlas account (cloud database)
# MongoDB Compass (optional, for database management)
```

#### Development Tools
```bash
# Visual Studio Code (recommended)
# MongoDB Compass (database GUI)
# Postman (API testing)
# Chrome DevTools (debugging)
```

### Environment Setup

#### 1. Clone Repository
```bash
git clone <repository-url>
cd queueing-system
```

#### 2. Install Dependencies

##### Frontend Dependencies
```bash
npm install
```

##### Backend Dependencies
```bash
cd server
npm install
```

#### 3. Environment Configuration

##### Frontend `.env` (root directory)
```env
# API Configuration
VITE_API_URL=http://localhost:5000
VITE_FRONTEND_HOST=localhost
VITE_FRONTEND_PORT=5174
VITE_BACKEND_HOST=localhost

# Super Admin Credentials
VITE_SUPERADMIN_USERNAME=superadmin
VITE_SUPERADMIN_PASSWORD=SuperAdmin123!

# Security Settings
VITE_HTTPS=false
VITE_SECURE_COOKIES=false
```

##### Backend `.env` (server directory)
```env
# Database Configuration
MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/queueing-system

# Security Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
ALLOWED_ORIGINS=http://localhost:5174,http://localhost:3000

# Super Admin Credentials
SUPER_ADMIN_USERNAME=superadmin
SUPER_ADMIN_PASSWORD=SuperAdmin123!

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Environment
NODE_ENV=development
```

#### 4. Database Setup
```bash
cd server
node seed.js
```

#### 5. Start Development Servers

##### Start Backend Server
```bash
cd server
npm run dev
```

##### Start Frontend Development Server
```bash
npm run dev -- --host
```

## Frontend Development

### React Component Architecture

#### Component Structure
```typescript
// Component Interface Example
interface ComponentProps {
  // Define props here
  data: DataType;
  onAction: (action: ActionType) => void;
  className?: string;
}

const ComponentName: React.FC<ComponentProps> = ({ 
  data, 
  onAction, 
  className = '' 
}) => {
  // Component logic here
  
  return (
    <div className={className}>
      {/* JSX content */}
    </div>
  );
};

export default ComponentName;
```

#### State Management with Context
```typescript
// Context Example
interface ContextType {
  state: StateType;
  actions: {
    updateState: (newState: Partial<StateType>) => void;
    resetState: () => void;
  };
}

const Context = createContext<ContextType | undefined>(undefined);

export const useCustomContext = () => {
  const context = useContext(Context);
  if (!context) {
    throw new Error('useCustomContext must be used within Provider');
  }
  return context;
};
```

### Component Development Guidelines

#### 1. Component Naming
- Use PascalCase for component names
- Use descriptive names that indicate functionality
- Group related components in directories

#### 2. Props Interface
- Define TypeScript interfaces for all props
- Use optional props with default values
- Provide clear prop documentation

#### 3. State Management
- Use React hooks for local state
- Use Context for global state
- Avoid prop drilling when possible

#### 4. Styling
- Use Tailwind CSS classes
- Create reusable utility classes
- Follow responsive design principles

### Key Frontend Components

#### PublicKiosk Component
```typescript
// Main kiosk interface for customers
interface PublicKioskProps {
  // Props for kiosk functionality
}

const PublicKiosk: React.FC<PublicKioskProps> = () => {
  // State for transaction selection
  const [selectedTransaction, setSelectedTransaction] = useState('');
  const [selectedPersonType, setSelectedPersonType] = useState('');
  
  // Queue generation logic
  const generateQueue = async () => {
    // Implementation
  };
  
  return (
    <div className="kiosk-container">
      {/* Kiosk UI */}
    </div>
  );
};
```

#### AdminDashboard Component
```typescript
// Main admin interface
interface AdminDashboardProps {
  // Props for admin functionality
}

const AdminDashboard: React.FC<AdminDashboardProps> = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<AdminStats>();
  
  // Admin operations
  const handleUserManagement = () => {
    // User management logic
  };
  
  return (
    <div className="admin-dashboard">
      {/* Admin UI */}
    </div>
  );
};
```

#### WindowDashboard Component
```typescript
// Window operator interface
interface WindowDashboardProps {
  windowNumber: number;
}

const WindowDashboard: React.FC<WindowDashboardProps> = ({ windowNumber }) => {
  const [currentQueue, setCurrentQueue] = useState<Queue | null>(null);
  const [waitingQueues, setWaitingQueues] = useState<Queue[]>([]);
  
  // Queue management logic
  const callNextQueue = async () => {
    // Implementation
  };
  
  return (
    <div className="window-dashboard">
      {/* Window operator UI */}
    </div>
  );
};
```

### Frontend Configuration

#### Vite Configuration
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Enable network access
    port: 5174
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
```

#### TypeScript Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

## Backend Development

### Express.js Server Setup

#### Main Server Configuration
```javascript
// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

// Load environment variables
require('dotenv').config();

// Create Express app
const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = socketIo(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS.split(','),
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS.split(',')
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/queue', require('./routes/queue'));
app.use('/api/users', require('./routes/users'));
app.use('/api/admin', require('./routes/admin'));

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Database Models

#### User Model
```javascript
// server/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['admin', 'window', 'super_admin'],
    default: 'window'
  },
  windowNumber: {
    type: Number,
    required: function() { return this.role === 'window'; }
  },
  service: {
    type: String,
    required: function() { return this.role === 'window'; }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Password hashing middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Password comparison method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
```

#### Queue Model
```javascript
// server/models/Queue.js
const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema({
  queueNumber: {
    type: String,
    required: true,
    unique: true
  },
  personType: {
    type: String,
    required: true,
    default: 'Normal'
  },
  service: {
    type: String,
    required: true
  },
  transactionName: {
    type: String,
    required: false
  },
  transactionPrefix: {
    type: String,
    required: false
  },
  currentStep: {
    type: Number,
    default: 0
  },
  totalSteps: {
    type: Number,
    default: 0
  },
  windowFlow: [{
    windowNumber: Number,
    order: Number
  }],
  status: {
    type: String,
    enum: ['waiting', 'serving', 'completed', 'missed', 'on-hold'],
    default: 'waiting'
  },
  currentWindow: {
    type: Number,
    default: null
  },
  nextWindow: {
    type: Number,
    default: null
  },
  priority: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  startedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  }
});

// Indexes for performance
queueSchema.index({ queueNumber: 1 });
queueSchema.index({ status: 1 });
queueSchema.index({ service: 1 });
queueSchema.index({ priority: -1, createdAt: 1 });

module.exports = mongoose.model('Queue', queueSchema);
```

### API Development

#### Authentication Routes
```javascript
// server/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find user
    const user = await User.findOne({ username, isActive: true });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id, 
        username: user.username, 
        role: user.role,
        windowNumber: user.windowNumber,
        service: user.service
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        windowNumber: user.windowNumber,
        service: user.service
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Super admin login
router.post('/super-admin-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Check against environment variables
    if (username === process.env.SUPER_ADMIN_USERNAME && 
        password === process.env.SUPER_ADMIN_PASSWORD) {
      const token = jwt.sign(
        { 
          id: 'super-admin', 
          username: username, 
          role: 'super_admin'
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.json({
        token,
        user: {
          id: 'super-admin',
          username: username,
          role: 'super_admin'
        }
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
```

#### Queue Management Routes
```javascript
// server/routes/queue.js
const express = require('express');
const Queue = require('../models/Queue');
const router = express.Router();

// Generate new queue number
router.post('/generate', async (req, res) => {
  try {
    const { service, personType, transactionFlowId } = req.body;
    
    // Generate queue number
    const prefix = getPrefixForService(service);
    const queueNumber = await generateUniqueQueueNumber(prefix);
    
    // Create queue
    const queue = new Queue({
      queueNumber,
      service,
      personType,
      priority: getPriorityForPersonType(personType),
      transactionName: getTransactionName(transactionFlowId),
      transactionPrefix: prefix
    });
    
    await queue.save();
    
    // Emit real-time update
    req.io.emit('queueGenerated', queue);
    
    res.json(queue);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current queues
router.get('/current', async (req, res) => {
  try {
    const currentQueues = await Queue.find({ 
      status: 'serving' 
    }).populate('currentWindow');
    
    res.json(currentQueues);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get waiting queues
router.get('/waiting', async (req, res) => {
  try {
    const waitingQueues = await Queue.find({ 
      status: 'waiting' 
    }).sort({ priority: -1, createdAt: 1 });
    
    res.json(waitingQueues);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Call next queue
router.post('/next/:windowNumber', async (req, res) => {
  try {
    const { windowNumber } = req.params;
    
    // Find next queue for this window
    const nextQueue = await Queue.findOneAndUpdate(
      { 
        status: 'waiting',
        $or: [
          { currentWindow: windowNumber },
          { currentWindow: null, service: getServiceForWindow(windowNumber) }
        ]
      },
      { 
        status: 'serving',
        currentWindow: windowNumber,
        startedAt: new Date()
      },
      { sort: { priority: -1, createdAt: 1 } }
    );
    
    if (!nextQueue) {
      return res.json({ message: 'No queues waiting' });
    }
    
    // Emit real-time update
    req.io.emit('queueUpdated', nextQueue);
    req.io.emit('soundNotification', {
      queueNumber: nextQueue.queueNumber,
      windowNumber
    });
    
    res.json(nextQueue);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
```

### Middleware Development

#### Authentication Middleware
```javascript
// server/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // For super admin, check against environment
    if (decoded.role === 'super_admin') {
      req.user = decoded;
      return next();
    }
    
    // For other users, check database
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(403).json({ message: 'Invalid token' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    next();
  };
};

module.exports = { authenticateToken, requireRole };
```

## Database Development

### MongoDB Schema Design

#### Collection Relationships
```
users (1) -> (n) queues
services (1) -> (n) queues
transactionFlows (1) -> (n) queues
personTypes (1) -> (n) queues
```

#### Indexing Strategy
```javascript
// Queue collection indexes
db.queues.createIndex({ "queueNumber": 1 }, { unique: true });
db.queues.createIndex({ "status": 1 });
db.queues.createIndex({ "service": 1 });
db.queues.createIndex({ "priority": -1, "createdAt": 1 });
db.queues.createIndex({ "currentWindow": 1 });

// Users collection indexes
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "role": 1 });
db.users.createIndex({ "isActive": 1 });

// Services collection indexes
db.services.createIndex({ "name": 1 }, { unique: true });
db.services.createIndex({ "prefix": 1 }, { unique: true });
db.services.createIndex({ "isActive": 1 });
```

### Database Operations

#### Advanced Query Examples
```javascript
// Get queue statistics
const getQueueStats = async () => {
  const stats = await Queue.aggregate([
    {
      $group: {
        _id: '$service',
        totalQueues: { $sum: 1 },
        waitingQueues: {
          $sum: { $cond: [{ $eq: ['$status', 'waiting'] }, 1, 0] }
        },
        servingQueues: {
          $sum: { $cond: [{ $eq: ['$status', 'serving'] }, 1, 0] }
        },
        completedQueues: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        averageWaitTime: {
          $avg: {
            $cond: [
              { $ne: ['$startedAt', null] },
              { $subtract: ['$startedAt', '$createdAt'] },
              null
            ]
          }
        }
      }
    }
  ]);
  
  return stats;
};

// Get user performance metrics
const getUserPerformance = async (userId, startDate, endDate) => {
  const performance = await Queue.aggregate([
    {
      $match: {
        currentWindow: userId,
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$currentWindow',
        totalServed: { $sum: 1 },
        averageServiceTime: {
          $avg: {
            $cond: [
              { $ne: ['$completedAt', null] },
              { $subtract: ['$completedAt', '$startedAt'] },
              null
            ]
          }
        }
      }
    }
  ]);
  
  return performance;
};
```

## Real-time Communication

### Socket.io Implementation

#### Server-Side Socket Events
```javascript
// Socket.io event handlers
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Join room based on user type
  socket.on('joinRoom', (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room ${room}`);
  });
  
  // Handle queue updates
  socket.on('queueUpdate', (data) => {
    socket.to('queue-updates').emit('queueUpdated', data);
  });
  
  // Handle window-specific updates
  socket.on('windowUpdate', (windowNumber) => {
    socket.join(`window-${windowNumber}`);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Emit functions for different events
const emitQueueUpdate = (queue) => {
  io.emit('queueUpdated', queue);
};

const emitSoundNotification = (data) => {
  io.emit('soundNotification', data);
};

const emitKioskStatusUpdate = (status) => {
  io.emit('kioskStatusUpdated', status);
};
```

#### Client-Side Socket Integration
```typescript
// Socket client setup
import { io } from 'socket.io-client';

const socket = io(CONFIG.SOCKET_URL);

// Socket event listeners
socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('queueUpdated', (queue: Queue) => {
  // Handle queue update
  updateQueueState(queue);
});

socket.on('soundNotification', (data: SoundData) => {
  // Handle sound notification
  playAnnouncement(data.queueNumber, data.windowNumber);
});

socket.on('kioskStatusUpdated', (status: KioskStatus) => {
  // Handle kiosk status update
  updateKioskStatus(status);
});

// Socket event emitters
const emitQueueUpdate = (queue: Queue) => {
  socket.emit('queueUpdate', queue);
};

const joinRoom = (room: string) => {
  socket.emit('joinRoom', room);
};
```

## Security Implementation

### JWT Authentication

#### Token Generation and Validation
```javascript
// JWT utilities
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '24h'
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

const refreshToken = (oldToken) => {
  try {
    const decoded = jwt.verify(oldToken, process.env.JWT_SECRET, { ignoreExpiration: true });
    const newPayload = { ...decoded, iat: undefined, exp: undefined };
    return generateToken(newPayload);
  } catch (error) {
    throw new Error('Invalid token for refresh');
  }
};
```

### Security Middleware

#### Rate Limiting
```javascript
// Rate limiting configuration
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);
```

#### Security Headers
```javascript
// Helmet configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### Input Validation

#### Request Validation
```javascript
// Validation middleware
const { body, validationResult } = require('express-validator');

const validateQueueGeneration = [
  body('service').notEmpty().withMessage('Service is required'),
  body('personType').isIn(['Normal', 'Senior Citizen', 'PWD', 'Pregnant', 'Priority']),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

const validateUserCreation = [
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['admin', 'window']).withMessage('Invalid role'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];
```

## Testing and Quality Assurance

### Unit Testing

#### Frontend Testing with Jest
```typescript
// Component test example
import { render, screen, fireEvent } from '@testing-library/react';
import PublicKiosk from '../components/public/PublicKiosk';

describe('PublicKiosk', () => {
  test('renders service selection', () => {
    render(<PublicKiosk />);
    expect(screen.getByText('Select Service')).toBeInTheDocument();
  });
  
  test('generates queue number when button clicked', async () => {
    render(<PublicKiosk />);
    
    const serviceButton = screen.getByText('Cashier');
    fireEvent.click(serviceButton);
    
    const generateButton = screen.getByText('Get Queue Number');
    fireEvent.click(generateButton);
    
    // Assert queue number is generated
    expect(screen.getByText(/CSH\d{3}/)).toBeInTheDocument();
  });
});
```

#### Backend Testing with Jest
```javascript
// API test example
const request = require('supertest');
const app = require('../server');

describe('Queue API', () => {
  test('POST /api/queue/generate should create new queue', async () => {
    const response = await request(app)
      .post('/api/queue/generate')
      .send({
        service: 'Cashier',
        personType: 'Normal'
      })
      .expect(201);
    
    expect(response.body).toHaveProperty('queueNumber');
    expect(response.body.service).toBe('Cashier');
  });
  
  test('GET /api/queue/waiting should return waiting queues', async () => {
    const response = await request(app)
      .get('/api/queue/waiting')
      .expect(200);
    
    expect(Array.isArray(response.body)).toBe(true);
  });
});
```

### Integration Testing

#### End-to-End Testing
```typescript
// E2E test example
import { test, expect } from '@playwright/test';

test.describe('Queue Management Flow', () => {
  test('complete queue flow from kiosk to window', async ({ page }) => {
    // Navigate to kiosk
    await page.goto('/');
    
    // Select service
    await page.click('[data-testid="service-cashier"]');
    
    // Select person type
    await page.click('[data-testid="person-type-normal"]');
    
    // Generate queue number
    await page.click('[data-testid="generate-queue"]');
    
    // Verify queue number is generated
    await expect(page.locator('[data-testid="queue-number"]')).toBeVisible();
    
    // Navigate to window dashboard
    await page.goto('/window/1');
    
    // Login as window user
    await page.fill('[data-testid="username"]', 'window1');
    await page.fill('[data-testid="password"]', 'Window123!');
    await page.click('[data-testid="login-button"]');
    
    // Call next queue
    await page.click('[data-testid="next-queue"]');
    
    // Verify queue is called
    await expect(page.locator('[data-testid="current-queue"]')).toBeVisible();
  });
});
```

### Code Quality

#### ESLint Configuration
```json
// .eslintrc.json
{
  "env": {
    "browser": true,
    "es2020": true,
    "node": true
  },
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "plugin:react-hooks/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "plugins": [
    "react-refresh",
    "@typescript-eslint"
  ],
  "rules": {
    "react-refresh/only-export-components": [
      "warn",
      { "allowConstantExport": true }
    ],
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn"
  }
}
```

## Deployment and DevOps

### Production Deployment

#### Docker Configuration
```dockerfile
# Frontend Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```dockerfile
# Backend Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 5000
CMD ["node", "server.js"]
```

#### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - mongodb

  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

volumes:
  mongodb_data:
```

### CI/CD Pipeline

#### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Run linting
        run: npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to server
        run: |
          # Deployment commands
          ssh user@server 'cd /app && git pull && npm install && npm run build && pm2 restart app'
```

### Monitoring and Logging

#### Application Monitoring
```javascript
// Monitoring middleware
const morgan = require('morgan');
const winston = require('winston');

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Request logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Error handling
app.use((error, req, res, next) => {
  logger.error(error.stack);
  res.status(500).json({ message: 'Internal server error' });
});
```

#### Performance Monitoring
```typescript
// Frontend performance monitoring
const performanceObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log('Performance Entry:', entry);
    // Send to monitoring service
  }
});

performanceObserver.observe({ entryTypes: ['measure', 'navigation'] });
```

---

**This Developer Guide provides comprehensive technical documentation for the Queue Management System. Regular reference to this guide ensures consistent development practices and high-quality code.**

*For user guides and administrative documentation, please refer to the appropriate guides in the documentation suite.*
