const express = require('express');
const jwt = require('jsonwebtoken');
const Queue = require('../models/Queue');
const OnHoldQueue = require('../models/OnHoldQueue');
const Service = require('../models/Service');
const TransactionFlow = require('../models/TransactionFlow');
const PersonType = require('../models/PersonType');
const { authMiddleware, requireWindow } = require('../middleware/auth');
const router = express.Router();

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

    // Get the next global queue number (001-999 sequence shared across all services)
    let nextNumber = 1;
    
    // Find the last queue across ALL services to get the global sequence
    const lastGlobalQueue = await Queue.findOne({})
      .sort({ createdAt: -1 });
    
    if (lastGlobalQueue) {
      // Extract the numeric part from the last queue number (remove prefix)
      const lastNumberMatch = lastGlobalQueue.queueNumber.match(/\d+/);
      if (lastNumberMatch) {
        let lastNumber = parseInt(lastNumberMatch[0]);
        // Reset to 001 if we reach 999
        nextNumber = lastNumber >= 999 ? 1 : lastNumber + 1;
      }
    }
    
    queueNumberToAssign = `${prefix}${nextNumber.toString().padStart(3, '0')}`;

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

// Helper function to filter queues eligible for a specific window based on transaction flow
function filterEligibleQueuesForWindow(queues, windowNum) {
  return queues.filter(queue => {
    // If queue has no window flow, it can come to any window
    if (!queue.windowFlow || queue.windowFlow.length === 0) {
      return true;
    }
    
    // Check if this window is in the queue's transaction flow
    const windowInFlow = queue.windowFlow.find(step => step.windowNumber === windowNum);
    if (!windowInFlow) {
      return false; // This window is not in the queue's transaction flow
    }
    
    // For multi-step transactions, check if the queue is at the correct step
    if (queue.windowFlow.length > 1) {
      // If currentStep is 0, queue should go to first step
      if (queue.currentStep === 0) {
        const firstStep = queue.windowFlow.find(step => step.order === 1);
        return firstStep && firstStep.windowNumber === windowNum;
      }
      
      // Check if this window is the next step in the flow
      const nextStep = queue.windowFlow.find(step => step.order === queue.currentStep);
      return nextStep && nextStep.windowNumber === windowNum;
    }
    
    // Single step transaction - this window is in flow, so it's eligible
    return true;
  });
}

