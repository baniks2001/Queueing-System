const mongoose = require('mongoose');
const Queue = require('./models/Queue');

mongoose.connect('mongodb+srv://servandoytio:qDn2Se8cKbWaPCeN@merncluster.2veth.mongodb.net/queueing-system?appName=mernCluster')
.then(async () => {
  console.log('🔧 Connected to MongoDB');
  
  // Find all queues with currentWindow assigned but not serving
  const stuckQueues = await Queue.find({
    currentWindow: { $exists: true, $ne: null },
    status: { $ne: 'serving' }
  });
  
  console.log('🔍 Found stuck queues:', stuckQueues.length);
  
  if (stuckQueues.length > 0) {
    console.log('🧹 Clearing stuck queues...');
    await Queue.updateMany(
      { _id: { $in: stuckQueues.map(q => q._id) } },
      { 
        $unset: { currentWindow: 1, nextWindow: 1 },
        status: 'waiting'
      }
    );
    console.log('✅ Cleared', stuckQueues.length, 'stuck queues');
  }
  
  process.exit(0);
}).catch(console.error);
