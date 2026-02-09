# Deployment Guide for Queue Management System

## 🚀 Production Deployment on Vercel

### Current Issue
Your frontend is deployed on Vercel (HTTPS) but trying to connect to a local backend (HTTP), causing mixed content errors.

### 🛠️ Solutions

## Option 1: Deploy Backend to a Cloud Service (Recommended)

### Step 1: Deploy Your Backend
Choose one of these services to deploy your Node.js backend:

- **Render.com** (Free tier available)
- **Railway.app** (Free tier available)  
- **Vercel Serverless Functions**
- **Heroku** (Paid)
- **DigitalOcean App Platform**

### Step 2: Update Environment Variables
In your Vercel dashboard, set these environment variables:

```
VITE_API_URL=https://your-backend-url.com
VITE_HTTPS=true
VITE_SECURE_COOKIES=true
```

### Step 3: Redeploy
Push your changes or trigger a redeploy in Vercel.

---

## Option 2: Use Vercel Serverless Functions (Advanced)

### Step 1: Convert Backend to Serverless
1. Move your server code to `/api` folder
2. Update for serverless compatibility
3. Deploy everything on Vercel

### Step 2: Update API Calls
Change API endpoints to use relative URLs:
```javascript
// Instead of: https://your-backend.com/api/queue
Use: /api/queue
```

---

## Option 3: Quick Fix for Testing (Temporary)

### Step 1: Update Vercel Environment Variables
Go to your Vercel project settings → Environment Variables and add:

```
VITE_API_URL=https://your-local-ip:5000
```

### Step 2: Enable HTTPS on Local Backend
Update your server to support HTTPS:

```javascript
// In your server/index.js or main server file
const https = require('https');
const fs = require('fs');

// Generate self-signed certificate for development
const options = {
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.cert')
};

// Create HTTPS server
https.createServer(options, app).listen(5000, () => {
  console.log('HTTPS Server running on port 5000');
});
```

### Step 3: Generate SSL Certificate
```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout server.key -out server.cert -days 365 -nodes
```

---

## 🔧 Configuration Files Updated

### ✅ What I've Fixed:
1. **Dynamic API URL Detection**: Automatically detects HTTPS/HTTP environment
2. **WebSocket Protocol Handling**: Converts HTTP→HTTPS and WS→WSS automatically  
3. **Production Environment File**: Created `.env.production` template
4. **Mixed Content Errors**: Fixed by ensuring HTTPS in production

### 📁 Files Modified:
- `src/config/app-config.ts` - Enhanced environment detection
- `src/config/api.ts` - Updated WebSocket URL handling
- `.env.production` - Production environment template

---

## 🚦 Next Steps

### For Immediate Testing:
1. Set `VITE_API_URL=https://192.168.1.5:5000` in Vercel environment variables
2. Enable HTTPS on your local server
3. Redeploy frontend

### For Production:
1. Deploy backend to Render/Railway/Vercel
2. Update `VITE_API_URL` to your deployed backend URL
3. Test all functionality

---

## 🔍 Debugging Tips

### Check Current Configuration:
Open browser console and look for:
```
🔧 Configuration loaded from .env:
🔗 API URL: https://your-backend-url.com
🔌 Socket URL: wss://your-backend-url.com
```

### Common Issues:
- **Mixed Content**: Ensure all URLs use HTTPS in production
- **CORS Errors**: Backend must allow your Vercel domain
- **WebSocket Errors**: Use WSS protocol for HTTPS sites

---

## 📞 Need Help?

1. **Backend Deployment**: I can help convert your backend for cloud deployment
2. **Serverless Setup**: Can assist with Vercel serverless functions
3. **SSL Setup**: Help with HTTPS configuration for local testing

Deploy your backend first, then update the VITE_API_URL environment variable in Vercel to fix the connection issues!
