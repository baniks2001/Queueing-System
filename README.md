# Queue Management System

A comprehensive enterprise-grade queue management system built with React + TypeScript + Vite frontend and Node.js + Express + MongoDB backend. This professional solution enables organizations to manage customer queues efficiently with real-time updates, audio announcements, and multi-device accessibility.

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Features](#features)
3. [System Architecture](#system-architecture)
4. [User Guides](#user-guides)
5. [Installation & Setup](#installation--setup)
6. [Configuration](#configuration)
7. [API Documentation](#api-documentation)
8. [Database Schema](#database-schema)
9. [System Flows](#system-flows)
10. [Security Features](#security-features)
11. [Development](#development)
12. [Deployment](#deployment)
13. [Troubleshooting](#troubleshooting)
14. [Support](#support)

## System Overview

The Queue Management System is a production-ready enterprise solution designed to streamline customer service operations. It provides a complete ecosystem for managing customer queues across multiple service windows with real-time synchronization and professional reporting capabilities.

### Key Components
- **Public Kiosk**: Customer self-service interface for queue generation
- **Admin Dashboard**: Centralized system management and analytics
- **Window Dashboards**: Individual service provider interfaces
- **Public Display**: Real-time queue information board with audio
- **Backend API**: RESTful services with real-time WebSocket support
- **Database**: MongoDB Atlas cloud storage with optimized schemas

## Features

### 🎯 Core Features
- **Public Kiosk**: Self-service queue number generation with service selection
- **Admin Dashboard**: Complete system management with user and service administration
- **Window Dashboard**: Service provider interface with queue management
- **Public Display**: Real-time queue status display with audio announcements
- **Sound Notifications**: Audio announcements for called numbers with repeat limits
- **Real-time Updates**: Live queue status via WebSocket connections
- **Transaction Flows**: Configurable multi-step service workflows
- **Kiosk Management**: Centralized kiosk status and configuration control

### 👥 User Management
- **Multi-role System**: Super Admin, Admin, Window Users
- **Service Assignment**: Assign users to specific services and windows
- **Window Management**: Configure window numbers and service flows
- **User Status Control**: Activate/deactivate user accounts
- **Password Management**: Secure password updates for all user types

### 🎨 Modern UI/UX
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Modern Styling**: Built with Tailwind CSS and Headless UI components
- **Accessibility**: WCAG compliant design with keyboard navigation
- **Network Access**: Accessible across all connected devices on local network
- **Toast Notifications**: Non-intrusive feedback system for all actions

### 🔧 Technical Features
- **Real-time Communication**: Socket.io integration for instant updates
- **Database**: MongoDB Atlas cloud storage with Mongoose ODM
- **Authentication**: JWT-based security with role-based access control
- **Cross-platform**: Works on any device with modern web browser
- **Auto IP Detection**: Automatic network configuration for multi-device access
- **Rate Limiting**: Built-in protection against API abuse
- **File Uploads**: Support for document and image uploads via Multer

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Public Kiosk  │    │  Admin Panel    │    │ Window Dashboard│
│                 │    │                 │    │                 │
│ • Get Number    │    │ • User Mgmt     │    │ • Next Queue    │
│ • Select Service│    │ • Services      │    │ • Current Status│
│ • Person Type   │    │ • Transaction  │    │ • History       │
│ • Audio Feedback │    │ • Reports       │    │ • Sound Notify  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Backend API   │
                    │                 │
                    │ • Express.js    │
                    │ • Socket.io     │
                    │ • MongoDB       │
                    │ • JWT Auth      │
                    │ • Rate Limiting │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │   MongoDB Atlas │
                    │                 │
                    │ • Queues        │
                    │ • Users         │
                    │ • Services      │
                    │ • Transaction  │
                    │ • Settings      │
                    └─────────────────┘
```

## User Guides

### 📖 [Client Guide](./docs/CLIENT_GUIDE.md)
Complete guide for end users and customers using the queue system:
- How to generate queue numbers
- Understanding priority categories
- Reading queue displays
- What to expect when called

### 👥 [Staff Guide](./docs/STAFF_GUIDE.md)
Comprehensive guide for window operators and service staff:
- Login and dashboard navigation
- Queue management procedures
- Audio announcement controls
- Handling special cases

### 🔧 [Admin Guide](./docs/ADMIN_GUIDE.md)
Detailed instructions for system administrators:
- User management and permissions
- Service configuration
- Queue monitoring and analytics
- System settings and maintenance

### 👑 [Super Admin Guide](./docs/SUPER_ADMIN_GUIDE.md)
Advanced guide for system super administrators:
- Complete system control
- Database management
- Advanced configuration
- Security and backup procedures

### 💻 [Developer Guide](./docs/DEVELOPER_GUIDE.md)
Technical documentation for developers:
- Code architecture and structure
- API development and customization
- Database schema modifications
- Deployment and maintenance

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- MongoDB Atlas account
- Git

### 1. Clone Repository
```bash
git clone <repository-url>
cd queueing-system
```

### 2. Install Dependencies

#### Frontend Dependencies
```bash
npm install
```

#### Backend Dependencies
```bash
cd server
npm install
```

### 3. Environment Configuration

Create two `.env` files:

#### Frontend `.env` (root directory)
```env
# API Configuration
VITE_API_URL=http://localhost:5000
VITE_FRONTEND_HOST=localhost
VITE_FRONTEND_PORT=5174
VITE_BACKEND_HOST=localhost

# Super Admin Credentials (for frontend detection)
VITE_SUPERADMIN_USERNAME=superadmin
VITE_SUPERADMIN_PASSWORD=SuperAdmin123!

# Security Settings
VITE_HTTPS=false
VITE_SECURE_COOKIES=false
```

#### Backend `.env` (server directory)
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

### 4. Database Setup

Run the seed script to initialize the database with default data:
```bash
cd server
node seed.js
```

This will create:
- **5 Default Services**: Cashier, Information, Documentation, Technical Support, Customer Service
- **5 Person Types**: Normal, Person with disabilities, Pregnant, Senior Citizen, Priority
- **5 Window Users**: window1-window5 with default assignments
- **1 Admin User**: admin account for system administration

### 5. Start Application

#### Start Backend Server
```bash
cd server
npm start
```
The backend will run on `http://localhost:5000` with automatic IP detection for network access.

#### Start Frontend Development Server
```bash
npm run dev -- --host
```
The frontend will run on `http://localhost:5174` (or next available port) with network accessibility.

## Default Credentials

### Super Admin
- **Username**: `superadmin`
- **Password**: `SuperAdmin123!`
- **Access**: Complete system control, user management, and configuration

### Admin
- **Username**: `admin`
- **Password**: `Admin123!`
- **Access**: User and service management, queue monitoring

### Window Users
- **Usernames**: `window1` to `window5`
- **Password**: `Window123!`
- **Access**: Queue management for assigned windows

## Access URLs

### Local Development
- **Public Kiosk**: `http://localhost:5174/`
- **Admin Login**: `http://localhost:5174/admin/login`
- **Public Display**: `http://localhost:5174/display`
- **Window Dashboards**: 
  - Window 1: `http://localhost:5174/window/1`
  - Window 2: `http://localhost:5174/window/2`
  - And so on for all windows...

### Network Access
The system automatically detects your network IP and configures access for all connected devices:

1. **Automatic IP Detection**: Server detects your WiFi/Ethernet IP on startup
2. **Cross-device Access**: Use your IP address instead of localhost
   - Example: `http://192.168.1.100:5174/`
3. **Mobile Friendly**: Full functionality on tablets and smartphones

## Usage Guide

### For Customers (Public Kiosk)
1. Select your desired service from the available options
2. Choose your person type if applicable (Priority, Senior Citizen, etc.)
3. Click "Get Queue Number" to receive your ticket
4. Take note of your queue number and estimated wait time
5. Wait for your number to be called and displayed on the public screen
6. Proceed to the designated window when your number is announced

### For Window Operators
1. Login with your window credentials
2. View current serving queue and customer information
3. Click "Next Queue" to call the next customer
4. System automatically announces the number with audio
5. Mark customer as served, on hold, or transfer as needed
6. View service history and performance metrics

### For Administrators
1. Login with admin credentials
2. **User Management**: Create, update, activate/deactivate users
3. **Service Management**: Configure services and transaction flows
4. **Queue Monitoring**: Real-time queue status and statistics
5. **System Configuration**: Kiosk settings, audio preferences
6. **Reports**: Generate usage and performance reports

## API Endpoints

### Authentication
- `POST /api/auth/login` - Regular user/admin login
- `POST /api/auth/super-admin-login` - Super admin authentication

### Queue Management
- `POST /api/queue/generate` - Generate new queue number
- `GET /api/queue/current` - Get currently serving queues
- `GET /api/queue/waiting` - Get waiting queues
- `POST /api/queue/next/:windowNumber` - Call next queue
- `POST /api/queue/serve/:queueId` - Mark queue as served
- `POST /api/queue/hold/:queueId` - Place queue on hold

### User Management
- `GET /api/users/window-users` - Get window users
- `POST /api/users/window-user` - Create window user
- `PUT /api/users/window-user/:id` - Update window user
- `DELETE /api/users/window-user/:id` - Delete window user
- `PUT /api/users/update-password/:id` - Update user password
- `PUT /api/users/toggle-status/:id` - Toggle user active status

### Admin Management
- `GET /api/admin/services` - Get all services
- `POST /api/admin/service` - Create new service
- `PUT /api/admin/service/:id` - Update service
- `DELETE /api/admin/service/:id` - Delete service
- `GET /api/admin/transaction-flows` - Get transaction flows
- `POST /api/admin/transaction-flow` - Create transaction flow
- `PUT /api/admin/transaction-flow/:id` - Update transaction flow
- `DELETE /api/admin/transaction-flow/:id` - Delete transaction flow

### Kiosk Management
- `GET /api/kiosk/status` - Get kiosk status
- `PUT /api/kiosk/status` - Update kiosk status
- `GET /api/kiosk/settings` - Get kiosk settings
- `PUT /api/kiosk/settings` - Update kiosk settings

## WebSocket Events

### Client to Server
- `connection` - New client connection
- `disconnect` - Client disconnection

### Server to Client
- `queueGenerated` - New queue number generated
- `queueUpdated` - Queue status updated
- `soundNotification` - Play sound notification
- `kioskStatusUpdated` - Kiosk status changed

## Technologies Used

### Frontend
- **React 19.2.0** - Modern UI framework with concurrent features
- **TypeScript 5.9.3** - Type safety and enhanced development experience
- **Vite 7.2.4** - Fast build tool and development server
- **Tailwind CSS 3.4.19** - Utility-first CSS framework
- **React Router 7.13.0** - Client-side routing
- **Socket.io Client 4.8.3** - Real-time communication
- **Axios 1.13.4** - HTTP client with interceptors
- **Heroicons 2.2.0** - Consistent icon system
- **Headless UI 2.2.9** - Accessible UI components
- **Lucide React 0.563.0** - Additional icon set

### Backend
- **Node.js** - JavaScript runtime environment
- **Express.js 4.18.2** - Web application framework
- **Socket.io 4.7.4** - Real-time bidirectional communication
- **MongoDB 8.0.3** - NoSQL document database
- **Mongoose 8.0.3** - MongoDB object modeling
- **JWT 9.0.2** - JSON Web Token authentication
- **bcrypt 6.0.0** - Password hashing and security
- **bcryptjs 2.4.3** - Legacy password compatibility
- **CORS 2.8.5** - Cross-origin resource sharing
- **Helmet 8.1.0** - Security middleware
- **Express Rate Limit 8.2.1** - API rate limiting
- **Multer 2.0.2** - File upload handling
- **Nodemailer 6.9.7** - Email sending capabilities
- **Dotenv 16.3.1** - Environment variable management

## System Flows

### 📋 [Complete System Flows Documentation](./SYSTEM_FLOWS.md)
Detailed documentation of all system processes and workflows:
- User authentication flows
- Queue generation and processing
- Transaction flow execution
- Real-time communication patterns
- Error handling procedures
- Data flow architecture

## Database Schema

### 🗄️ Database Collections
The system uses MongoDB Atlas with the following collections:

#### Core Collections
- **queues** - Active and historical queue records
- **users** - System user accounts and permissions
- **admins** - Administrative user accounts
- **services** - Available services and configurations
- **transactionFlows** - Multi-step service workflows
- **transactionHistory** - Completed transaction records
- **personTypes** - Priority category definitions
- **onHoldQueues** - Temporary queue holds
- **kioskStatus** - System status and configuration

#### Schema Details
Each collection is optimized for performance with proper indexing, validation rules, and relationships. See the [Developer Guide](./docs/DEVELOPER_GUIDE.md) for detailed schema documentation.

## Project Structure

```
queueing-system/
├── src/                        # Frontend source code
│   ├── components/              # React components
│   │   ├── PublicKiosk.tsx     # Main kiosk interface
│   │   ├── AdminLogin.tsx       # Admin authentication
│   │   ├── AdminDashboard.tsx   # Admin main panel
│   │   ├── AdminManagement.tsx   # User management
│   │   ├── ServiceManagement.tsx # Service configuration
│   │   ├── QueueManagement.tsx   # Queue monitoring
│   │   ├── WindowDashboard.tsx  # Window operator interface
│   │   ├── WindowLogin.tsx      # Window authentication
│   │   ├── PublicDisplay.tsx    # Public queue display
│   │   ├── ConfirmationModal.tsx # Reusable modal
│   │   └── Toast.tsx           # Notification system
│   ├── contexts/               # React contexts
│   │   ├── AuthContext.tsx     # Authentication state
│   │   ├── QueueContext.tsx    # Queue state management
│   │   └── ToastContext.tsx    # Notification management
│   ├── config/                 # Configuration files
│   │   └── api.ts            # API configuration
│   ├── assets/                 # Static assets
│   ├── types/                  # TypeScript type definitions
│   ├── App.tsx               # Main application component
│   ├── main.tsx              # Application entry point
│   ├── index.css             # Global styles
│   └── App.css              # App-specific styles
├── server/                     # Backend source code
│   ├── models/                # Database models
│   │   ├── User.js           # User schema and methods
│   │   ├── Admin.js          # Admin schema
│   │   ├── Queue.js          # Queue schema
│   │   ├── Service.js        # Service schema
│   │   ├── PersonType.js     # Person type schema
│   │   ├── TransactionFlow.js # Transaction flow schema
│   │   ├── TransactionHistory.js # Transaction history
│   │   ├── OnHoldQueue.js    # On-hold queue management
│   │   └── KioskStatus.js   # Kiosk status management
│   ├── routes/                # API routes
│   │   ├── auth.js           # Authentication endpoints
│   │   ├── queue.js          # Queue management
│   │   ├── users.js          # User management
│   │   ├── admin.js          # Admin functions
│   │   ├── services.js       # Service management
│   │   ├── transactionFlow.js # Transaction flow management
│   │   └── kiosk.js         # Kiosk management
│   ├── middleware/            # Express middleware
│   │   └── auth.js          # Authentication middleware
│   ├── server.js             # Main server application
│   ├── seed.js               # Database seeding script
│   └── .env                 # Environment variables
├── docs/                      # Documentation guides
│   ├── CLIENT_GUIDE.md       # End user guide
│   ├── STAFF_GUIDE.md        # Staff operator guide
│   ├── ADMIN_GUIDE.md        # System admin guide
│   ├── SUPER_ADMIN_GUIDE.md  # Super admin guide
│   └── DEVELOPER_GUIDE.md    # Developer documentation
├── public/                    # Static public files
├── uploads/                   # File upload directory
├── package.json              # Frontend dependencies
├── vite.config.ts            # Vite configuration
├── tailwind.config.js        # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
├── eslint.config.js          # ESLint configuration
└── README.md                # This file
```

## Security Features

### Authentication & Authorization
- JWT-based authentication with expiration
- Role-based access control (Super Admin, Admin, Window User)
- Secure password hashing with bcrypt
- Session management with automatic logout

### API Security
- Rate limiting to prevent abuse
- CORS configuration for controlled access
- Helmet security headers
- Input validation and sanitization
- SQL injection prevention (NoSQL injection protection)

### Data Protection
- Environment variable isolation
- No hardcoded credentials in source code
- Secure file upload handling
- HTTPS ready configuration

## Development

### Available Scripts

#### Frontend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

#### Backend
```bash
npm start            # Start production server
npm run dev          # Start development server with nodemon
```

### Code Quality
- ESLint for code linting
- TypeScript for type safety
- Prettier for code formatting
- Git hooks for pre-commit checks

## Deployment

### Production Considerations
- Use HTTPS for all connections
- Configure proper firewall rules
- Set up reverse proxy (nginx/Apache)
- Enable MongoDB authentication
- Configure environment variables properly
- Set up monitoring and logging
- Regular database backups

### Environment Variables
Ensure all sensitive data is stored in environment variables:
- Database credentials
- JWT secrets
- API keys
- Email credentials

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   - Change port in package.json or use different port
   - Kill existing processes on the port

2. **Database Connection Failed**
   - Check MongoDB URI in .env file
   - Verify network connectivity
   - Check MongoDB Atlas whitelist

3. **CORS Issues**
   - Verify ALLOWED_ORIGINS in server .env
   - Check frontend API URL configuration

4. **Audio Not Working**
   - Check browser audio permissions
   - Verify sound files exist in public directory
   - Test with different browsers

### Logging
- Server logs show connection status and errors
- Client console shows API requests and WebSocket events
- Check browser developer tools for detailed debugging

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Check existing issues for solutions
- Review documentation for common problems
- Contact the development team for critical issues

---

**Important Notes**:
- This system is designed for local network use with automatic IP detection
- For production deployment, ensure proper security measures are in place
- Regularly update dependencies for security patches
- Monitor system performance and user feedback
- Keep database backups regular and tested
