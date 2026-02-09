const mongoose = require('mongoose');
const Queue = require('./models/Queue');

mongoose.connect('mongodb+srv://servandoytio:qDn2Se8cKbWaPCeN@merncluster.2veth.mongodb.net/queueing-system?appName=mernCluster')
.then(async () => {
  console.log('🔧 Connected to MongoDB');
  
  // Check all queues and their status
  const allQueues = await Queue.find({});
  console.log(`📊 Total queues in database: ${allQueues.length}`);
  
  allQueues.forEach(queue => {
    console.log(`📋 Queue ${queue.queueNumber}: status=${queue.status}, currentWindow=${queue.currentWindow}, service=${queue.service}`);
  });
  
  // Check serving queues
  const servingQueues = await Queue.find({ status: 'serving' });
  console.log(`🎯 Serving queues: ${servingQueues.length}`);
  
  servingQueues.forEach(queue => {
    console.log(`🏢 Window ${queue.currentWindow} is serving: ${queue.queueNumber}`);
  });
  
  // Check waiting queues
  const waitingQueues = await Queue.find({ status: 'waiting' });
  console.log(`⏳ Waiting queues: ${waitingQueues.length}`);
  
  waitingQueues.forEach(queue => {
    console.log(`⏳ Waiting: ${queue.queueNumber}, currentWindow=${queue.currentWindow}`);
  });
  
  process.exit(0);
}).catch(console.error);
