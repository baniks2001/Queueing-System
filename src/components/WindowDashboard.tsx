import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../config/api';
import {
  ArrowRightOnRectangleIcon,
  PlayIcon,
  UserGroupIcon,
  SpeakerWaveIcon
} from '@heroicons/react/24/outline';

// Cross-browser compatibility utilities
const getBrowserInfo = () => {
  const userAgent = navigator.userAgent;
  const isSmartTV = /SmartTV|WebOS|Tizen|Android.*TV/i.test(userAgent);
  const isStockBrowser = /StockBrowser|NativeBrowser|TVBrowser/i.test(userAgent);
  const isChrome = /Chrome/.test(userAgent);
  const isFirefox = /Firefox/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
  
  return {
    userAgent,
    isSmartTV,
    isStockBrowser,
    isChrome,
    isFirefox,
    isSafari,
    supportsNotifications: 'Notification' in window,
    supportsVibration: 'vibrate' in navigator,
    supportsLocalStorage: 'localStorage' in window,
    supportsSessionStorage: 'sessionStorage' in window
  };
};

// Cross-browser fetch with timeout and retry
const safeFetch = async (url: string, options: RequestInit = {}, retries: number = 3) => {
  const browserInfo = getBrowserInfo();
  
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), browserInfo.isSmartTV ? 10000 : 5000);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': browserInfo.userAgent,
          ...options.headers
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      console.warn(`Fetch attempt ${i + 1} failed:`, error);
      if (i === retries - 1) {
        throw error;
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  
  throw new Error('All fetch attempts failed');
};

// Cross-browser navigation
const safeNavigate = (navigate: any, path: string) => {
  try {
    navigate(path);
  } catch (error) {
    console.warn('Navigation error:', error);
    // Fallback for smart TVs
    window.location.href = path;
  }
};

interface Queue {
  _id: string;
  queueNumber: string;
  personType: string;
  service: string;
  status: 'waiting' | 'serving' | 'completed' | 'missed';
  currentWindow: number | null;
  createdAt: string;
  updatedAt: string;
}

