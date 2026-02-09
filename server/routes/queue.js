const express = require('express');
const jwt = require('jsonwebtoken');
const Queue = require('../models/Queue');
const Service = require('../models/Service');
const TransactionFlow = require('../models/TransactionFlow');
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

    // Get the last queue number for this transaction/service
    const lastQueue = await Queue.findOne({ service: transactionName })
      .sort({ createdAt: -1 });

    let nextNumber = 1;
    if (lastQueue) {
      const lastNumber = parseInt(lastQueue.queueNumber.replace(prefix, ''));
      nextNumber = lastNumber + 1;
    }

    const queueNumber = `${prefix}${nextNumber.toString().padStart(3, '0')}`;

    // Create the queue with transaction flow information
    const queue = new Queue({
      queueNumber,
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

router.get('/current', async (req, res) => {
  try {
    const currentQueues = await Queue.find({ status: 'serving' })
      .sort({ createdAt: 1 });

    res.json(currentQueues);
  } catch (error) {
    console.error('Get current queues error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/waiting', async (req, res) => {
  try {
    const waitingQueues = await Queue.find({ status: 'waiting' })
      .sort({ createdAt: 1 });

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

    const nextQueue = await Queue.findOne({ status: 'waiting' })
      .sort({ createdAt: 1 });

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

router.get('/current/:windowNumber', authMiddleware, async (req, res) => {
  try {
    const { windowNumber } = req.params;
    const windowNum = parseInt(windowNumber);
    
    if (isNaN(windowNum) || windowNum <= 0) {
      return res.status(400).json({ message: 'Invalid window number' });
    }
    
    const currentQueue = await Queue.findOne({ 
      currentWindow: windowNum,
      status: 'serving' 
    });
    res.json(currentQueue);
  } catch (error) {
    console.error('Get current queue error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/next/:windowNumber', authMiddleware, async (req, res) => {
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

router.post('/next-queue/:windowNumber', authMiddleware, async (req, res) => {
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

    let completedQueue = null;
    
    if (currentQueue) {
      // Handle transaction flow progression
      if (currentQueue.windowFlow && currentQueue.windowFlow.length > 0) {
        // Find current step in the flow
        const currentStep = currentQueue.windowFlow.find(step => step.windowNumber === windowNum);
        
        if (currentStep) {
          // Find next step in the flow
          const nextStep = currentQueue.windowFlow.find(step => step.order === currentStep.order + 1);
          
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
        }
      } else {
        // No transaction flow, just complete
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
      }
    }
    
    // Find next queue that should come to this window
    const nextQueue = await Queue.findOne({ 
      currentWindow: windowNum,
      status: 'waiting' 
    })
    .sort({ createdAt: 1 });
    
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
      
      // Get remaining queues for this window
      nextQueues = await Queue.find({ 
        currentWindow: windowNum,
        status: 'waiting' 
      })
      .sort({ createdAt: 1 })
      .limit(10);
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
    
    const waitingQueues = await Queue.find({ 
      currentWindow: windowNum,
      status: 'waiting' 
    })
    .sort({ createdAt: 1 })
    .limit(10);
    res.json(waitingQueues);
  } catch (error) {
    console.error('Get waiting queues error:', error);
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
