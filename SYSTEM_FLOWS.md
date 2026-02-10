# System Flows Documentation

This document provides a comprehensive overview of all system flows, transaction flows, and operational processes in the Queue Management System.

## Table of Contents
1. [System Overview](#system-overview)
2. [User Authentication Flow](#user-authentication-flow)
3. [Queue Generation Flow](#queue-generation-flow)
4. [Queue Processing Flow](#queue-processing-flow)
5. [Transaction Flow System](#transaction-flow-system)
6. [Real-time Communication Flow](#real-time-communication-flow)
7. [Admin Management Flows](#admin-management-flows)
8. [Kiosk Management Flow](#kiosk-management-flow)
9. [Data Flow Architecture](#data-flow-architecture)
10. [Error Handling Flows](#error-handling-flows)

## System Overview

The Queue Management System operates on a multi-layered architecture with distinct flows for different user types and operations:

```
┌─────────────────────────────────────────────────────────────────┐
│                    SYSTEM ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────┤
│  Frontend Layer                                              │
│  ├─ Public Kiosk (Customer Interface)                        │
│  ├─ Window Dashboard (Service Provider Interface)               │
│  ├─ Admin Dashboard (Management Interface)                     │
│  └─ Public Display (Information Display)                      │
├─────────────────────────────────────────────────────────────────┤
│  Backend Layer                                               │
│  ├─ Authentication & Authorization                           │
│  ├─ Queue Management                                        │
│  ├─ Transaction Flow Processing                               │
│  ├─ Real-time Communication (Socket.io)                       │
│  └─ Administrative Operations                                 │
├─────────────────────────────────────────────────────────────────┤
│  Data Layer                                                 │
│  ├─ MongoDB Atlas (Primary Database)                          │
│  ├─ File Storage (Uploads)                                  │
│  └─ Session Management (JWT)                                │
└─────────────────────────────────────────────────────────────────┘
```

## User Authentication Flow

### Super Admin Authentication
```
User enters credentials → Frontend validation → Super admin detection → Backend verification
                                                                ↓
                                                    ┌─────────────────────────┐
                                                    │  Check .env variables │
                                                    │  SUPER_ADMIN_USERNAME  │
                                                    │  SUPER_ADMIN_PASSWORD  │
                                                    └─────────────────────────┘
                                                                ↓
                                                    ┌─────────────────────────┐
                                                    │  Generate JWT Token   │
                                                    │  Role: super_admin    │
                                                    │  UserId: super-admin   │
                                                    └─────────────────────────┘
                                                                ↓
                                                    ┌─────────────────────────┐
                                                    │  Return Auth Response │
                                                    │  Token + User Data    │
                                                    └─────────────────────────┘
```

### Regular Admin/Window User Authentication
```
User enters credentials → Frontend validation → Backend authentication
                                                                ↓
                                                    ┌─────────────────────────┐
                                                    │  Database Lookup      │
                                                    │  Admin Collection    │
                                                    │  User Collection     │
                                                    └─────────────────────────┘
                                                                ↓
                                                    ┌─────────────────────────┐
                                                    │  Password Compare     │
                                                    │  bcrypt verification  │
                                                    └─────────────────────────┘
                                                                ↓
                                                    ┌─────────────────────────┐
                                                    │  Generate JWT Token   │
                                                    │  Role: admin/window  │
                                                    │  UserId: _id         │
                                                    └─────────────────────────┘
                                                                ↓
                                                    ┌─────────────────────────┐
                                                    │  Return Auth Response │
                                                    │  Token + User Data    │
                                                    └─────────────────────────┘
```

## Queue Generation Flow

### Customer Queue Generation
```
Customer selects service → Kiosk interface → Service validation → Queue creation
                                                                    ↓
                                                        ┌─────────────────────────┐
                                                        │  Get Transaction     │
                                                        │  Flow Configuration │
                                                        │  (Service + Steps)   │
                                                        └─────────────────────────┘
                                                                    ↓
                                                        ┌─────────────────────────┐
                                                        │  Generate Queue       │
                                                        │  Number: Prefix+ID  │
                                                        │  Person Type Priority│
                                                        │  Initial Status:     │
                                                        │  waiting             │
                                                        └─────────────────────────┘
                                                                    ↓
                                                        ┌─────────────────────────┐
                                                        │  Save to Database    │
                                                        │  Queue Collection     │
                                                        └─────────────────────────┘
                                                                    ↓
                                                        ┌─────────────────────────┐
                                                        │  Real-time Update    │
                                                        │  Socket.io Emit      │
                                                        │  queueGenerated      │
                                                        └─────────────────────────┘
                                                                    ↓
                                                        ┌─────────────────────────┐
                                                        │  Print Queue Ticket   │
                                                        │  Display Number      │
                                                        │  Show Wait Time      │
                                                        └─────────────────────────┘
```

### Priority Queue Logic
```
Person Type Selection → Priority Assignment → Queue Position Calculation
                                                                ↓
                                                    ┌─────────────────────────┐
                                                    │  Priority Levels:     │
                                                    │  Priority: 9         │
                                                    │  Disabled: 8         │
                                                    │  Pregnant: 7         │
                                                    │  Senior: 6          │
                                                    │  Normal: 0          │
                                                    └─────────────────────────┘
                                                                ↓
                                                    ┌─────────────────────────┐
                                                    │  Queue Positioning   │
                                                    │  Higher priority      │
                                                    │  gets served first    │
                                                    │  Within same service  │
                                                    └─────────────────────────┘
```

## Queue Processing Flow

### Window Operator Queue Processing
```
Window User Login → View Current Queue → Call Next Customer → Update Status
                                                                    ↓
                                                        ┌─────────────────────────┐
                                                        │  Get Next Queue      │
                                                        │  For Assigned Window │
                                                        │  Transaction Flow    │
                                                        │  Step Logic          │
                                                        └─────────────────────────┘
                                                                    ↓
                                                        ┌─────────────────────────┐
                                                        │  Update Queue Status  │
                                                        │  waiting → serving   │
                                                        │  Assign Window       │
                                                        │  Set Start Time      │
                                                        └─────────────────────────┘
                                                                    ↓
                                                        ┌─────────────────────────┐
                                                        │  Audio Announcement  │
                                                        │  Text-to-Speech      │
                                                        │  Repeat 3 times     │
                                                        │  Per Queue/Window   │
                                                        └─────────────────────────┘
                                                                    ↓
                                                        ┌─────────────────────────┐
                                                        │  Real-time Update    │
                                                        │  Socket.io Emit      │
                                                        │  queueUpdated        │
                                                        │  soundNotification   │
                                                        └─────────────────────────┘
```

### Queue Completion Flow
```
Service Complete → Update Final Status → Transaction History → Next Customer
                                                                    ↓
                                                        ┌─────────────────────────┐
                                                        │  Mark as Served     │
                                                        │  Set End Time        │
                                                        │  Calculate Duration  │
                                                        └─────────────────────────┘
                                                                    ↓
                                                        ┌─────────────────────────┐
                                                        │  Save to History     │
                                                        │  TransactionHistory   │
                                                        │  Collection          │
                                                        └─────────────────────────┘
                                                                    ↓
                                                        ┌─────────────────────────┐
                                                        │  Transaction Flow    │
                                                        │  Next Step Logic     │
                                                        │  Multi-step Process  │
                                                        └─────────────────────────┘
```

## Transaction Flow System

### Transaction Flow Configuration
```
Admin creates transaction flow → Define steps → Assign windows → Activate flow
                                                                    ↓
                                                        ┌─────────────────────────┐
                                                        │  Transaction Flow     │
                                                        │  Configuration:       │
                                                        │  - Name              │
                                                        │  - Description       │
                                                        │  - Prefix            │
                                                        │  - Steps (Array)     │
                                                        │  - isActive          │
                                                        └─────────────────────────┘
```

### Step Configuration
```
Each transaction step contains:
┌─────────────────────────────────────────────────────────────────┐
│                   STEP STRUCTURE                        │
├─────────────────────────────────────────────────────────────────┤
│  stepNumber: Sequential order (1, 2, 3...)           │
│  stepName: Descriptive name of the step               │
│  windowNumber: Assigned window for this step            │
│  description: What happens at this step               │
│  _id: Unique identifier                              │
└─────────────────────────────────────────────────────────────────┘
```

### Multi-Step Transaction Example
```
Example: "Government ID Application"
┌─────────────────────────────────────────────────────────────────┐
│              TRANSACTION FLOW EXAMPLE                    │
├─────────────────────────────────────────────────────────────────┤
│  Service: Government ID Application                          │
│  Prefix: GID                                              │
│                                                             │
│  Step 1: Document Submission                               │
│  - Window: 1                                             │
│  - Description: Submit required documents                     │
│                                                             │
│  Step 2: Biometric Capture                                 │
│  - Window: 2                                             │
│  - Description: Capture fingerprints and photo                 │
│                                                             │
│  Step 3: Payment Processing                                │
│  - Window: 3                                             │
│  - Description: Process application fee                     │
│                                                             │
│  Step 4: ID Printing                                       │
│  - Window: 4                                             │
│  - Description: Print and issue government ID              │
└─────────────────────────────────────────────────────────────────┘
```

### Transaction Flow Execution
```
Customer gets queue → Follow defined steps → Progress tracking → Completion
                                                                    ↓
                                                        ┌─────────────────────────┐
                                                        │  Current Step Check   │
                                                        │  Window Assignment   │
                                                        │  Step Validation     │
                                                        └─────────────────────────┘
                                                                    ↓
                                                        ┌─────────────────────────┐
                                                        │  Complete Current    │
                                                        │  Step → Move to     │
                                                        │  Next Step          │
                                                        │  Update Queue       │
                                                        │  Status             │
                                                        └─────────────────────────┘
```

## Real-time Communication Flow

### Socket.io Connection Management
```
Client Connect → Authentication → Join Rooms → Real-time Updates
                                                                ↓
                                                    ┌─────────────────────────┐
                                                    │  Connection Types:    │
                                                    │  - Kiosk Clients     │
                                                    │  - Window Clients    │
                                                    │  - Display Clients    │
                                                    │  - Admin Clients     │
                                                    └─────────────────────────┘
                                                                    ↓
                                                    ┌─────────────────────────┐
                                                    │  Room Management:    │
                                                    │  - queue-updates     │
                                                    │  - window-{number}   │
                                                    │  - admin-updates     │
                                                    │  - display-updates   │
                                                    └─────────────────────────┘
```

### Real-time Events
```
Queue Generated → Emit to all clients → Update displays → Audio notification
                                                                    ↓
                                                        ┌─────────────────────────┐
                                                        │  Event Types:        │
                                                        │  - queueGenerated    │
                                                        │  - queueUpdated      │
                                                        │  - soundNotification │
                                                        │  - kioskStatusUpdate│
                                                        │  - userStatusUpdate │
                                                        └─────────────────────────┘
```

## Admin Management Flows

### User Management Flow
```
Admin accesses user management → Create/Update/Delete → Database operations → Real-time updates
                                                                                ↓
                                                                    ┌─────────────────────────┐
                                                                    │  User Operations:     │
                                                                    │  - Create User        │
                                                                    │  - Update User        │
                                                                    │  - Delete User        │
                                                                    │  - Toggle Status      │
                                                                    │  - Update Password    │
                                                                    └─────────────────────────┘
                                                                                ↓
                                                                    ┌─────────────────────────┐
                                                                    │  Database Actions:    │
                                                                    │  - User Collection    │
                                                                    │  - Admin Collection   │
                                                                    │  - Password Hashing   │
                                                                    │  - Validation        │
                                                                    └─────────────────────────┘
```

### Service Management Flow
```
Admin manages services → CRUD operations → Transaction flow assignment → System updates
                                                                                ↓
                                                                    ┌─────────────────────────┐
                                                                    │  Service Operations:   │
                                                                    │  - Create Service     │
                                                                    │  - Update Service     │
                                                                    │  - Delete Service     │
                                                                    │  - Window Assignment  │
                                                                    │  - Flow Association  │
                                                                    └─────────────────────────┘
```

## Kiosk Management Flow

### Kiosk Status Control
```
Admin updates kiosk → Status propagation → Frontend updates → Customer experience
                                                                                ↓
                                                                    ┌─────────────────────────┐
                                                                    │  Kiosk States:        │
                                                                    │  - Active             │
                                                                    │  - Paused             │
                                                                    │  - Closed             │
                                                                    │  - Maintenance        │
                                                                    └─────────────────────────┘
                                                                                ↓
                                                                    ┌─────────────────────────┐
                                                                    │  Status Effects:      │
                                                                    │  - Queue Generation   │
                                                                    │  - Display Messages   │
                                                                    │  - Audio Notifications│
                                                                    │  - Service Availability│
                                                                    └─────────────────────────┘
```

### Kiosk Configuration
```
Admin configures kiosk → Settings save → Real-time application → User interface updates
                                                                                ↓
                                                                    ┌─────────────────────────┐
                                                                    │  Configuration:        │
                                                                    │  - Government Office   │
                                                                    │  - Welcome Message    │
                                                                    │  - Closed Message     │
                                                                    │  - Available Services  │
                                                                    │  - Audio Settings     │
                                                                    │  - Display Theme      │
                                                                    └─────────────────────────┘
```

## Data Flow Architecture

### Request-Response Flow
```
Frontend Request → API Route → Middleware → Business Logic → Database → Response
                                                                                ↓
                                                                    ┌─────────────────────────┐
                                                                    │  Request Flow:        │
                                                                    │  1. Authentication   │
                                                                    │  2. Authorization    │
                                                                    │  3. Validation       │
                                                                    │  4. Business Logic   │
                                                                    │  5. Database Query   │
                                                                    │  6. Response Format  │
                                                                    └─────────────────────────┘
```

### Database Operations Flow
```
Application Logic → Mongoose ODM → MongoDB Atlas → Data Persistence → Real-time sync
                                                                                ↓
                                                                    ┌─────────────────────────┐
                                                                    │  Collections:          │
                                                                    │  - queues             │
                                                                    │  - users              │
                                                                    │  - admins             │
                                                                    │  - services           │
                                                                    │  - transactionFlows   │
                                                                    │  - transactionHistory │
                                                                    │  - personTypes        │
                                                                    │  - onHoldQueues       │
                                                                    │  - kioskStatus        │
                                                                    └─────────────────────────┘
```

## Error Handling Flows

### Authentication Errors
```
Invalid credentials → Error response → Frontend notification → Login retry
                                                                ↓
                                                    ┌─────────────────────────┐
                                                    │  Error Types:         │
                                                    │  - Invalid credentials│
                                                    │  - Account disabled   │
                                                    │  - Token expired      │
                                                    │  - Network error      │
                                                    └─────────────────────────┘
```

### System Errors
```
Database failure → Fallback handling → Error logging → User notification
                                                                ↓
                                                    ┌─────────────────────────┐
                                                    │  Error Handling:       │
                                                    │  - Database errors     │
                                                    │  - Network errors     │
                                                    │  - Validation errors   │
                                                    │  - System errors      │
                                                    │  - User feedback      │
                                                    └─────────────────────────┘
```

### Queue Processing Errors
```
Queue processing failure → Error recovery → Status update → Admin notification
                                                                        ↓
                                                            ┌─────────────────────────┐
                                                            │  Recovery Actions:    │
                                                            │  - Retry operations   │
                                                            │  - Status rollback    │
                                                            │  - Admin alerts      │
                                                            │  - Log errors       │
                                                            │  - User notification │
                                                            └─────────────────────────┘
```

## Security Flow

### JWT Token Management
```
Login → Token generation → Token storage → Token validation → Token refresh
                                                                ↓
                                                    ┌─────────────────────────┐
                                                    │  Token Lifecycle:      │
                                                    │  - Generation         │
                                                    │  - Storage (localStorage)│
                                                    │  - Validation         │
                                                    │  - Expiration (24h)   │
                                                    │  - Refresh            │
                                                    │  - Revocation         │
                                                    └─────────────────────────┘
```

### Role-Based Access Control
```
Authentication → Role verification → Permission check → Resource access
                                                                ↓
                                                    ┌─────────────────────────┐
                                                    │  Role Permissions:    │
                                                    │  - Super Admin: All   │
                                                    │  - Admin: Users+Services│
                                                    │  - Window: Queue Mgmt│
                                                    │  - Route Guards       │
                                                    │  - API Middleware    │
                                                    └─────────────────────────┘
```

## Performance Optimization Flows

### Database Query Optimization
```
Request → Query optimization → Index usage → Cached results → Fast response
                                                                ↓
                                                    ┌─────────────────────────┐
                                                    │  Optimization:        │
                                                    │  - Database indexes   │
                                                    │  - Query caching     │
                                                    │  - Connection pooling │
                                                    │  - Pagination        │
                                                    │  - Lazy loading      │
                                                    └─────────────────────────┘
```

### Real-time Performance
```
Socket events → Event batching → Efficient broadcasting → Client updates
                                                                ↓
                                                    ┌─────────────────────────┐
                                                    │  Performance:         │
                                                    │  - Event throttling   │
                                                    │  - Room management   │
                                                    │  - Connection limits  │
                                                    │  - Memory management │
                                                    │  - Cleanup processes │
                                                    └─────────────────────────┘
```

## Monitoring and Logging Flow

### System Monitoring
```
Application metrics → Performance tracking → Health checks → Admin dashboard
                                                                    ↓
                                                        ┌─────────────────────────┐
                                                        │  Monitoring:          │
                                                        │  - Queue metrics     │
                                                        │  - User activity     │
                                                        │  - System health     │
                                                        │  - Error rates       │
                                                        │  - Response times    │
                                                        │  - Database stats    │
                                                        └─────────────────────────┘
```

### Audit Trail
```
User actions → Log generation → Secure storage → Compliance reporting
                                                                ↓
                                                    ┌─────────────────────────┐
                                                    │  Audit Events:        │
                                                    │  - User login/logout  │
                                                    │  - Queue operations  │
                                                    │  - Admin actions     │
                                                    │  - System changes    │
                                                    │  - Error events      │
                                                    │  - Security events   │
                                                    └─────────────────────────┘
```

---

## Summary

This Queue Management System implements a comprehensive set of flows designed to handle:

- **Multi-user authentication** with role-based access control
- **Dynamic queue management** with priority handling
- **Flexible transaction flows** for complex service processes
- **Real-time communication** across all system components
- **Comprehensive admin tools** for system management
- **Robust error handling** and recovery mechanisms
- **Security-first design** with JWT authentication
- **Performance optimization** for high-load scenarios
- **Complete audit trails** for compliance and monitoring

The system is designed to be scalable, maintainable, and user-friendly while providing all necessary features for efficient queue management in various service environments.