// Helper function to sort queues with fair positioning (Low, Low, High, Low, High, Low, High...)
async function sortQueuesWithFairPositioning(queues) {
  // Include all waiting queues, regardless of currentWindow assignment
  // Queues with currentWindow but status 'waiting' are available for serving
  const availableQueues = queues.filter(queue => queue.status === 'waiting');
  
  console.log(`🎯 Available queues for fair positioning: ${availableQueues.length}`);
  console.log(`📋 Total queues processed: ${queues.length}`);
  
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
    // Only return queues with proper serving status - no auto-assignment
    // This allows manual control via Next Queue and Hold Queue buttons
    let currentQueues = await Queue.find({ status: 'serving' })
      .sort({ createdAt: 1 });

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
        global.io.emit('queueUpdate', {
          action: 'next',
          queueNumber: nextQueue.queueNumber,
          windowNumber: parseInt(windowNumber),
          service: nextQueue.service
        });

        // Emit queueServed event for PublicDisplay announcements
        global.io.emit('queueServed', {
          queueNumber: nextQueue.queueNumber,
          windowNumber: parseInt(windowNumber)
        });

        // Sound notification removed - announcements now handled by queueServed event
        // global.io.emit('soundNotification', {
        //   queueNumber: nextQueue.queueNumber,
        //   windowNumber: parseInt(windowNumber)
        // });
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
    
    // Only return queues with proper serving status - no auto-assignment
    // This allows manual control via Next Queue and Hold Queue buttons
    const currentQueue = await Queue.findOne({ 
      currentWindow: windowNum,
      status: 'serving' 
    });
    
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
    
    // Get all waiting queues
    const allWaitingQueues = await Queue.find({ status: 'waiting' })
      .sort({ createdAt: 1 });
    
    console.log(`📋 All waiting queues for Window ${windowNum}: ${allWaitingQueues.length}`);
    
    // Filter queues that should come to this window based on transaction flow
    const eligibleQueues = filterEligibleQueuesForWindow(allWaitingQueues, windowNum);
    
    console.log(`🎯 Eligible queues for Window ${windowNum}: ${eligibleQueues.length}`);
    
    // Apply fair positioning only on eligible queues
    const sortedQueues = await sortQueuesWithFairPositioning(eligibleQueues);
    
    console.log(`🎯 Sorted queues for Window ${windowNum} (first 5):`, sortedQueues.slice(0, 5).map(q => ({ number: q.queueNumber, type: q.personType, service: q.service })));
    
    res.json(sortedQueues);
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

    console.log(`🔍 Current queue found for window ${windowNum}:`, currentQueue?.queueNumber || 'None');

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
    
    // Find next queue using fair positioning on ELIGIBLE waiting queues only
    const allWaitingQueues = await Queue.find({ status: 'waiting' })
      .sort({ createdAt: 1 });
    
    // Filter queues that should come to this window based on transaction flow
    const eligibleQueues = filterEligibleQueuesForWindow(allWaitingQueues, windowNum);
    
    console.log(`🎯 Eligible queues for Window ${windowNum}: ${eligibleQueues.length}`);
    
    const sortedQueues = await sortQueuesWithFairPositioning(eligibleQueues);
    const nextQueue = sortedQueues[0] || null;
    
    console.log(`🎯 Next queue selected: ${nextQueue?.queueNumber || 'None'}`);
    console.log(`📊 Fair positioning result (first 5):`, sortedQueues.slice(0, 5).map(q => ({ number: q.queueNumber, type: q.personType })));
    
    let updatedQueue = null;
    let nextQueues = [];
    
    // Only assign new queue if current queue was completed (not moved to next window)
    // OR if current queue was moved to next window (we need a new queue for current window)
    if (nextQueue && (!completedQueue || completedQueue.status === 'completed' || completedQueue.status === 'waiting')) {
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
      
      if (completedQueue && completedQueue.status === 'waiting') {
        console.log(`📋 New queue assigned to Window ${windowNum} (previous queue moved to Window ${completedQueue.currentWindow}): ${updatedQueue.queueNumber}`);
      } else {
        console.log(`📋 New queue assigned to Window ${windowNum}: ${updatedQueue.queueNumber}`);
      }
    } else {
      updatedQueue = null;
      console.log(`📝 No more queues available for Window ${windowNum}`);
    }
    
    // Get remaining queues using fair positioning on ELIGIBLE waiting queues only
    const allRemainingQueues = await Queue.find({ status: 'waiting' })
      .sort({ createdAt: 1 });
    
    // Filter queues that should come to this window based on transaction flow
    const eligibleRemainingQueues = filterEligibleQueuesForWindow(allRemainingQueues, windowNum);
    
    nextQueues = await sortQueuesWithFairPositioning(eligibleRemainingQueues);
    
    // IMPORTANT: Get the ACTUAL current queue for this window after all updates
    // Add a small delay to ensure all database updates are committed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const actualCurrentQueue = await Queue.findOne({ 
      currentWindow: windowNum,
      status: 'serving' 
    });
    
    console.log(`🔍 Final check - Actual current queue for Window ${windowNum}:`, actualCurrentQueue?.queueNumber || 'None');
    
    // Use the actual current queue in response
    updatedQueue = actualCurrentQueue;
    
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
        // Emit queueServed event for PublicDisplay announcements
        global.io.emit('queueServed', {
          queueNumber: updatedQueue.queueNumber,
          windowNumber: windowNum
        });

        // Sound notification removed - announcements now handled by queueServed event
        // global.io.emit('soundNotification', {
        //   queueNumber: updatedQueue.queueNumber,
        //   windowNumber: windowNum
        // });
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

