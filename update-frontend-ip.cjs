const fs = require('fs');
const path = require('path');
const os = require('os');

function updateFrontendIP() {
    console.log('🔄 Updating Frontend IP Configuration...');
    
    // Get current network IPs
    const networkInterfaces = os.networkInterfaces();
    let primaryIP = 'localhost';
    
    Object.keys(networkInterfaces).forEach(interfaceName => {
        networkInterfaces[interfaceName].forEach(iface => {
            if (iface.family === 'IPv4' && !iface.internal) {
                if (interfaceName.toLowerCase().includes('wi-fi') || interfaceName.toLowerCase().includes('wlan')) {
                    primaryIP = iface.address;
                    console.log(`📡 Found WiFi IP: ${primaryIP}`);
                }
            }
        });
    });

    // Update frontend .env file
    const frontendEnvPath = path.join(__dirname, '.env');
    
    try {
        let envContent = fs.readFileSync(frontendEnvPath, 'utf8');
        const lines = envContent.split('\n');
        
        // Update IP-related lines
        const updatedLines = lines.map(line => {
            if (line.startsWith('VITE_BACKEND_HOST=')) {
                return `VITE_BACKEND_HOST=${primaryIP}`;
            }
            if (line.startsWith('VITE_API_URL=')) {
                return `VITE_API_URL=http://${primaryIP}:5000`;
            }
            if (line.startsWith('VITE_FRONTEND_HOST=')) {
                return `VITE_FRONTEND_HOST=${primaryIP}`;
            }
            if (line.includes('CLIENT_URL=')) {
                const urls = [`http://localhost:5174`, `http://${primaryIP}:5174`];
                return `CLIENT_URL=${urls.join(',')}`;
            }
            if (line.includes('ALLOWED_ORIGINS=')) {
                const origins = [
                    'http://localhost:5174',
                    `http://${primaryIP}:5174`,
                    'http://localhost:3000',
                    `http://${primaryIP}:3000`
                ];
                return `ALLOWED_ORIGINS=${origins.join(',')}`;
            }
            return line;
        });
        
        fs.writeFileSync(frontendEnvPath, updatedLines.join('\n'));
        console.log(`✅ Updated frontend .env with IP: ${primaryIP}`);
        console.log(`🌐 Frontend will now connect to: http://${primaryIP}:5000`);
        
    } catch (error) {
        console.error('❌ Error updating frontend .env:', error.message);
    }
}

updateFrontendIP();
