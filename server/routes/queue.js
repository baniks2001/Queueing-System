const express = require('express');
const jwt = require('jsonwebtoken');
const Queue = require('../models/Queue');
const Service = require('../models/Service');
const TransactionFlow = require('../models/TransactionFlow');
const PersonType = require('../models/PersonType');
const router = express.Router();

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

router.post('/generate', async (req, res) => {
  try {
    const { service: transactionName, personType } = req.body;

    // First try to find a transaction flow
    let transactionFlow = await TransactionFlow.findOne({ name: transactionName, isActive: true });
    
    // If no transaction flow found, try the old service system for backward compatibility
    let serviceDoc = null;
    if (!transactionFlow) {
      serviceDoc = await Service.findOne({ name: transactionName, isActive: true });
      if (!serviceDoc) {
        return res.status(400).json({ message: 'Transaction or Service not found' });
      }
    }

    // Determine the prefix and window flow
    let prefix, windowFlow, firstWindow;
    
    if (transactionFlow) {
      prefix = transactionFlow.prefix;
      // Find the first step with a window number > 0
      const firstStep = transactionFlow.steps.find(step => step.windowNumber > 0);
      firstWindow = firstStep ? firstStep.windowNumber : null;
      
      // Create window flow from transaction steps
      windowFlow = transactionFlow.steps
        .filter(step => step.windowNumber > 0)
        .map(step => ({
          windowNumber: step.windowNumber,
          order: step.stepNumber
        }));
    } else {
      // Fallback to old service system
      prefix = serviceDoc.prefix;
      windowFlow = serviceDoc.windowFlow;
      firstWindow = windowFlow.find(w => w.order === 1)?.windowNumber;
    }

    // Get the person type to determine priority
    const personTypeDoc = await PersonType.findOne({ name: personType, isActive: true });
    if (!personTypeDoc) {
      return res.status(400).json({ message: 'Person type not found' });
    }

    // Get all waiting queues for this service to determine fair positioning
    const waitingQueues = await Queue.find({ 
      service: transactionName, 
      status: 'waiting' 
    }).sort({ createdAt: 1 });

    // Calculate position based on fair pattern: Low, Low, High, Low, High, Low, High...
    let insertPosition = 0;
    const priority = personTypeDoc.priority;
    
    if (priority === 'High') {
      // For High priority: find the 3rd position, then every 2nd position after that
      // Pattern: Low, Low, High, Low, High, Low, High...
      // High positions: 2, 4, 6, 8... (0-indexed: 2, 3, 5, 7...)
      let highPositionCount = 0;
      for (let i = 0; i < waitingQueues.length; i++) {
        const queuePersonType = await PersonType.findOne({ name: waitingQueues[i].personType, isActive: true });
        if (queuePersonType && queuePersonType.priority === 'High') {
          highPositionCount++;
        }
      }
      
      // Calculate where this High priority should be placed
      if (highPositionCount === 0) {
        insertPosition = 2; // First High goes at position 2 (3rd position)
      } else {
        // Subsequent High priorities go at positions: 3, 5, 7, 9...
        insertPosition = 2 + highPositionCount;
      }
    } else {
      // For Low priority: fill in the gaps or append to end
      // Low positions: 0, 1, 4, 6, 8, 10... (every position that's not High)
      let lowPositionCount = 0;
      for (let i = 0; i < waitingQueues.length; i++) {
        const queuePersonType = await PersonType.findOne({ name: waitingQueues[i].personType, isActive: true });
        if (queuePersonType && queuePersonType.priority === 'Low') {
          lowPositionCount++;
        }
      }
      
      // Find the next available Low position
      let expectedLowPositions = [0, 1]; // First two positions are always Low
      let nextLowPos = 4; // Next Low positions start at 4, then 6, 8, 10...
      
      while (expectedLowPositions.length <= lowPositionCount) {
        expectedLowPositions.push(nextLowPos);
        nextLowPos += 2;
      }
      
      // Find the first available Low position
      for (const pos of expectedLowPositions) {
        if (pos >= waitingQueues.length) {
          insertPosition = pos;
          break;
        }
        
        // Check if this position is occupied by a Low priority
        const queueAtPos = waitingQueues[pos];
        if (queueAtPos) {
          const queuePersonType = await PersonType.findOne({ name: queueAtPos.personType, isActive: true });
          if (queuePersonType && queuePersonType.priority === 'Low') {
            continue; // This position is occupied by Low, look for next
          }
        }
        
        insertPosition = pos;
        break;
      }
      
      // If no specific position found, append to end
      if (insertPosition === 0 && waitingQueues.length > 0) {
        insertPosition = waitingQueues.length;
      }
    }

    // Get the queue number that should be assigned based on position
    let queueNumberToAssign;
    if (insertPosition >= waitingQueues.length) {
      // This queue goes at the end, get next number
      const lastQueue = await Queue.findOne({ service: transactionName })
        .sort({ createdAt: -1 });
      
      let nextNumber = 1;
      if (lastQueue) {
        const lastNumber = parseInt(lastQueue.queueNumber.replace(prefix, ''));
        nextNumber = lastNumber + 1;
      }
      queueNumberToAssign = `${prefix}${nextNumber.toString().padStart(3, '0')}`;
    } else {
      // This queue needs to be inserted, use a different approach
      // Instead of shifting existing queues, we'll assign a new number at the end
      // and insert the record in the database with the correct logical position
      
      // Get the highest queue number for this service
      const lastQueue = await Queue.findOne({ service: transactionName })
        .sort({ createdAt: -1 });
      
      let nextNumber = 1;
      if (lastQueue) {
        const lastNumber = parseInt(lastQueue.queueNumber.replace(prefix, ''));
        nextNumber = lastNumber + 1;
      }
      queueNumberToAssign = `${prefix}${nextNumber.toString().padStart(3, '0')}`;
      
      // Note: The fair positioning will be handled at the database query level
      // when fetching waiting queues, not by manipulating queue numbers
    }

    // Create the queue with transaction flow information
    const queue = new Queue({
      queueNumber: queueNumberToAssign,
      service: transactionName,
      personType,
      status: 'waiting',
      currentWindow: firstWindow,
      windowFlow: windowFlow,
      // Add transaction flow specific fields
      transactionName: transactionName,
      transactionPrefix: prefix,
      currentStep: firstWindow ? 1 : 0,
      totalSteps: transactionFlow ? transactionFlow.steps.length : (windowFlow?.length || 0)
    });

    await queue.save();

    // Emit socket event for real-time updates
    if (global.io) {
      global.io.emit('queueGenerated', queue);
    }

    res.status(201).json({ queue });
  } catch (error) {
    console.error('Error generating queue:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to get next window in flow
function getNextWindowInFlow(windowFlow, currentWindow) {
  if (!windowFlow || windowFlow.length === 0) return null;
  
  const currentFlowItem = windowFlow.find(w => w.windowNumber === currentWindow);
  if (!currentFlowItem) return null;
  
  const currentOrder = currentFlowItem.order;
  const nextOrder = currentOrder + 1;
  
  const nextFlowItem = windowFlow.find(w => w.order === nextOrder);
  return nextFlowItem ? nextFlowItem.windowNumber : null;
}

// Helper function to sort queues with fair positioning (Low, Low, High, Low, High, Low, High...)
async function sortQueuesWithFairPositioning(queues) {
  // Filter out queues that are assigned to specific windows (in transit)
  // Only include queues that are truly waiting for any window
  const availableQueues = queues.filter(queue => !queue.currentWindow);
  
  console.log(`🎯 Available queues for fair positioning (excluding assigned): ${availableQueues.length}`);
  console.log(`📋 Assigned queues (excluded): ${queues.length - availableQueues.length}`);
  
  // Separate queues by priority
  const lowPriorityQueues = [];
  const highPriorityQueues = [];
  
  for (const queue of availableQueues) {
    const personType = await PersonType.findOne({ name: queue.personType, isActive: true });
    if (personType && personType.priority === 'High') {
      highPriorityQueues.push(queue);
    } else {
      lowPriorityQueues.push(queue);
    }
  }
  
  // Sort each group by creation time
  lowPriorityQueues.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  highPriorityQueues.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  
  // Interleave according to fair pattern: Low, Low, High, Low, High, Low, High...
  const result = [];
  let lowIndex = 0;
  let highIndex = 0;
  
  // First two positions are always Low
  for (let i = 0; i < 2 && lowIndex < lowPriorityQueues.length; i++) {
    result.push(lowPriorityQueues[lowIndex++]);
  }
  
  // Then alternate: High, Low, High, Low...
  let isHighTurn = true;
  while (lowIndex < lowPriorityQueues.length || highIndex < highPriorityQueues.length) {
    if (isHighTurn && highIndex < highPriorityQueues.length) {
      result.push(highPriorityQueues[highIndex++]);
    } else if (!isHighTurn && lowIndex < lowPriorityQueues.length) {
      result.push(lowPriorityQueues[lowIndex++]);
    } else if (highIndex < highPriorityQueues.length) {
      // If no more Low, add remaining High
      result.push(highPriorityQueues[highIndex++]);
    } else if (lowIndex < lowPriorityQueues.length) {
      // If no more High, add remaining Low
      result.push(lowPriorityQueues[lowIndex++]);
    }
    isHighTurn = !isHighTurn;
  }
  
  return result;
}

router.get('/current', async (req, res) => {
  try {
    // First try to find proper serving queues
    let currentQueues = await Queue.find({ status: 'serving' })
      .sort({ createdAt: 1 });

    // If no serving queues found, check for queues assigned to windows but stuck in waiting status
    if (currentQueues.length === 0) {
      console.log('⚠️ No serving queues found, checking for stuck queues...');
      const stuckQueues = await Queue.find({ 
        status: 'waiting',
        currentWindow: { $exists: true, $ne: null }
      }).sort({ createdAt: 1 });
      
      if (stuckQueues.length > 0) {
        console.log(`🔧 Found ${stuckQueues.length} stuck queues, updating to serving status...`);
        
        // Update all stuck queues to serving status
        const updatePromises = stuckQueues.map(queue => 
          Queue.updateOne(
            { _id: queue._id },
            { status: 'serving', serviceStartTime: new Date() }
          )
        );
        
        await Promise.all(updatePromises);
        
        // Return the updated queues
        currentQueues = stuckQueues.map(queue => ({
          ...queue.toObject(),
          status: 'serving',
          serviceStartTime: new Date()
        }));
        
        console.log(`✅ Updated ${currentQueues.length} queues to serving status`);
      }
    }

    console.log(`📋 Total current queues: ${currentQueues.length}`);
    currentQueues.forEach(queue => {
      console.log(`🏢 Window ${queue.currentWindow}: ${queue.queueNumber}`);
    });

    res.json(currentQueues);
  } catch (error) {
    console.error('Get current queues error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/waiting', async (req, res) => {
  try {
    // Get ALL waiting queues, including those assigned to windows
    const waitingQueues = await Queue.find({ status: 'waiting' })
      .sort({ createdAt: 1 });

    console.log(`📋 Total waiting queues found: ${waitingQueues.length}`);
    
    // Log details of waiting queues
    waitingQueues.forEach((queue, index) => {
      console.log(`   ${index + 1}. ${queue.queueNumber} - Window: ${queue.currentWindow || 'None'} - Status: ${queue.status}`);
    });

    res.json(waitingQueues);
  } catch (error) {
    console.error('Get waiting queues error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/next/:windowNumber', authMiddleware, async (req, res) => {
  try {
    const { windowNumber } = req.params;

    const currentServing = await Queue.findOne({ 
      status: 'serving', 
      currentWindow: parseInt(windowNumber) 
    });

    if (currentServing) {
      currentServing.status = 'completed';
      currentServing.serviceEndTime = new Date();
      await currentServing.save();
    }

    // Get waiting queues and apply fair positioning
    const waitingQueues = await Queue.find({ status: 'waiting' })
      .sort({ createdAt: 1 });
    
    const sortedQueues = await sortQueuesWithFairPositioning(waitingQueues);
    const nextQueue = sortedQueues[0] || null;

    if (nextQueue) {
      nextQueue.status = 'serving';
      nextQueue.currentWindow = parseInt(windowNumber);
      nextQueue.serviceStartTime = new Date();
      nextQueue.previousWindows.push({
        windowNumber: parseInt(windowNumber),
        timestamp: new Date()
      });
      await nextQueue.save();

      if (global.io) {
        global.io.emit('queueUpdated', {
          action: 'next',
          queueNumber: nextQueue.queueNumber,
          windowNumber: parseInt(windowNumber),
          service: nextQueue.service
        });

        global.io.emit('soundNotification', {
          queueNumber: nextQueue.queueNumber,
          windowNumber: parseInt(windowNumber)
        });
      }

      res.json({
        message: 'Next queue called successfully',
        queue: nextQueue
      });
    } else {
      res.json({
        message: 'No queues waiting',
        queue: null
      });
    }
  } catch (error) {
    console.error('Next queue error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/current/:windowNumber', async (req, res) => {
  try {
    const { windowNumber } = req.params;
    const windowNum = parseInt(windowNumber);
    
    if (isNaN(windowNum) || windowNum <= 0) {
      return res.status(400).json({ message: 'Invalid window number' });
    }
    
    // First try to find queues with proper serving status
    let currentQueue = await Queue.findOne({ 
      currentWindow: windowNum,
      status: 'serving' 
    });
    
    // If no serving queues found, check for queues assigned to this window but stuck in waiting status
    if (!currentQueue) {
      console.log(`⚠️ No serving queue found for Window ${windowNum}, checking for stuck queues...`);
      currentQueue = await Queue.findOne({ 
        currentWindow: windowNum,
        status: 'waiting'
      });
      
      // If found a stuck queue, update it to serving status
      if (currentQueue) {
        console.log(`🔧 Found stuck queue ${currentQueue.queueNumber} at Window ${windowNum}, updating to serving status`);
        await Queue.updateOne(
          { _id: currentQueue._id },
          { status: 'serving', serviceStartTime: new Date() }
        );
        currentQueue.status = 'serving';
        currentQueue.serviceStartTime = new Date();
      }
    }
    
    console.log(`📋 Current queue for Window ${windowNum}:`, currentQueue?.queueNumber || 'None');
    res.json(currentQueue);
  } catch (error) {
    console.error('Get current queue error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/next/:windowNumber', async (req, res) => {
  try {
    const { windowNumber } = req.params;
    const windowNum = parseInt(windowNumber);
    
    if (isNaN(windowNum) || windowNum <= 0) {
      return res.status(400).json({ message: 'Invalid window number' });
    }
    
    // Find queues that should come to this window (either nextWindow or currentWindow)
    const nextQueues = await Queue.find({ 
      $or: [
        { nextWindow: windowNum, status: 'waiting' },
        { currentWindow: windowNum, status: 'waiting' }
      ]
    })
    .sort({ createdAt: 1 })
    .limit(10);
    res.json(nextQueues);
  } catch (error) {
    console.error('Get next queues error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/next-queue/:windowNumber', async (req, res) => {
  try {
    const { windowNumber } = req.params;
    const windowNum = parseInt(windowNumber);
    
    if (isNaN(windowNum) || windowNum <= 0) {
      return res.status(400).json({ message: 'Invalid window number' });
    }
    
    // Complete current serving queue at this window
    const currentQueue = await Queue.findOne({ 
      currentWindow: windowNum,
      status: 'serving' 
    });

    console.log(`🔍 Current queue found for window ${windowNum}:`, currentQueue?.queueNumber);

    let completedQueue = null;
    
    if (currentQueue) {
      console.log(`🔄 Processing current queue: ${currentQueue.queueNumber}, transaction flow:`, currentQueue.windowFlow);
      
      // Handle transaction flow progression ONLY if there are multiple steps
      if (currentQueue.windowFlow && currentQueue.windowFlow.length > 1) {
        // Find current step in the flow
        const currentStep = currentQueue.windowFlow.find(step => step.windowNumber === windowNum);
        
        console.log(`📍 Current step in flow:`, currentStep);
        
        if (currentStep) {
          // Find next step in the flow
          const nextStep = currentQueue.windowFlow.find(step => step.order === currentStep.order + 1);
          
          console.log(`➡️ Next step in flow:`, nextStep);
          
          if (nextStep) {
            // Move to next window in transaction flow
            await Queue.updateOne(
              { _id: currentQueue._id },
              { 
                status: 'waiting',
                currentWindow: nextStep.windowNumber,
                nextWindow: nextStep.windowNumber,
                currentStep: currentStep.order + 1,
                serviceEndTime: new Date(),
                $push: { previousWindows: { windowNumber: windowNum, timestamp: new Date() } }
              }
            );
            
            completedQueue = { 
              ...currentQueue.toObject(), 
              status: 'waiting',
              currentWindow: nextStep.windowNumber,
              nextWindow: nextStep.windowNumber,
              currentStep: currentStep.order + 1
            };
            
            console.log(`🔄 Queue moved to next step: window ${nextStep.windowNumber}`);
          } else {
            // Transaction flow completed
            await Queue.updateOne(
              { _id: currentQueue._id },
              { 
                status: 'completed',
                serviceEndTime: new Date(),
                $push: { previousWindows: { windowNumber: windowNum, timestamp: new Date() } }
              }
            );
            
            completedQueue = { 
              ...currentQueue.toObject(), 
              status: 'completed',
              currentWindow: null,
              nextWindow: null
            };
            
            console.log(`✅ Queue completed: ${currentQueue.queueNumber}`);
          }
        } else {
          // Current window not in flow, just complete
          await Queue.updateOne(
            { _id: currentQueue._id },
            { 
              status: 'completed',
              serviceEndTime: new Date(),
              $push: { previousWindows: { windowNumber: windowNum, timestamp: new Date() } }
            }
          );
          
          completedQueue = { 
            ...currentQueue.toObject(), 
            status: 'completed' 
          };
          
          console.log(`✅ Queue completed (window not in flow): ${currentQueue.queueNumber}`);
        }
      } else {
        // No transaction flow or single-step flow, just complete the queue
        await Queue.updateOne(
          { _id: currentQueue._id },
          { 
            status: 'completed',
            serviceEndTime: new Date(),
            $push: { previousWindows: { windowNumber: windowNum, timestamp: new Date() } }
          }
        );
        
        completedQueue = { 
          ...currentQueue.toObject(), 
          status: 'completed' 
        };
        
        console.log(`✅ Queue completed (no multi-step flow): ${currentQueue.queueNumber}`);
      }
    } else {
      console.log(`⚠️ No current queue found for window ${windowNum}`);
    }
    
    // Find next queue using fair positioning on ALL waiting queues
    const allWaitingQueues = await Queue.find({ status: 'waiting' })
      .sort({ createdAt: 1 });
    
    console.log(`📋 All waiting queues count: ${allWaitingQueues.length}`);
    
    const sortedQueues = await sortQueuesWithFairPositioning(allWaitingQueues);
    const nextQueue = sortedQueues[0] || null;
    
    console.log(`🎯 Next queue selected: ${nextQueue?.queueNumber || 'None'}`);
    console.log(`📊 Fair positioning result (first 5):`, sortedQueues.slice(0, 5).map(q => ({ number: q.queueNumber, type: q.personType })));
    
    let updatedQueue = null;
    let nextQueues = [];
    
    if (nextQueue) {
      // Update next queue to serving at this window
      await Queue.updateOne(
        { _id: nextQueue._id },
        { 
          status: 'serving',
          currentWindow: windowNum,
          serviceStartTime: new Date()
        }
      );
      
      updatedQueue = { ...nextQueue.toObject(), status: 'serving', currentWindow: windowNum };
      
      // Get remaining queues using fair positioning on ALL waiting queues
      const allRemainingQueues = await Queue.find({ status: 'waiting' })
        .sort({ createdAt: 1 });
      
      nextQueues = await sortQueuesWithFairPositioning(allRemainingQueues);
    }
    
    // Emit real-time updates
    if (global.io) {
      global.io.emit('queueUpdate', {
        updatedQueue,
        nextQueues,
        windowNumber: windowNum,
        completedQueue
      });
      
      // Emit sound notification for new queue
      if (updatedQueue) {
        global.io.emit('soundNotification', {
          queueNumber: updatedQueue.queueNumber,
          windowNumber: windowNum
        });
      }
    }
    
    res.json({
      currentQueue: updatedQueue,
      nextQueues,
      completedQueue
    });
  } catch (error) {
    console.error('Next queue error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all waiting queues for a specific window
router.get('/waiting/:windowNumber', authMiddleware, async (req, res) => {
  try {
    const { windowNumber } = req.params;
    const windowNum = parseInt(windowNumber);
    
    if (isNaN(windowNum) || windowNum <= 0) {
      return res.status(400).json({ message: 'Invalid window number' });
    }
    
    // Find queues that should come to this window (either nextWindow or currentWindow)
    const nextQueues = await Queue.find({ 
      $or: [
        { nextWindow: windowNum, status: 'waiting' },
        { currentWindow: windowNum, status: 'waiting' }
      ]
    })
    .sort({ createdAt: 1 })
    .limit(10);
    res.json(nextQueues);
  } catch (error) {
    console.error('Get next queues error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const stats = await Queue.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const serviceStats = await Queue.aggregate([
      {
        $group: {
          _id: '$service',
          count: { $sum: 1 },
          avgWaitTime: { $avg: '$waitingTime' }
        }
      }
    ]);

    res.json({
      statusStats: stats,
      serviceStats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Repeat announcement endpoint
router.post('/repeat-announcement/:windowNumber', authMiddleware, async (req, res) => {
  try {
    const { windowNumber } = req.params;
    const windowNum = parseInt(windowNumber);
    
    if (isNaN(windowNum) || windowNum <= 0) {
      return res.status(400).json({ message: 'Invalid window number' });
    }
    
    // Get currently serving queue for this specific window
    const currentQueue = await Queue.findOne({ 
      status: 'serving',
      currentWindow: windowNum 
    });
    
    if (!currentQueue) {
      return res.status(404).json({ message: 'No queue currently being served at this window' });
    }
    
    // Emit socket event to trigger repeat announcement in PublicDisplay
    if (global.io) {
      global.io.emit('repeat-announcement', {
        queues: [currentQueue], // Send only the queue for this window
        timestamp: new Date(),
        triggeredBy: windowNum
      });
      
      console.log(`🔄 Repeat announcement triggered by window ${windowNum} for queue ${currentQueue.queueNumber}`);
    }
    
    res.json({ 
      message: 'Repeat announcement triggered successfully',
      queueNumber: currentQueue.queueNumber,
      triggeredBy: windowNum
    });
  } catch (error) {
    console.error('Repeat announcement error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
