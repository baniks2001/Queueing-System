const axios = require('axios');
const getApiUrl = (path) => `http://localhost:5000/api${path}`;

async function testEndpoints() {
  console.log('🧪 Testing API endpoints...\n');
  
  try {
    // Test 1: Get all current queues (used by PublicDisplay)
    console.log('1️⃣ Testing /api/queue/current (PublicDisplay):');
    const currentResponse = await axios.get(getApiUrl('/queue/current'));
    console.log('✅ Response:', currentResponse.data);
    console.log('📊 Count:', currentResponse.data.length);
    console.log('');
    
    // Test 2: Get current queue for Window 1 (used by WindowDashboard)
    console.log('2️⃣ Testing /api/queue/current/1 (WindowDashboard):');
    const window1Response = await axios.get(getApiUrl('/queue/current/1'));
    console.log('✅ Response:', window1Response.data);
    console.log('📋 Queue Number:', window1Response.data?.queueNumber);
    console.log('');
    
    // Test 3: Get next queues for Window 1
    console.log('3️⃣ Testing /api/queue/next/1 (WindowDashboard Next):');
    const nextResponse = await axios.get(getApiUrl('/queue/next/1'));
    console.log('✅ Response:', nextResponse.data);
    console.log('📊 Count:', nextResponse.data.length);
    console.log('📋 Queue Numbers:', nextResponse.data.map(q => q.queueNumber));
    console.log('');
    
    // Test 4: Get waiting queues
    console.log('4️⃣ Testing /api/queue/waiting (PublicDisplay):');
    const waitingResponse = await axios.get(getApiUrl('/queue/waiting'));
    console.log('✅ Response:', waitingResponse.data);
    console.log('📊 Count:', waitingResponse.data.length);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testEndpoints();
