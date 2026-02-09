// Test frontend API calls
const getApiUrl = (path) => `http://localhost:5000/api${path}`;

async function testFrontendCalls() {
  console.log('🧪 Testing frontend API calls...\n');
  
  try {
    // Test the same calls WindowDashboard makes
    console.log('1️⃣ Testing WindowDashboard fetchCurrentQueue (Window 1):');
    const currentResponse = await fetch(getApiUrl('/queue/current/1'), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (currentResponse.ok) {
      const data = await currentResponse.json();
      console.log('✅ Response:', data);
      console.log('📋 Queue Number:', data?.queueNumber);
      console.log('🏢 Window:', data?.currentWindow);
    } else {
      console.error('❌ Failed:', currentResponse.status);
    }
    
    console.log('\n2️⃣ Testing WindowDashboard fetchNextQueues (Window 1):');
    const nextResponse = await fetch(getApiUrl('/queue/next/1'), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (nextResponse.ok) {
      const data = await nextResponse.json();
      console.log('✅ Response:', data);
      console.log('📊 Count:', data.length);
    } else {
      console.error('❌ Failed:', nextResponse.status);
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

testFrontendCalls();
