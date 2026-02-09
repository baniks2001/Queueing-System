import React, { useState, useEffect } from 'react';
import { useQueue } from '../contexts/QueueContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl, getSocketUrl } from '../config/api';
import { io } from 'socket.io-client';
import {
  CogIcon,
  UserGroupIcon,
  WindowIcon,
  ChevronDownIcon,
  ArrowsPointingOutIcon,
  ArrowLeftIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const PublicDisplay: React.FC = () => {
  const { waitingQueues } = useQueue();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [liveCurrentQueues, setLiveCurrentQueues] = useState<any[]>([]);
  const [nextQueues, setNextQueues] = useState<{ [key: number]: any[] }>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [announcedQueues, setAnnouncedQueues] = useState<Set<string>>(new Set());
  const [kioskTitle, setKioskTitle] = useState('Queue Management System');
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchKioskTitle = async () => {
    try {
      const response = await axios.get(getApiUrl('/api/kiosk/status'));
      if (response.data) {
        setKioskTitle(response.data.title || 'Queue Management System');
      }
    } catch (error) {
      console.error('Error fetching kiosk title:', error);
    }
  };

  useEffect(() => {
    fetchKioskTitle();
    const interval = setInterval(fetchKioskTitle, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const announceQueue = (queueNumber: string, windowNumber: number, forceAnnounce: boolean = false) => {
    const announcementKey = `${queueNumber}-${windowNumber}`;
    
    // Only announce if not announced before or forced announcement
    if (!forceAnnounce && announcedQueues.has(announcementKey)) return;
    
    // Limit to 3 announcements per queue number per window
    const announcementCountKey = `${queueNumber}-${windowNumber}-count`;
    const currentCount = parseInt(localStorage.getItem(announcementCountKey) || '0');
    
    if (currentCount >= 3 && !forceAnnounce) {
      console.log(`🔇 Queue ${queueNumber} at window ${windowNumber} already announced 3 times`);
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(
      `Now serving number ${queueNumber} at window ${windowNumber}`
    );
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    window.speechSynthesis.speak(utterance);
    
    // Track announcements
    setAnnouncedQueues(prev => new Set(prev).add(announcementKey));
    
    // Update count in localStorage
    const newCount = currentCount + 1;
    localStorage.setItem(announcementCountKey, newCount.toString());
    
    console.log(`🔊 Announced ${queueNumber} at window ${windowNumber} (${newCount}/3)`);
  };

  useEffect(() => {
    const newSocket = io(getSocketUrl(), {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    // Listen for queue updates from WindowDashboard
    newSocket.on('queueUpdate', (data) => {
      console.log('🔄 Queue update received:', data);
      fetchQueues(); // Refresh when any window updates a queue
    });

    // Listen for sound notifications
    newSocket.on('soundNotification', (data) => {
      console.log('🔊 Sound notification received:', data);
      announceQueue(data.queueNumber, data.windowNumber);
    });

    // Listen for repeat announcements from WindowDashboard
    newSocket.on('repeat-announcement', (data) => {
      console.log('🔄 Repeat announcement received:', data);
      if (data.queues && data.queues.length > 0) {
        data.queues.forEach((queue: any) => {
          if (queue.queueNumber && queue.currentWindow) {
            // Force announce for repeat announcements (ignore 3-time limit)
            announceQueue(queue.queueNumber, queue.currentWindow, true);
          }
        });
      }
    });

    newSocket.on('connect', () => console.log('🔌 Connected to server'));
    newSocket.on('disconnect', () => console.log('🔌 Disconnected from server'));

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const fetchQueues = async () => {
    try {
      const response = await axios.get(getApiUrl('/api/queue/current'));
      if (response.data) {
        console.log('📊 Fetched current queues:', response.data);
        setLiveCurrentQueues(response.data);
        
        // Build nextQueues object from waiting queues
        const waitingResponse = await axios.get(getApiUrl('/api/queue/waiting'));
        if (waitingResponse.data) {
          const next: { [key: number]: any[] } = {};
          
          // Group waiting queues by their assigned windows
          waitingResponse.data.forEach((queue: any) => {
            const windowNum = queue.currentWindow || 1; // Use currentWindow as fallback
            if (windowNum && windowNum > 0) {
              if (!next[windowNum]) {
                next[windowNum] = [];
              }
              next[windowNum].push(queue);
            }
          });
          
          setNextQueues(next);
        }

        // Announce new queues in order (Window 1 first)
        response.data.forEach((queue: any, index: number) => {
          if (queue.queueNumber && queue.currentWindow) {
            setTimeout(() => {
              announceQueue(queue.queueNumber, queue.currentWindow);
            }, index * 1000); // 1 second delay between announcements
          }
        });
      }
    } catch (error) {
      console.error('Error fetching queues:', error);
    }
  };

  useEffect(() => {
    fetchQueues();
    const interval = setInterval(fetchQueues, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white overflow-hidden">
      {/* Top Bar - Fully Responsive */}
      <div className="bg-blue-800 border-b border-blue-700 px-2 sm:px-4 py-2 sm:py-3">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row justify-between items-start sm:items-center">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white text-center sm:text-left">
                {kioskTitle}
              </h1>
              <div className="text-xs sm:text-sm text-blue-200 text-center sm:text-left">
                Please wait for your number
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
              {/* Date and Time - Responsive */}
              <div className="flex items-center space-x-2 text-white">
                <ClockIcon className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                <div className="text-right">
                  <div className="text-sm sm:text-base lg:text-lg font-bold">
                    {currentTime.toLocaleTimeString()}
                  </div>
                  <div className="text-xs text-blue-200">
                    {currentTime.toLocaleDateString('en-US', {
                      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                    })}
                  </div>
                </div>
              </div>
              
              {/* Quick Actions Dropdown - Mobile Optimized */}
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 sm:px-3 sm:py-2 rounded-lg flex items-center space-x-1 sm:space-x-2 transition-colors duration-200 text-xs sm:text-sm"
                >
                  <CogIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline sm:inline">Actions</span>
                  <ChevronDownIcon className={`w-3 h-3 sm:w-4 sm:h-4 transform transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 sm:mt-2 w-48 sm:w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="py-1">
                      <button
                        onClick={() => { setIsDropdownOpen(false); toggleFullscreen(); }}
                        className="w-full text-left px-3 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <ArrowsPointingOutIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                        {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                      </button>
                      <button
                        onClick={() => { setIsDropdownOpen(false); navigate('/'); }}
                        className="w-full text-left px-3 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <ArrowLeftIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                        Back to Kiosk
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Responsive Container */}
      <div className="container mx-auto px-1 sm:px-2 py-3 sm:py-4 lg:py-6 max-w-7xl">
        {/* Window Status - Responsive Grid */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-white border-opacity-20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0">
              <h2 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold flex items-center">
                <WindowIcon className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 xl:w-10 xl:h-10 mr-2 sm:mr-3 lg:mr-4" />
                Window Status
              </h2>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs sm:text-sm lg:text-base text-green-300">Live</span>
              </div>
            </div>

            {/* Responsive Window Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 lg:gap-4 xl:gap-6">
              {[1, 2, 3, 4, 5].map(windowNumber => {
                const windowQueue = liveCurrentQueues.find(q => q.currentWindow === windowNumber);
                const nextQueue = nextQueues[windowNumber] && nextQueues[windowNumber][0];

                return (
                  <div
                    key={windowNumber}
                    className={`bg-white bg-opacity-10 rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 xl:p-6 text-center transform transition-all duration-300 hover:scale-105 ${
                      windowQueue ? 'from-green-500 to-green-600' : 'from-gray-500 to-gray-600'
                    }`}
                  >
                    <div className="text-sm sm:text-base lg:text-lg xl:text-2xl font-bold mb-2 sm:mb-3 lg:mb-4 text-white">
                      Window {windowNumber}
                    </div>
                    <div className={`text-xl sm:text-2xl lg:text-3xl xl:text-5xl font-bold mb-2 sm:mb-3 lg:mb-4 ${
                      windowQueue ? 'text-white' : 'text-gray-300'
                    }`}>
                      {windowQueue ? windowQueue.queueNumber : '-'}
                    </div>
                    <div className="text-xs sm:text-sm lg:text-base xl:text-lg text-white opacity-90 mb-1 sm:mb-2 lg:mb-3 font-semibold">
                      {windowQueue ? (windowQueue.transactionName || windowQueue.service || 'General Service') : 'Available'}
                    </div>
                    <div className="text-xs sm:text-sm lg:text-base xl:text-lg text-white opacity-75 mb-1 sm:mb-2 lg:mb-3">
                      {windowQueue ? windowQueue.personType : 'No Queue'}
                    </div>
                    <div className="text-xs sm:text-sm lg:text-base xl:text-lg text-white opacity-75 mb-1 sm:mb-2 lg:mb-3">
                      {nextQueue ? `Next: ${nextQueue.queueNumber}` : 'No Next'}
                    </div>
                    <div className="text-xs sm:text-sm lg:text-base xl:text-lg text-white opacity-75 mb-1 sm:mb-2 lg:mb-3">
                      Wait: {nextQueue && nextQueue.waitingTime ? `${Math.floor(nextQueue.waitingTime / 60)}m` : '-'}
                    </div>
                    {windowQueue && (
                      <div className="mt-2 sm:mt-4 lg:mt-6 pt-2 sm:pt-4 lg:pt-6 border-t border-white border-opacity-30">
                        <div className="text-xs sm:text-sm lg:text-base xl:text-lg text-white opacity-75">
                          Status: <span className="font-semibold">Serving</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Current Queue Numbers - Responsive List */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-white border-opacity-20">
            <h3 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold mb-3 sm:mb-4 lg:mb-6 flex items-center">
              <UserGroupIcon className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 xl:w-10 xl:h-10 mr-2 sm:mr-3 lg:mr-4" />
              Current Queue Numbers
            </h3>
            
            {/* Responsive Queue List */}
            <div className="space-y-1 sm:space-y-2">
              {waitingQueues.slice(0, 10).map((queue, index) => {
                // Sort waiting queues by creation time to get actual queue position
                const sortedWaitingQueues = [...waitingQueues].sort((a, b) => 
                  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                );
                
                // Find actual position of this queue in the sorted list
                const actualPosition = sortedWaitingQueues.findIndex(q => q._id === queue._id) + 1;
                
                // Determine which window this queue will be served in based on queue data and current assignments
                let assignedWindow = 0;
                
                // First, check if queue already has a window assigned
                if (queue.currentWindow && queue.currentWindow > 0) {
                  assignedWindow = queue.currentWindow;
                } else {
                  // If no window assigned, find the first available window
                  const servingWindows = liveCurrentQueues
                    .filter(q => q.currentWindow && q.status === 'serving')
                    .map(q => q.currentWindow);
                  
                  // Find first available window (1-5)
                  for (let windowNum = 1; windowNum <= 5; windowNum++) {
                    if (!servingWindows.includes(windowNum)) {
                      assignedWindow = windowNum;
                      break;
                    }
                  }
                  
                  // If all windows busy, assign based on actual queue position
                  if (assignedWindow === 0) {
                    assignedWindow = ((actualPosition - 1) % 5) + 1;
                  }
                }

                return (
                  <div key={queue._id} className="bg-white bg-opacity-10 rounded-lg p-2 sm:p-3 lg:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between hover:bg-opacity-20 transition-all duration-200">
                    {/* Left Section - Queue Info */}
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 lg:space-x-4">
                      {/* Window Number */}
                      <div className="text-center sm:text-left min-w-[40px] sm:min-w-[50px] lg:min-w-[60px]">
                        <div className="text-xs text-blue-200 sm:text-xs lg:text-sm">Window</div>
                        <div className="text-sm sm:text-base lg:text-lg xl:text-xl font-bold text-green-300">
                          {assignedWindow > 0 ? assignedWindow : 'Wait'}
                        </div>
                      </div>
                      
                      {/* Queue Number */}
                      <div className="text-center sm:text-left min-w-[50px] sm:min-w-[60px] lg:min-w-[80px]">
                        <div className="text-sm sm:text-base lg:text-lg xl:text-xl font-bold text-blue-200">
                          {queue.queueNumber}
                        </div>
                      </div>
                      
                      {/* Transaction */}
                      <div className="text-center sm:text-left min-w-[60px] sm:min-w-[80px] lg:min-w-[120px]">
                        <div className="text-xs sm:text-sm lg:text-base text-yellow-300 truncate">
                          {queue.service || queue.transactionName || 'General'}
                        </div>
                      </div>
                      
                      {/* Person Type */}
                      <div className="text-center sm:text-left min-w-[50px] sm:min-w-[60px] lg:min-w-[80px]">
                        <div className="text-xs sm:text-sm lg:text-base text-green-300">
                          {queue.personType || 'Regular'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Right Section - Status Info */}
                    <div className="flex flex-row sm:flex-row items-center justify-end space-x-3 sm:space-x-4 lg:space-x-6 mt-2 sm:mt-0">
                      {/* Queue Position */}
                      <div className="text-center">
                        <div className="text-xs text-blue-200">Pos</div>
                        <div className="text-sm sm:text-base font-semibold text-white">
                          {actualPosition}
                        </div>
                      </div>
                      
                      {/* Wait Time */}
                      <div className="text-center">
                        <div className="text-xs text-blue-200">Wait</div>
                        <div className="text-sm sm:text-base text-white">
                          {Math.floor((actualPosition - 1) * 2)}m
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {waitingQueues.length > 10 && (
              <div className="text-center mt-3 sm:mt-4 text-blue-200 text-xs sm:text-sm">
                And {waitingQueues.length - 10} more waiting...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicDisplay;
