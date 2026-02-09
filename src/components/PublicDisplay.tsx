import React, { useState, useEffect } from 'react';
import { useQueue } from '../contexts/QueueContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl, getSocketUrl } from '../config/api';
import { io } from 'socket.io-client';
import {
  ArrowLeftIcon,
  ArrowsPointingOutIcon,
  ClockIcon,
  CogIcon,
  UserGroupIcon,
  WindowIcon
} from '@heroicons/react/24/outline';

const PublicDisplay: React.FC = () => {
  const { currentQueues, waitingQueues } = useQueue();
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
      // Data will be updated automatically by QueueContext useEffect
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

  useEffect(() => {
    // Use QueueContext data instead of redundant API calls
    if (currentQueues) {
      console.log('📊 Using currentQueues from QueueContext:', currentQueues);
      setLiveCurrentQueues(currentQueues);
    } else {
      setLiveCurrentQueues([]);
    }
    
    // Build nextQueues object from waiting queues
    if (waitingQueues) {
      const next: { [key: number]: any[] } = {};
      
      // Group waiting queues by their assigned windows
      waitingQueues.forEach((queue: any) => {
        const windowNum = queue.currentWindow || queue.nextWindow || 1; // Use currentWindow or nextWindow as fallback
        if (windowNum && windowNum > 0) {
          if (!next[windowNum]) {
            next[windowNum] = [];
          }
          next[windowNum].push(queue);
        }
      });
      
      setNextQueues(next);
    } else {
      setNextQueues({});
    }

    // Announce new queues in order (Window 1 first)
    if (currentQueues && currentQueues.length > 0) {
      currentQueues.forEach((queue: any, index: number) => {
        if (queue.queueNumber && queue.currentWindow) {
          setTimeout(() => {
            announceQueue(queue.queueNumber, queue.currentWindow);
          }, index * 1000); // 1 second delay between announcements
        }
      });
    }
  }, [currentQueues, waitingQueues]);

  // Add periodic refresh as backup for PublicDisplay
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render to ensure latest data
      if (currentQueues) {
        setLiveCurrentQueues([...currentQueues]);
      }
      if (waitingQueues) {
        const next: { [key: number]: any[] } = {};
        waitingQueues.forEach((queue: any) => {
          const windowNum = queue.currentWindow || queue.nextWindow || 1;
          if (windowNum && windowNum > 0) {
            if (!next[windowNum]) {
              next[windowNum] = [];
            }
            next[windowNum].push(queue);
          }
        });
        setNextQueues(next);
      }
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [currentQueues, waitingQueues]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 overflow-hidden">
      {/* Top Bar - Dark Blue */}
      <div className="bg-blue-800 shadow-lg border-b border-blue-700 fixed top-0 left-0 right-0 z-50">
        <div className="container mx-auto max-w-7xl px-2 sm:px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
                {kioskTitle}
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Date and Time - Responsive */}
              <div className="flex items-center space-x-2 text-white">
                <ClockIcon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                <div className="text-right">
                  <div className="text-sm sm:text-base lg:text-lg font-bold">
                    {currentTime.toLocaleTimeString()}
                  </div>
                  <div className="text-xs text-blue-100">
                    {currentTime.toLocaleDateString('en-US', {
                      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                    })}
                  </div>
                </div>
              </div>
              
              {/* Settings Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="p-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <CogIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
                </button>
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
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
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Responsive Container */}
      <div className="container mx-auto px-5 sm:px-5 py-5 sm:py-5 lg:py-20 max-w-7x1 pt-30">
        {/* Window Status - Responsive Grid */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-2xl border-2 border-gray-400">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0">
              <h2 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold flex items-center text-gray-900">
                <WindowIcon className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 xl:w-10 xl:h-10 mr-2 sm:mr-3 lg:mr-4 text-blue-600" />
                Window Status
              </h2>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4 bg-green-500 rounded-full animate-pulse shadow-lg"></div>
                <span className="text-xs sm:text-sm lg:text-base text-green-600 font-medium">Live</span>
              </div>
            </div>

            {/* Responsive Window Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-3 lg:gap-4 xl:gap-6">
              {[1, 2, 3, 4, 5].map(windowNumber => {
                const windowQueue = liveCurrentQueues.find(q => q.currentWindow === windowNumber);
                const nextQueue = nextQueues[windowNumber] && nextQueues[windowNumber][0];

                return (
                  <div
                    key={windowNumber}
                    className={`bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 xl:p-6 text-center transform transition-all duration-300 hover:scale-105 shadow-xl hover:shadow-2xl border-2 flex flex-col justify-between min-h-[180px] sm:min-h-[200px] lg:min-h-[220px] xl:min-h-[240px] ${
                      windowQueue ? 'border-blue-500' : 'border-gray-400'
                    }`}
                  >
                    <div className="flex flex-col h-full">
                      <div>
                        <div className="text-sm sm:text-base lg:text-lg xl:text-xl font-bold mb-2 sm:mb-3 text-gray-800">
                          Window {windowNumber}
                        </div>
                        <div className={`mb-3 sm:mb-4 lg:mb-5 leading-none overflow-hidden flex items-center justify-center ${
                          windowQueue ? 'text-blue-600' : 'text-gray-700'
                        }`}>
                          <span 
                            className="font-black text-center inline-block"
                            style={{
                              fontSize: windowQueue && windowQueue.queueNumber.length > 8 ? '2rem' : 
                                       windowQueue && windowQueue.queueNumber.length > 6 ? '2.5rem' : 
                                       windowQueue && windowQueue.queueNumber.length > 4 ? '3.5rem' : 
                                       windowQueue && windowQueue.queueNumber.length > 2 ? '4.5rem' : '5rem',
                              lineHeight: 1,
                              maxWidth: '100%',
                              wordBreak: 'keep-all',
                              overflow: 'hidden'
                            }}
                          >
                            {windowQueue ? windowQueue.queueNumber : '-'}
                          </span>
                        </div>
                      </div>
                      <div className="mt-auto">
                        <div className="text-xs sm:text-sm lg:text-base xl:text-lg text-gray-700 mb-2 font-semibold">
                          {windowQueue ? (windowQueue.transactionName || windowQueue.service || 'General Service') : 'Available'}
                        </div>
                        <div className="text-xs sm:text-sm lg:text-base xl:text-lg text-gray-600 mb-2">
                          {windowQueue ? windowQueue.personType : 'No Queue'}
                        </div>
                        <div className="text-xs sm:text-sm lg:text-base xl:text-lg text-gray-600 mb-2">
                          {nextQueue ? `Next: ${nextQueue.queueNumber}` : 'No Next'}
                        </div>
                        {windowQueue && (
                          <div className="pt-2 border-t-2 border-gray-300">
                            <div className="text-xs sm:text-sm lg:text-base xl:text-lg text-green-600 font-semibold">
                              Status: <span className="font-bold text-green-700">Serving</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Current Queue Numbers - Responsive List */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-2xl p-3 sm:p-4 lg:p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold mb-3 sm:mb-4 lg:mb-6 flex items-center text-slate-800">
              <UserGroupIcon className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 xl:w-10 xl:h-10 mr-2 sm:mr-3 lg:mr-4 text-blue-600" />
              Current Queue Numbers
            </h3>
            
            {/* Responsive Queue List */}
            <div className="space-y-3">
              {/* Table Header */}
              <div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-xl p-3 sm:p-4 lg:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between border border-slate-600 shadow-lg">
                {/* Left Section Headers */}
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 lg:space-x-4">
                  {/* Window Header */}
                  <div className="text-center sm:text-left min-w-[40px] sm:min-w-[50px] lg:min-w-[60px]">
                    <div className="text-xs text-slate-300 sm:text-xs lg:text-sm font-bold uppercase tracking-wide">Window</div>
                  </div>
                  
                  {/* Queue Number Header */}
                  <div className="text-center sm:text-left min-w-[50px] sm:min-w-[60px] lg:min-w-[80px]">
                    <div className="text-xs text-slate-300 sm:text-sm lg:text-base font-bold uppercase tracking-wide">Queue #</div>
                  </div>
                  
                  {/* Transaction Header */}
                  <div className="text-center sm:text-left min-w-[60px] sm:min-w-[80px] lg:min-w-[120px] flex-1">
                    <div className="text-xs text-slate-300 sm:text-sm lg:text-base font-bold uppercase tracking-wide">Service</div>
                  </div>
                  
                  {/* Person Type Header - Hidden on mobile */}
                  <div className="hidden sm:block text-center sm:text-left min-w-[50px] sm:min-w-[60px] lg:min-w-[80px]">
                    <div className="text-xs text-slate-300 sm:text-sm lg:text-base font-bold uppercase tracking-wide">Type</div>
                  </div>
                </div>
                
                {/* Right Section Headers */}
                <div className="flex flex-row sm:flex-row items-center justify-end space-x-3 sm:space-x-4 lg:space-x-6 mt-2 sm:mt-0">
                  {/* Queue Position Header */}
                  <div className="text-center">
                    <div className="text-xs text-slate-300 font-bold uppercase tracking-wide">Pos</div>
                  </div>
                  
                  {/* Wait Time Header */}
                  <div className="text-center">
                    <div className="text-xs text-slate-300 font-bold uppercase tracking-wide">Wait</div>
                  </div>
                </div>
              </div>
              
              {/* Queue Items */}
              {waitingQueues.slice(0, 10).map((queue) => {
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
                  <div key={queue._id} className="bg-white rounded-xl p-3 sm:p-4 lg:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 border border-slate-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                    {/* Left Section - Queue Info */}
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 lg:space-x-4 border-r border-slate-200 pr-2 sm:pr-4">
                      {/* Window Number */}
                      <div className="text-center sm:text-left min-w-[40px] sm:min-w-[50px] lg:min-w-[60px]">
                        <div className="text-xs text-slate-500 sm:text-xs lg:text-sm font-medium uppercase tracking-wide">Window</div>
                        <div className="text-sm sm:text-base lg:text-lg xl:text-xl font-bold text-slate-800">
                          {assignedWindow > 0 ? assignedWindow : 'Wait'}
                        </div>
                      </div>
                      
                      {/* Queue Number */}
                      <div className="text-center sm:text-left min-w-[50px] sm:min-w-[60px] lg:min-w-[80px]">
                        <div className="text-sm sm:text-base lg:text-lg xl:text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                          {queue.queueNumber}
                        </div>
                      </div>
                      
                      {/* Transaction */}
                      <div className="text-center sm:text-left min-w-[60px] sm:min-w-[80px] lg:min-w-[120px] flex-1">
                        <div className="text-xs sm:text-sm lg:text-base text-slate-700 font-medium truncate">
                          {queue.service || queue.transactionName || 'General'}
                        </div>
                      </div>
                      
                      {/* Person Type - Hidden on mobile */}
                      <div className="hidden sm:block text-center sm:text-left min-w-[50px] sm:min-w-[60px] lg:min-w-[80px]">
                        <div className="text-xs sm:text-sm lg:text-base text-slate-600 font-medium">
                          {queue.personType || 'Regular'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Right Section - Status Info */}
                    <div className="flex flex-row sm:flex-row items-center justify-end space-x-3 sm:space-x-4 lg:space-x-6 mt-2 sm:mt-0 pl-2 sm:pl-4">
                      {/* Queue Position */}
                      <div className="text-center border-l border-slate-200 pl-3 sm:pl-4">
                        <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Pos</div>
                        <div className="text-sm sm:text-base font-semibold text-slate-800">
                          {actualPosition}
                        </div>
                      </div>
                      
                      {/* Wait Time */}
                      <div className="text-center border-l border-slate-200 pl-3 sm:pl-4">
                        <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Wait</div>
                        <div className="text-sm sm:text-base text-slate-700">
                          {Math.floor((actualPosition - 1) * 2)}m
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {waitingQueues.length > 10 && (
              <div className="text-center mt-4 sm:mt-6 text-slate-500 text-xs sm:text-sm font-medium bg-gradient-to-r from-slate-50 to-gray-100 rounded-lg py-3 px-4 border border-slate-200">
                And {waitingQueues.length - 10} more waiting...
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="text-center py-4 text-blue-200 text-sm">
        Developed by: Servando S. Tio III
      </div>
    </div>
  );
};

export default PublicDisplay;