export default function WindowDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentQueue, setCurrentQueue] = useState<Queue | null>(null);
  const [nextQueues, setNextQueues] = useState<Queue[]>([]);
  const [isCalling, setIsCalling] = useState(false);

  useEffect(() => {
    console.log('Window Dashboard - User object:', user);
    console.log('Window Dashboard - User windowNumber:', user?.windowNumber);
    
    // Only fetch queues if user is available and has a windowNumber
    if (user && user.windowNumber) {
      fetchCurrentQueue();
      fetchNextQueues();
      
      // Set up periodic refresh for data only
      const interval = setInterval(() => {
        // Only refresh if not currently calling to avoid conflicts
        if (!isCalling) {
          fetchCurrentQueue();
          fetchNextQueues();
        }
      }, 3000); // Refresh every 3 seconds for better responsiveness
      
      return () => clearInterval(interval);
    }
  }, [user, isCalling]); // Add isCalling as dependency

  const fetchCurrentQueue = async () => {
    try {
      const windowNumber = user?.windowNumber;
      
      if (!windowNumber) {
        console.log('No window number available, skipping fetch');
        return;
      }
      
      console.log(`🔍 Fetching current queue for Window ${windowNumber}`);
      
      const response = await fetch(getApiUrl(`/api/queue/current/${windowNumber}`), {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Current queue for Window ${windowNumber}:`, data);
        console.log(`📋 Queue Number: ${data?.queueNumber}`);
        console.log(`🏢 Assigned Window: ${data?.currentWindow}`);
        
        // Check if this is a new queue (different from previous)
        if (data && (!currentQueue || data._id !== currentQueue._id)) {
          console.log(`🆕 New queue received: ${data.queueNumber} at Window ${data.currentWindow}`);
        }
        
        setCurrentQueue(data);
      } else {
        console.error(`❌ Current queue failed for Window ${windowNumber} with status:`, response.status);
        setCurrentQueue(null);
      }
    } catch (error) {
      console.error(`💥 Error fetching current queue for Window ${user?.windowNumber}:`, error);
      setCurrentQueue(null);
    }
  };

  const fetchNextQueues = async () => {
    try {
      const windowNumber = user?.windowNumber;
      
      if (!windowNumber) {
        console.log('No window number available, skipping fetch');
        return;
      }
      
      console.log(`🔍 Fetching next queues for Window ${windowNumber}`);
      
      const response = await fetch(getApiUrl(`/api/queue/next/${windowNumber}`), {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Waiting queues response for Window ${windowNumber}:`, data);
        console.log(`📊 Waiting queues length: ${data.length}`);
        setNextQueues(data);
      } else {
        console.error(`❌ Waiting queues failed for Window ${windowNumber} with status:`, response.status);
        console.error('Waiting queues failed response:', await response.text());
        setNextQueues([]);
      }
    } catch (error) {
      console.error(`💥 Error fetching next queues for Window ${user?.windowNumber}:`, error);
      setNextQueues([]);
    }
  };

  const handleNextQueue = async () => {
    if (isCalling) return;
    
    setIsCalling(true);
    try {
      const windowNumber = user?.windowNumber;
      
      if (!windowNumber) {
        console.log('No window number available, skipping next queue');
        setIsCalling(false);
        return;
      }
      
      console.log(`🎯 Calling next queue for Window ${windowNumber}`);
      console.log(`📊 Available nextQueues before call: ${nextQueues.length}`);
      console.log(`📋 Next queue numbers:`, nextQueues.map(q => q.queueNumber));
      
      const response = await fetch(getApiUrl(`/api/queue/next-queue/${windowNumber}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Next queue response for Window ${windowNumber}:`, data);
        console.log(`📋 Current queue assigned: ${data.currentQueue?.queueNumber} at Window ${data.currentQueue?.currentWindow}`);
        console.log(`📊 Next queues count: ${data.nextQueues?.length || 0}`);
        console.log(`📋 Next queue numbers:`, data.nextQueues?.map((q: any) => q.queueNumber) || []);
        
        setCurrentQueue(data.currentQueue);
        setNextQueues(data.nextQueues || []);
        
        // Sound is now handled by PublicDisplay - no sound here
        console.log(`🎉 Successfully called queue ${data.currentQueue?.queueNumber} to Window ${data.currentQueue?.currentWindow}`);
      } else {
        console.error(`❌ Next queue failed for Window ${windowNumber} with status:`, response.status);
        console.error('Next queue failed response:', await response.text());
      }
    } catch (error) {
      console.error(`💥 Error calling next queue for Window ${user?.windowNumber}:`, error);
    } finally {
      setIsCalling(false);
    }
  };

  const repeatAnnouncement = async () => {
    try {
      const windowNumber = user?.windowNumber;
      
      if (!windowNumber) {
        console.log('No window number available, skipping repeat announcement');
        return;
      }
      
      if (!currentQueue) {
        console.log('No current queue available, skipping repeat announcement');
        return;
      }
      
      console.log(`🔄 Triggering repeat announcement for Window ${windowNumber} - Queue: ${currentQueue.queueNumber}`);
      
      // Get authentication token from localStorage
      const token = localStorage.getItem('token');
      
      // Call API to announce current serving queue 1 time only
      const response = await safeFetch(getApiUrl(`/api/queue/repeat-announcement/${windowNumber}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          queueNumber: currentQueue.queueNumber,
          windowNumber: windowNumber,
          announceOnce: true // Flag to announce only 1 time
        })
      });

      if (response.ok) {
        console.log('✅ Repeat announcement triggered successfully');
      } else {
        console.error('❌ Repeat announcement failed with status:', response.status);
      }
    } catch (error) {
      console.error(`💥 Error triggering repeat announcement for Window ${user?.windowNumber}:`, error);
    }
  };

  const handleLogout = () => {
    logout();
    safeNavigate(navigate, '/window/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Fixed Position Mobile */}
      <div className="bg-blue-600 shadow-md border-b border-blue-700 fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <h1 className="text-lg sm:text-xl font-semibold text-white">
                Window {user?.windowNumber || 'N/A'}
              </h1>
              <div className="hidden sm:flex space-x-2">
                <span className="px-2 py-1 bg-blue-500 text-white rounded-full text-xs sm:text-sm font-medium">
                  {user?.username || 'Unknown User'}
                </span>
                <span className="px-2 py-1 bg-green-500 text-white rounded-full text-xs sm:text-sm font-medium">
                  {user?.role || 'Window Operator'}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="hidden sm:block text-sm text-white">
                {user?.username}
              </span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 pt-20 sm:pt-24 lg:pt-28 pb-4 sm:pb-6 lg:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          
          {/* Currently Serving - Responsive */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8">
              <div className="text-center">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
                  Currently Serving
                </h2>
                
                {currentQueue ? (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-blue-600">
                      {currentQueue.queueNumber}
                    </div>
                    <div className="text-base sm:text-lg text-gray-600">
                      {currentQueue.service}
                    </div>
                    <div className="text-sm sm:text-base text-gray-500">
                      {currentQueue.personType}
                    </div>
                    <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-4 mt-2 sm:mt-4">
                      <div className="text-xs sm:text-sm text-gray-500">
                        Current Window: {currentQueue.currentWindow || user?.windowNumber}
                      </div>
                      <div className="text-xs sm:text-sm text-blue-600 font-medium">
                        Queue #{currentQueue.queueNumber} at Window {currentQueue.currentWindow || user?.windowNumber}
                      </div>
                    </div>
                    
                    {/* Repeat Announcement Button */}
                    <div className="mt-4 sm:mt-6">
                      <button
                        onClick={repeatAnnouncement}
                        className="w-full inline-flex items-center justify-center px-4 py-2 sm:px-6 sm:py-3 border border-transparent text-sm sm:text-base font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <SpeakerWaveIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                        <span className="hidden sm:inline">Repeat Announcement</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-3xl sm:text-4xl text-gray-400 py-8 sm:py-12">
                    <div className="text-center">
                      <UserGroupIcon className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-gray-300 mb-3 sm:mb-4" />
                      <p className="text-sm sm:text-base">No queue currently being served</p>
                      {nextQueues.length === 0 && (
                        <p className="text-xs sm:text-sm text-gray-500 mt-2">No queues waiting</p>
                      )}
                      {nextQueues.length > 0 && (
                        <p className="text-xs sm:text-sm text-blue-600 mt-2">Press "Next Queue" to call next customer</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Next Queue Button - Responsive */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8">
              <div className="text-center">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center justify-center">
                  <UserGroupIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Next in Queue
                </h3>
              </div>
              
              {nextQueues.length > 0 ? (
                <div className="space-y-2 sm:space-y-3">
                  {nextQueues.slice(0, 5).map((queue, index) => (
                    <div key={queue._id} className="border-l-2 sm:border-l-4 border-blue-500 bg-gray-50 p-2 sm:p-3">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm sm:text-base text-gray-900 truncate">
                            {queue.queueNumber}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-600 truncate">
                            {queue.service}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {queue.personType}
                          </div>
                        </div>
                        <div className="text-xs text-blue-600 font-medium mt-1">
                          Will be called at Window {user?.windowNumber}
                        </div>
                        <div className="text-xs text-gray-500 ml-2 sm:ml-4 flex-shrink-0">
                          #{index + 1}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 sm:py-8">
                  <p className="text-sm sm:text-base text-gray-500">No queues waiting</p>
                </div>
              )}
              
              {/* Next Queue Button */}
              <div className="mt-4 sm:mt-6">
                <button
                  onClick={handleNextQueue}
                  disabled={isCalling}
                  className="w-full bg-blue-600 text-white py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8 rounded-lg text-lg sm:text-xl lg:text-2xl font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isCalling ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 border-b-2 border-white mr-2 sm:mr-3"></div>
                      <span className="text-sm sm:text-base">Processing...</span>
                    </>
                  ) : (
                    <>
                      <PlayIcon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 mr-2 sm:mr-3" />
                      <span className="text-sm sm:text-base lg:text-lg">Next Queue</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
