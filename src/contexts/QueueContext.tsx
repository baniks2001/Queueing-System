import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import io, { Socket } from 'socket.io-client';
import { getApiUrl, getSocketUrl } from '../config/api';

interface Queue {
  _id: string;
  queueNumber: string;
  personType: string;
  service: string;
  status: 'waiting' | 'serving' | 'completed' | 'missed';
  currentWindow: number | null;
  createdAt: string;
  updatedAt: string;
  // Transaction flow fields
  transactionName?: string;
  transactionPrefix?: string;
  currentStep?: number;
  totalSteps?: number;
  windowFlow?: Array<{ windowNumber: number; order: number }>;
}

interface QueueContextType {
  queues: Queue[];
  currentQueues: Queue[];
  waitingQueues: Queue[];
  socket: Socket | null;
  generateQueue: (transactionName: string, personType: string) => Promise<Queue>;
  callNext: (windowNumber: number) => Promise<Queue | null>;
  refreshQueues: () => Promise<void>;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

export const useQueue = () => {
  const context = useContext(QueueContext);
  if (context === undefined) {
    throw new Error('useQueue must be used within a QueueProvider');
  }
  return context;
};

interface QueueProviderProps {
  children: ReactNode;
}

export const QueueProvider: React.FC<QueueProviderProps> = ({ children }) => {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [currentQueues, setCurrentQueues] = useState<Queue[]>([]);
  const [waitingQueues, setWaitingQueues] = useState<Queue[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Sound functionality removed - announcements should only play in PublicDisplay
  // const playSound = (queueNumber: string, windowNumber: number) => {
  //   const utterance = new SpeechSynthesisUtterance(
  //     `Now serving number ${queueNumber} at window ${windowNumber}`
  //   );
  //   utterance.rate = 0.9;
  //   utterance.pitch = 1;
  //   utterance.volume = 1;
  //   speechSynthesis.speak(utterance);
  // };

  const refreshQueues = async () => {
    try {
      console.log('🔄 Refreshing queues...');
      
      const [currentResponse, waitingResponse] = await Promise.all([
        axios.get(getApiUrl('/api/queue/current')),
        axios.get(getApiUrl('/api/queue/waiting'))
      ]);

      console.log('✅ Current queues response:', currentResponse.data);
      console.log('✅ Waiting queues response:', waitingResponse.data);
      console.log('📊 Current queues length:', currentResponse.data.length);
      console.log('📊 Waiting queues length:', waitingResponse.data.length);

      setCurrentQueues(currentResponse.data);
      setWaitingQueues(waitingResponse.data);
      setQueues([...currentResponse.data, ...waitingResponse.data]);
      
      console.log('🔄 Queues refreshed successfully');
    } catch (error) {
      console.error('Error refreshing queues:', error);
      // Don't throw error to prevent app crashes
    }
  };

  useEffect(() => {
    const newSocket = io(getSocketUrl(), {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('🔌 Socket connected');
      refreshQueues();
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });

    newSocket.on('queueGenerated', (data) => {
      console.log('New queue generated:', data);
      refreshQueues();
    });

    newSocket.on('queueUpdated', (data) => {
      console.log('Queue updated:', data);
      refreshQueues();
    });

    // Sound notification listener removed - announcements should only play in PublicDisplay
    // newSocket.on('soundNotification', (data) => {
    //   console.log('Sound notification:', data);
    //   playSound(data.queueNumber, data.windowNumber);
    // });

    newSocket.on('repeat-announcement', (data) => {
      console.log('Repeat announcement triggered:', data);
      // Trigger repeat announcement in PublicDisplay
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Use setTimeout to avoid synchronous setState
    setTimeout(() => {
      setSocket(newSocket);
    }, 0);

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    // Initial load
    const timer = setTimeout(() => {
      refreshQueues();
    }, 0);
    
    // Set up periodic refresh with reasonable interval
    const interval = setInterval(() => {
      refreshQueues();
    }, 10000); // 10 seconds
    
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const generateQueue = async (transactionName: string, personType: string): Promise<Queue> => {
    try {
      const response = await axios.post(getApiUrl('/api/queue/generate'), {
        service: transactionName, // Backend still expects 'service' field for backward compatibility
        personType
      });
      
      await refreshQueues();
      return response.data.queue;
    } catch (error) {
      console.error('Error generating queue:', error);
      throw error;
    }
  };

  const callNext = async (windowNumber: number): Promise<Queue | null> => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        getApiUrl(`/api/queue/next/${windowNumber}`),
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      await refreshQueues();
      return response.data.queue;
    } catch (error) {
      console.error('Error calling next queue:', error);
      throw error;
    }
  };

  const value = {
    queues,
    currentQueues,
    waitingQueues,
    socket,
    generateQueue,
    callNext,
    refreshQueues
  };

  return (
    <QueueContext.Provider value={value}>
      {children}
    </QueueContext.Provider>
  );
};
