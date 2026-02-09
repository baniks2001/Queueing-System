#!/usr/bin/env node

// Auto-startup script for Queue Management System
// Automatically detects network configuration and starts both frontend and backend

import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

console.log('🚀 Queue Management System Auto-Startup Script');
console.log('================================================');

// Enhanced network detection
function detectNetworkConfiguration() {
    const networkInterfaces = os.networkInterfaces();
    let primaryIP = 'localhost';
    let wifiIP = null;
    let ethernetIP = null;

    Object.keys(networkInterfaces).forEach(interfaceName => {
        networkInterfaces[interfaceName].forEach(iface => {
            if (iface.family === 'IPv4' && !iface.internal) {
                const interfaceLower = interfaceName.toLowerCase();
                
                if (interfaceLower.includes('wi-fi') || interfaceLower.includes('wlan')) {
                    wifiIP = iface.address;
                } else if (interfaceLower.includes('ethernet') || interfaceLower.includes('eth') || interfaceLower.includes('lan')) {
                    ethernetIP = iface.address;
                }
                primaryIP = iface.address;
            }
        });
    });

    const selectedIP = wifiIP || ethernetIP || primaryIP;
    const networkType = wifiIP ? 'wifi' : ethernetIP ? 'ethernet' : 'localhost';

    return {
        currentIP: selectedIP,
        wifiIP,
        ethernetIP,
        networkType,
        frontendUrl: `http://${selectedIP}:5174`,
        backendUrl: `http://${selectedIP}:5000`,
        socketUrl: `http://${selectedIP}:5000`
    };
}

// Update .env file with network configuration
function updateEnvironmentFile(networkConfig) {
    try {
        const envPath = path.join(__dirname, '.env');
        let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

        console.log('📝 Updating environment configuration...');

        const updates = {
            'VITE_API_URL': networkConfig.backendUrl,
            'VITE_FRONTEND_HOST': networkConfig.currentIP,
            'VITE_BACKEND_HOST': networkConfig.currentIP,
            'VITE_FRONTEND_PORT': '5174',
            'VITE_BACKEND_PORT': '5000',
            'SERVER_PORT': '5000',
            'DETECTED_IP': networkConfig.currentIP,
            'NETWORK_TYPE': networkConfig.networkType
        };

        Object.entries(updates).forEach(([key, value]) => {
            const regex = new RegExp(`^${key}=.*$`, 'gm');
            if (regex.test(envContent)) {
                envContent = envContent.replace(regex, `${key}=${value}`);
            } else {
                envContent += `\n${key}=${value}`;
            }
        });

        // Ensure essential configurations exist
        if (!envContent.includes('SUPER_ADMIN_USERNAME=')) {
            envContent += '\n# Super Admin Configuration\nSUPER_ADMIN_USERNAME=superadmin\nSUPER_ADMIN_PASSWORD=SuperAdmin123!';
        }
        if (!envContent.includes('JWT_SECRET=')) {
            envContent += '\n# JWT Secret\nJWT_SECRET=queueing@2025system';
        }
        if (!envContent.includes('MONGODB_URI=')) {
            envContent += '\n# Database Configuration\nMONGODB_URI=mongodb+srv://servandoytio:qDn2Se8cKbWaPCeN@merncluster.2veth.mongodb.net/?appName=mernCluster';
        }

        fs.writeFileSync(envPath, envContent.trim());
        console.log('✅ Environment configuration updated successfully');
        
        return true;
    } catch (error) {
        console.error('❌ Failed to update environment configuration:', error.message);
        return false;
    }
}

// Check if required ports are available
function checkPortAvailability(port, name) {
    return new Promise((resolve) => {
        import('net').then(net => {
            const server = net.createServer();
            
            server.listen(port, () => {
                server.once('close', () => {
                    console.log(`✅ Port ${port} (${name}) is available`);
                    resolve(true);
                });
                server.close();
            });
            
            server.on('error', () => {
                console.log(`❌ Port ${port} (${name}) is already in use`);
                resolve(false);
            });
        });
    });
}