// Get all on-hold queues for public display
router.get('/on-hold/all', async (req, res) => {
  try {
    // Get all on-hold queues
    const onHoldQueues = await OnHoldQueue.find({})
      .sort({ holdStartTime: 1 }) // Oldest first
      .limit(20);
    
    res.json(onHoldQueues);
  } catch (error) {
    console.error('Get all on-hold queues error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get on-hold queues for a specific window
router.get('/on-hold/:windowNumber', async (req, res) => {
  try {
    const { windowNumber } = req.params;
    
    // Get on-hold queues for this window
    const onHoldQueues = await OnHoldQueue.find({ currentWindow: parseInt(windowNumber) })
      .sort({ holdStartTime: 1 }) // Oldest first
      .limit(10);
    
    res.json(onHoldQueues);
  } catch (error) {
    console.error('Get on-hold queues error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Put queue on hold
router.put('/hold/:queueId', authMiddleware, async (req, res) => {
  try {
    const { queueId } = req.params;
    const { holdReason } = req.body;
    
    // Find the queue
    const queue = await Queue.findById(queueId);
    if (!queue) {
      return res.status(404).json({ message: 'Queue not found' });
    }
    
    // Create on-hold record
    const onHoldQueue = new OnHoldQueue({
      originalQueueId: queue._id,
      queueNumber: queue.queueNumber,
      personType: queue.personType,
      service: queue.service,
      transactionName: queue.transactionName,
      transactionPrefix: queue.transactionPrefix,
      currentStep: queue.currentStep,
      totalSteps: queue.totalSteps,
      windowFlow: queue.windowFlow,
      holdStartTime: new Date(),
      holdReason: holdReason || 'Manual hold by operator',
      currentWindow: queue.currentWindow,
      waitingTime: queue.waitingTime,
      serviceStartTime: queue.serviceStartTime,
      serviceEndTime: queue.serviceEndTime
    });
    
    await onHoldQueue.save();
    
    // Update original queue status
    queue.status = 'on-hold';
    await queue.save();
    
    res.json({ message: 'Queue put on hold successfully', onHoldQueue });
  } catch (error) {
    console.error('Hold queue error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Serve on-hold queue
router.post('/serve-on-hold/:queueId', authMiddleware, async (req, res) => {
  try {
    const { queueId } = req.params;
    const { windowNumber } = req.body;
    
    console.log(`🎯 Serve on-hold request: queueId=${queueId}, windowNumber=${windowNumber}`);
    
    if (!windowNumber) {
      console.log('❌ Window number missing in request body');
      return res.status(400).json({ message: 'Window number is required' });
    }
    
    // Find on-hold queue
    const onHoldQueue = await OnHoldQueue.findById(queueId);
    if (!onHoldQueue) {
      console.log(`❌ On-hold queue not found: ${queueId}`);
      return res.status(404).json({ message: 'On-hold queue not found' });
    }
    
    // Find original queue
    const originalQueue = await Queue.findById(onHoldQueue.originalQueueId);
    if (!originalQueue) {
      console.log(`❌ Original queue not found: ${onHoldQueue.originalQueueId}`);
      return res.status(404).json({ message: 'Original queue not found' });
    }
    
    console.log(`📋 Found original queue: ${originalQueue.queueNumber}, positioning as 2nd in waiting list`);
    
    // Position served queue as 2nd in waiting list
    // Get all waiting queues and count current serving queues
    const allWaitingQueues = await Queue.find({ status: 'waiting' })
      .sort({ createdAt: 1 });
    
    const currentServingQueues = await Queue.find({ status: 'serving' });
    const positionOffset = currentServingQueues.length; // Position after current serving queues
    
    console.log(`📊 Current serving queues: ${currentServingQueues.length}`);
    console.log(`📊 Current waiting queues: ${allWaitingQueues.length}`);
    console.log(`🎯 Positioning on-hold queue at position ${positionOffset + 2}`);
    
    // Update original queue to WAITING status with proper positioning
    // PRESERVE the original window assignment - don't clear it!
    originalQueue.status = 'waiting';
    // Keep the original currentWindow - don't set to null!
    originalQueue.updatedAt = new Date();
    
    // Position as 2nd by updating createdAt to be after 1 queue
    if (allWaitingQueues.length >= 1) {
      // Get 1st queue's createdAt and add 1 second to be after it
      const firstQueueCreatedAt = new Date(allWaitingQueues[0].createdAt);
      originalQueue.createdAt = new Date(firstQueueCreatedAt.getTime() + 1000); // Add 1 second to be 2nd
      console.log(`🔄 Updated createdAt to position queue as 2nd: ${originalQueue.createdAt}`);
    } else {
      // No waiting queues, position at beginning
      originalQueue.createdAt = new Date();
      console.log(`🔄 Updated createdAt to position queue at beginning: ${originalQueue.createdAt}`);
    }
    
    await originalQueue.save();
    
    // Delete on-hold record
    await OnHoldQueue.findByIdAndDelete(queueId);
    
    // Get updated queues
    const [currentQueues, nextQueues, onHoldQueues] = await Promise.all([
      Queue.find({ status: 'serving' }),
      Queue.find({ status: 'waiting' }).sort({ createdAt: 1 }).limit(5),
      OnHoldQueue.find({ currentWindow: parseInt(windowNumber) }).sort({ holdStartTime: 1 }).limit(5)
    ]);
    
    console.log(`✅ Successfully served on-hold queue ${originalQueue.queueNumber} at Window ${windowNumber}`);
    
    res.json({ 
      message: 'On-hold queue served successfully',
      currentQueue: originalQueue,
      nextQueues,
      onHoldQueues
    });
  } catch (error) {
    console.error('Serve on-hold queue error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete on-hold queue
router.delete('/delete-on-hold/:queueId', authMiddleware, async (req, res) => {
  try {
    const { queueId } = req.params;
    
    console.log(`🗑️ Delete on-hold request: queueId=${queueId}`);
    
    // Find on-hold queue
    const onHoldQueue = await OnHoldQueue.findById(queueId);
    if (!onHoldQueue) {
      console.log(`❌ On-hold queue not found: ${queueId}`);
      return res.status(404).json({ message: 'On-hold queue not found' });
    }
    
    // Find original queue
    const originalQueue = await Queue.findById(onHoldQueue.originalQueueId);
    if (originalQueue) {
      // Delete the original queue as well
      await Queue.findByIdAndDelete(onHoldQueue.originalQueueId);
      console.log(`🗑️ Deleted original queue: ${originalQueue.queueNumber}`);
    }
    
    // Delete on-hold record
    await OnHoldQueue.findByIdAndDelete(queueId);
    console.log(`🗑️ Deleted on-hold record: ${onHoldQueue.queueNumber}`);
    
    console.log(`✅ Successfully deleted on-hold queue ${onHoldQueue.queueNumber}`);
    
    res.json({ 
      message: 'On-hold queue deleted successfully',
      deletedQueue: onHoldQueue.queueNumber
    });
  } catch (error) {
    console.error('Delete on-hold queue error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset all on-hold queues
router.post('/reset-on-hold', async (req, res) => {
  try {
    console.log('🔄 Resetting all on-hold queues...');
    
    // Delete all on-hold records
    const deletedCount = await OnHoldQueue.deleteMany({});
    
    // Find all queues that have on-hold status and reset them to waiting
    const resetCount = await Queue.updateMany(
      { status: 'on-hold' },
      { 
        status: 'waiting',
        currentWindow: null,
        updatedAt: new Date()
      }
    );
    
    console.log(`✅ Reset ${deletedCount.deletedCount} on-hold records`);
    console.log(`✅ Reset ${resetCount.modifiedCount} queues from on-hold to waiting`);
    
    // Get updated queue counts
    const [currentQueues, waitingQueues, onHoldQueues] = await Promise.all([
      Queue.find({ status: 'serving' }),
      Queue.find({ status: 'waiting' }).sort({ createdAt: 1 }),
      OnHoldQueue.find({}).sort({ holdStartTime: 1 })
    ]);
    
    res.json({ 
      message: 'On-hold queues reset successfully',
      deletedOnHoldRecords: deletedCount.deletedCount,
      resetQueues: resetCount.modifiedCount,
      currentQueues,
      waitingQueues,
      onHoldQueues
    });
  } catch (error) {
    console.error('Reset on-hold queues error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
