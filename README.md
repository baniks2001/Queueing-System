# Queue Management System

A comprehensive queue management system built with React + TypeScript + Vite frontend and Node.js + Express + MongoDB backend. This system allows organizations to manage customer queues efficiently with real-time updates and sound notifications.

## Features

### 🎯 Core Features
- **Public Kiosk**: Self-service queue number generation
- **Admin Dashboard**: Complete system management
- **Window Dashboard**: Service provider interface
- **Public Display**: Real-time queue status display
- **Sound Notifications**: Audio announcements for called numbers
- **Real-time Updates**: Live queue status via WebSocket

### 👥 User Management
- **Multi-role System**: Admin, Window Users, Super Admin
- **Service Assignment**: Assign users to specific services
- **Window Management**: Configure window numbers and flow

### 🎨 Modern UI/UX
- **Responsive Design**: Works on desktop and mobile
- **Modern Styling**: Built with Tailwind CSS
- **Accessibility**: WCAG compliant design
- **Network Access**: Accessible across connected devices

### 🔧 Technical Features
- **Real-time Communication**: Socket.io integration
- **Database**: MongoDB Atlas cloud storage
- **Authentication**: JWT-based security
- **Cross-platform**: Works on any device with web browser

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Public Kiosk  │    │  Admin Panel    │    │ Window Dashboard│
│                 │    │                 │    │                 │
│ • Get Number    │    │ • User Mgmt     │    │ • Next Queue    │
│ • Select Service│    │ • Services      │    │ • Current Status│
│ • Person Type   │    │ • Reports       │    │ • History       │
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
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │   MongoDB Atlas │
                    │                 │
                    │ • Queues        │
                    │ • Users         │
                    │ • Services      │
                    │ • Settings      │
                    └─────────────────┘
```

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- MongoDB Atlas account

### 1. Clone the Repository
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

Create a `.env` file in the `server` directory:
```env
MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/queueing-system
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=5000
NODE_ENV=development
```

### 4. Database Setup

Run the seed script to initialize the database with default data:
```bash
cd server
node seed.js
```

This will create:
- 5 default services (Cashier, Information, Documentation, Technical Support, Customer Service)
- 5 person types (Normal, Person with disabilities, Pregnant, Senior Citizen, Priority)
- 5 window users
- 1 admin user

### 5. Start the Application

#### Start Backend Server
```bash
cd server
npm start
```
The backend will run on `http://localhost:5000`

#### Start Frontend Development Server
```bash
npm run dev -- --host
```
The frontend will run on `http://localhost:5173` (or next available port)

## Default Credentials

### Super Admin
- **Username**: `superadmin`
- **Password**: `SuperAdmin123!`

### Admin
- **Username**: `admin`
- **Password**: `Admin123!`

### Window Users
- **Username**: `window1` to `window5`
- **Password**: `Window123!`

## Access URLs

- **Public Kiosk**: `http://localhost:5173/`
- **Admin Login**: `http://localhost:5173/admin/login`
- **Public Display**: `http://localhost:5173/display`
- **Window Dashboards**: 
  - Window 1: `http://localhost:5173/window/1`
  - Window 2: `http://localhost:5173/window/2`
  - And so on...

## Network Access

The system is configured to work across your local network. Once running:

1. **Find your IP address**:
   ```bash
   ipconfig  # On Windows
   ifconfig  # On macOS/Linux
   ```

2. **Access from other devices**:
   - Replace `localhost` with your IP address
   - Example: `http://192.168.1.100:5173/`

## Usage Guide

### For Customers (Public Kiosk)
1. Select your desired service
2. Choose your person type (if applicable)
3. Click "Get Queue Number"
4. Take note of your queue number
5. Wait for your number to be called

### For Window Operators
1. Login with your window credentials
2. View current serving queue
3. Click "Next Queue" to call the next customer
4. System will announce the number automatically

### For Administrators
1. Login with admin credentials
2. Manage users and services
3. Configure window flows
4. Monitor queue statistics
5. Generate reports

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/super-admin-login` - Super admin login

### Queue Management
- `POST /api/queue/generate` - Generate new queue number
- `GET /api/queue/current` - Get currently serving queues
- `GET /api/queue/waiting` - Get waiting queues
- `POST /api/queue/next/:windowNumber` - Call next queue

### User Management
- `GET /api/users/window-users` - Get window users
- `POST /api/users/window-user` - Create window user
- `PUT /api/users/window-user/:id` - Update window user
- `DELETE /api/users/window-user/:id` - Delete window user

### Admin Management
- `GET /api/admin/services` - Get services
- `POST /api/admin/service` - Create service
- `PUT /api/admin/service/:id` - Update service
- `DELETE /api/admin/service/:id` - Delete service

## WebSocket Events

### Client to Server
- `connection` - New client connection
- `disconnect` - Client disconnection

### Server to Client
- `queueGenerated` - New queue number generated
- `queueUpdated` - Queue status updated
- `soundNotification` - Play sound notification

## Technologies Used

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Socket.io Client** - Real-time communication
- **Axios** - HTTP client
- **Heroicons** - Icons

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.io** - Real-time communication
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin resource sharing

## Project Structure

```
queueing-system/
├── src/
│   ├── components/          # React components
│   │   ├── PublicKiosk.tsx
│   │   ├── AdminLogin.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── WindowDashboard.tsx
│   │   └── PublicDisplay.tsx
│   ├── contexts/           # React contexts
│   │   ├── AuthContext.tsx
│   │   └── QueueContext.tsx
│   ├── App.tsx            # Main App component
│   ├── main.tsx           # Entry point
│   └── index.css          # Global styles
├── server/
│   ├── models/            # Database models
│   │   ├── User.js
│   │   ├── Queue.js
│   │   ├── Service.js
│   │   └── PersonType.js
│   ├── routes/            # API routes
│   │   ├── auth.js
│   │   ├── queue.js
│   │   ├── users.js
│   │   └── admin.js
│   ├── server.js          # Main server file
│   ├── seed.js            # Database seed script
│   └── .env               # Environment variables
├── package.json
├── tailwind.config.js
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team.

---

**Note**: This system is designed for local network use. For production deployment, please ensure proper security measures are in place, including HTTPS, firewall configuration, and secure database connections.