// Start backend server
function startBackend() {
    console.log('🔧 Starting Backend Server...');
    
    const backendProcess = spawn('node', ['server/server.js'], {
        stdio: 'inherit',
        cwd: __dirname,
        env: { ...process.env }
    });

    backendProcess.on('error', (error) => {
        console.error('❌ Failed to start backend:', error.message);
    });

    backendProcess.on('close', (code) => {
        console.log(`🔌 Backend process exited with code ${code}`);
    });

    return backendProcess;
}

// Start frontend development server
function startFrontend() {
    console.log('🎨 Starting Frontend Development Server...');
    
    const frontendProcess = spawn('npm', ['run', 'dev'], {
        stdio: 'inherit',
        cwd: __dirname,
        env: { ...process.env }
    });

    frontendProcess.on('error', (error) => {
        console.error('❌ Failed to start frontend:', error.message);
    });

    frontendProcess.on('close', (code) => {
        console.log(`🎨 Frontend process exited with code ${code}`);
    });

    return frontendProcess;
}

// Main startup function
async function main() {
    try {
        console.log('🌐 Detecting network configuration...');
        const networkConfig = detectNetworkConfiguration();
        
        console.log('\n📊 Network Configuration Detected:');
        console.log(`   Current IP: ${networkConfig.currentIP}`);
        console.log(`   Network Type: ${networkConfig.networkType}`);
        console.log(`   WiFi IP: ${networkConfig.wifiIP || 'Not found'}`);
        console.log(`   Ethernet IP: ${networkConfig.ethernetIP || 'Not found'}`);
        console.log(`   Frontend URL: ${networkConfig.frontendUrl}`);
        console.log(`   Backend URL: ${networkConfig.backendUrl}`);
        
        // Check port availability
        console.log('\n🔍 Checking port availability...');
        const backendPortAvailable = await checkPortAvailability(5000, 'Backend');
        const frontendPortAvailable = await checkPortAvailability(5174, 'Frontend');
        
        if (!backendPortAvailable || !frontendPortAvailable) {
            console.log('\n⚠️  Some ports are already in use. Please check the processes above.');
            process.exit(1);
        }
        
        // Update environment
        console.log('\n⚙️  Updating environment configuration...');
        const envUpdated = updateEnvironmentFile(networkConfig);
        
        if (!envUpdated) {
            console.log('\n❌ Failed to update environment configuration. Exiting...');
            process.exit(1);
        }
        
        console.log('\n🚀 Starting services...');
        console.log('================================================');
        
        // Start backend
        const backendProcess = startBackend();
        
        // Wait a moment for backend to start
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Start frontend
        const frontendProcess = startFrontend();
        
        console.log('\n✅ Services started successfully!');
        console.log('================================================');
        console.log(`🌐 Frontend: ${networkConfig.frontendUrl}`);
        console.log(`🔧 Backend API: ${networkConfig.backendUrl}/api`);
        console.log(`🔊 Socket.IO: ${networkConfig.socketUrl}`);
        console.log(`📊 Health Check: ${networkConfig.backendUrl}/api/health`);
        console.log('================================================');
        console.log('Press Ctrl+C to stop all services');
        
        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down services...');
            
            if (backendProcess) {
                backendProcess.kill('SIGTERM');
            }
            
            if (frontendProcess) {
                frontendProcess.kill('SIGTERM');
            }
            
            setTimeout(() => {
                console.log('✅ All services stopped');
                process.exit(0);
            }, 2000);
        });
        
        process.on('SIGTERM', () => {
            console.log('\n🛑 Shutting down services...');
            
            if (backendProcess) {
                backendProcess.kill('SIGTERM');
            }
            
            if (frontendProcess) {
                frontendProcess.kill('SIGTERM');
            }
            
            setTimeout(() => {
                console.log('✅ All services stopped');
                process.exit(0);
            }, 2000);
        });
        
    } catch (error) {
        console.error('❌ Startup failed:', error.message);
        process.exit(1);
    }
}

// Run main function
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export {
    detectNetworkConfiguration,
    updateEnvironmentFile,
    checkPortAvailability,
    startBackend,
    startFrontend
};
