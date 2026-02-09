import React, { useState, useEffect } from 'react';
import { useQueue } from '../contexts/QueueContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../config/api';
import { io } from 'socket.io-client';
import {
  ArrowLeftIcon,
  ArrowsPointingOutIcon,
  ClockIcon,
  CogIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

const PublicDisplay: React.FC = () => {
  const { currentQueues, waitingQueues } = useQueue();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [kioskTitle, setKioskTitle] = useState('Queue Management System');
  const [announcedQueues, setAnnouncedQueues] = useState<Set<string>>(new Set());
  const [repeatAnnouncementTracker, setRepeatAnnouncementTracker] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  // Play AI-like synthetic sound notification
  const playSound = () => {
    try {
      // Check if audio context is available
      if (typeof window !== 'undefined' && window.AudioContext) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Create oscillator for beep sound
        const oscillator = audioContext.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.value = 800; // 800 Hz beep
        
        // Create gain node for volume control
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0.3; // 30% volume
        
        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Play beep
        oscillator.start();
        
        // Stop after 200ms
        setTimeout(() => {
          oscillator.stop();
          oscillator.disconnect();
          gainNode.disconnect();
        }, 200);
        
        console.log('🔊 Sound played (online mode)');
      } else {
        console.log('🔇 Audio context not available, sound disabled (offline mode)');
      }
    } catch (error) {
      console.error('Error creating synthetic sound:', error);
    }
  };

  // Speech synthesis for announcements
  const announceQueue = (queueNumber: string, windowNumber: number, forceAnnounce: boolean = false) => {
    const announcementKey = `${queueNumber}-${windowNumber}`;
    
    // Only announce if not announced before or forced announcement
    if (!forceAnnounce && announcedQueues.has(announcementKey)) {
      console.log(`🔇 Queue ${queueNumber} at Window ${windowNumber} already announced`);
      return;
    }
    
    // Limit to 3 announcements per queue number per window
    const announcementCountKey = `${queueNumber}-${windowNumber}-count`;
    const currentCount = parseInt(localStorage.getItem(announcementCountKey) || '0');
    
    if (currentCount >= 3 && !forceAnnounce) {
      console.log(`🔇 Queue ${queueNumber} at Window ${windowNumber} already announced 3 times`);
      return;
    }
    
    // Track announcements for consistency
    setAnnouncedQueues(prev => new Set(prev).add(announcementKey));
    
    // Update count in localStorage for consistency
    const newCount = currentCount + 1;
    localStorage.setItem(announcementCountKey, newCount.toString());
    
    // Cross-browser speech synthesis support
    const SpeechSynthesis = (window as any).speechSynthesis || (window as any).webkitSpeechSynthesis || (window as any).mozSpeechSynthesis || (window as any).msSpeechSynthesis;
    
    if (SpeechSynthesis) {
      try {
        // Create speech synthesis utterance with cross-browser support
        const SpeechSynthesisUtterance = (window as any).SpeechSynthesisUtterance || (window as any).webkitSpeechSynthesisUtterance || (window as any).mozSpeechSynthesisUtterance || (window as any).msSpeechSynthesisUtterance;
        
        const utterance = new SpeechSynthesisUtterance(
          `Now serving number ${queueNumber} at Window ${windowNumber}`
        );
        
        // Set utterance properties with fallbacks
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        // Cross-browser specific properties
        if ('lang' in utterance) {
          utterance.lang = 'en-US';
        }
        if ('voice' in utterance) {
          // Try to use a female voice if available
          const voices = SpeechSynthesis.getVoices();
          const femaleVoice = voices.find((voice: any) => voice.name.includes('Female') || voice.name.includes('female'));
          if (femaleVoice) {
            utterance.voice = femaleVoice;
          }
        }
        
        // Speak announcement
        SpeechSynthesis.speak(utterance);
        
        console.log(`🔊 Announced ${queueNumber} at Window ${windowNumber} (${newCount}/3) - Voice: ${utterance.voice ? utterance.voice.name : 'Default'}`);
        
      } catch (error) {
        console.error(`💥 Speech synthesis error: ${error}`);
        console.log(`� Silent announcement logged: ${queueNumber} at Window ${windowNumber} (${newCount}/3) - Speech synthesis failed`);
      }
    } else {
      // Fallback for devices without speech synthesis (stock smart TV browsers)
      console.log(`🔇 Speech synthesis not available, silent announcement logged: ${queueNumber} at Window ${windowNumber} (${newCount}/3)`);
      
      // Try alternative notification methods for smart TVs
      try {
        // Visual notification for smart TVs
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Queue Announcement', {
            body: `Now serving number ${queueNumber} at Window ${windowNumber}`,
            icon: '/favicon.ico'
          });
        }
        
        // Console-based visual indicator
        console.log(`%c📢 QUEUE ANNOUNCEMENT: ${queueNumber} at Window ${windowNumber}`, 'background: #3B82F6; color: white; font-size: 16px; padding: 10px; border-radius: 5px;');
        
        // Try to vibrate if available (some smart TVs support this)
        if ('vibrate' in navigator) {
          (navigator as any).vibrate([200, 100, 200]);
        }
        
      } catch (fallbackError) {
        console.error(`💥 Fallback notification error: ${fallbackError}`);
      }
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchKioskTitle();
    const interval = setInterval(fetchKioskTitle, 30000);
    return () => clearInterval(interval);
  }, []);

  // Socket.io connection for real-time updates
  useEffect(() => {
    const newSocket = io(getApiUrl(''), {
      transports: ['websocket', 'polling'],
      upgrade: false
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to server via Socket.IO');
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
    });

    newSocket.on('queueServed', (data: { queueNumber: string, windowNumber: number }) => {
      console.log(`🔔 Queue served: ${data.queueNumber} at Window ${data.windowNumber}`);
      
      // Check if this is the current queue being served
      const currentQueue = currentQueues.find(q => q.queueNumber === data.queueNumber);
      if (currentQueue && currentQueue.status === 'serving') {
        playSound(); // Play sound when queue is served
      }
    });

    newSocket.on('newQueues', (data: any) => {
      console.log('📊 Using currentQueues from QueueContext:', data);
    });

    newSocket.on('repeat-announcement', (data) => {
      console.log('🔄 Repeat announcement received in PublicDisplay:', data);
      
      // Handle both single queue and multiple queues
      if (data.queues && data.queues.length > 0) {
        // Multiple queues - handle each one
        data.queues.forEach((queue: any) => {
          if (queue.queueNumber && queue.currentWindow) {
            const announcementKey = `${queue.queueNumber}-${queue.currentWindow}`;
            
            // Check if announceOnce flag is set
            if (data.announceOnce) {
              // Check if this announcement has already been made
              if (!repeatAnnouncementTracker.has(announcementKey)) {
                // Announce 2 times only
                announceQueue(queue.queueNumber, queue.currentWindow, true);
                setRepeatAnnouncementTracker(prev => new Set(prev).add(announcementKey));
                
                setTimeout(() => {
                  announceQueue(queue.queueNumber, queue.currentWindow, true);
                }, 1500); // 1.5 seconds between announcements
              }
            } else {
              // Force announce for repeat announcements (ignore 3-time limit)
              announceQueue(queue.queueNumber, queue.currentWindow, true);
            }
          }
        });
      } else if (data.queueNumber && data.windowNumber) {
        const announcementKey = `${data.queueNumber}-${data.windowNumber}`;
        
        // Single queue - announce it
        if (data.announceOnce) {
          // Check if this announcement has already been made
          if (!repeatAnnouncementTracker.has(announcementKey)) {
            // Announce 2 times only
            announceQueue(data.queueNumber, data.windowNumber, true);
            setRepeatAnnouncementTracker(prev => new Set(prev).add(announcementKey));
            
            setTimeout(() => {
              announceQueue(data.queueNumber, data.windowNumber, true);
            }, 1500); // 1.5 seconds between announcements
          }
        } else {
          // Force announce for repeat announcements (ignore 3-time limit)
          announceQueue(data.queueNumber, data.windowNumber, true);
        }
      }
    });
    return () => {
      newSocket.disconnect();
    };
  }, [currentQueues, repeatAnnouncementTracker]);

  useEffect(() => {
    // Announce new queues in order (Window 1 first) - 3 times each
    if (currentQueues && currentQueues.length > 0) {
      currentQueues.forEach((queue: any, queueIndex: number) => {
        if (queue.queueNumber && queue.currentWindow) {
          // Check if this queue has already been announced 3 times
          const announcementCountKey = `${queue.queueNumber}-${queue.currentWindow}-count`;
          const currentCount = parseInt(localStorage.getItem(announcementCountKey) || '0');
          
          // Only announce if not already announced 3 times
          if (currentCount < 3) {
            // Announce this queue 3 times with delays
            for (let announcementIndex = currentCount; announcementIndex < 3; announcementIndex++) {
              const totalDelay = queueIndex * 3000 + (announcementIndex - currentCount) * 1500; // 3s between queues, 1.5s between announcements
              setTimeout(() => {
                // Force announce for new queues (ignore 3-time limit)
                announceQueue(queue.queueNumber, queue.currentWindow, true);
              }, totalDelay);
            }
          }
        }
      });
    }
  }, [currentQueues, waitingQueues]);

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
    const interval = setInterval(fetchKioskTitle, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Fair positioning algorithm - Low to High priority pattern: Low, Low, High, Low, High, Low, High...
  const sortQueuesWithFairPositioning = (queues: any[]) => {
    // Separate queues by priority based on person type
    const highPriorityQueues = queues.filter(
      (q) => q.personType === 'PWD' || q.personType === 'Senior'
    );
    const normalPriorityQueues = queues.filter(
      (q) => q.personType !== 'PWD' && q.personType !== 'Senior'
    );

    const sortedQueues = [];
    let highIdx = 0;
    let normalIdx = 0;

    while (highIdx < highPriorityQueues.length || normalIdx < normalPriorityQueues.length) {
      // Add two normal priority queues first
      for (let i = 0; i < 2; i++) {
        if (normalIdx < normalPriorityQueues.length) {
          sortedQueues.push(normalPriorityQueues[normalIdx]);
          normalIdx++;
        }
      }
      
      // Add one high priority queue
      if (highIdx < highPriorityQueues.length) {
        sortedQueues.push(highPriorityQueues[highIdx]);
        highIdx++;
      }
    }
    
    return sortedQueues;
  };

  // Combine current and waiting queues for position-based display
  const getAllQueuesByPosition = () => {
    // Use same approach as Window Status - exclude serving queues
    console.log('🔍 Debug - Current Queues:', currentQueues);
    console.log('🔍 Debug - Waiting Queues:', waitingQueues);
    
    // Filter OUT serving queues, only show waiting queues
    const waitingOnlyQueues = waitingQueues.filter(queue => queue.status !== 'serving');
    
    // Apply fair positioning algorithm
    const fairPositionedQueues = sortQueuesWithFairPositioning(waitingOnlyQueues);
    
    console.log('🔍 Debug - Waiting Only Queues (excluding serving):', waitingOnlyQueues);
    console.log('🔍 Debug - Fair Positioned Queues:', fairPositionedQueues);
    return fairPositionedQueues;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
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

      {/* Main Content */}
      <div className="pt-4 sm:pt-6">
        <div className="container mx-auto max-w-7xl px-2 sm:px-3 py-1 sm:py-2">
          
          {/* Side-by-side layout */}
          <div className="flex flex-col lg:flex-row gap-2 lg:gap-3">
            
            {/* Left Side - Window Status */}
            <div className="flex-1 lg:max-w-6xl">
              <div className="bg-white rounded-xl p-6 sm:p-8 lg:p-10 shadow-xl border border-gray-200">
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 sm:mb-6 flex items-center text-slate-800">
                  <UserGroupIcon className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 mr-4 sm:mr-5 text-blue-600" />
                  Window Status
                </h3>
                
                {/* First Row - Windows 1-3 */}
                <div className="grid grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-4 sm:mb-6">
                  {[1, 2, 3].map((windowNumber) => {
                    const currentQueue = currentQueues.find(q => q.currentWindow === windowNumber);
                    const isServing = currentQueue && currentQueue.status === 'serving';
                    
                    return (
                      <div
                        key={windowNumber}
                        className={`relative overflow-hidden rounded-lg p-6 sm:p-8 lg:p-10 transition-all duration-300 transform hover:scale-105 border-2 flex flex-col justify-center items-center min-h-[180px] sm:min-h-[200px] lg:min-h-[240px] ${
                          isServing
                            ? 'bg-blue-50 border-blue-500 shadow-lg'
                            : 'bg-gray-50 border-gray-300'
                        }`}
                      >
                        {/* Window Number */}
                        <div className="text-center mb-3 sm:mb-4">
                          <div className={`text-lg sm:text-xl lg:text-2xl font-bold uppercase tracking-wide ${
                            isServing ? 'text-blue-600' : 'text-gray-600'
                          }`}>
                            Window {windowNumber}
                          </div>
                        </div>
                        
                        {/* Queue Number - Much Bigger */}
                        <div className="text-center flex-1 flex items-center justify-center">
                          {isServing ? (
                            <div className="font-black text-blue-600"
                              style={{
                                fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                                letterSpacing: '0.01em',
                                lineHeight: '1',
                                fontWeight: '900'
                              }}
                            >
                              {currentQueue.queueNumber}
                            </div>
                          ) : (
                            <div className="font-bold text-gray-700"
                              style={{
                                fontSize: 'clamp(2rem, 4.5vw, 3.5rem)',
                                letterSpacing: '0.01em',
                                lineHeight: '1'
                              }}
                            >
                              ---
                            </div>
                          )}
                        </div>
                        
                        {/* Status */}
                        <div className="text-center mt-3 sm:mb-4">
                          <div className={`text-lg sm:text-xl lg:text-2xl font-bold ${
                            isServing ? 'text-blue-500' : 'text-gray-500'
                          }`}>
                            {isServing ? 'Now Serving' : 'Available'}
                          </div>
                        </div>
                        
                        {/* Simple Border Indicator for Active Windows */}
                        {isServing && (
                          <div className="absolute top-0 left-0 right-0 h-4 bg-blue-500 rounded-t-lg" />
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Second Row - Windows 4-5 */}
                <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                  {[4, 5].map((windowNumber) => {
                    const currentQueue = currentQueues.find(q => q.currentWindow === windowNumber);
                    const isServing = currentQueue && currentQueue.status === 'serving';
                    
                    return (
                      <div
                        key={windowNumber}
                        className={`relative overflow-hidden rounded-lg p-6 sm:p-8 lg:p-10 transition-all duration-300 transform hover:scale-105 border-2 flex flex-col justify-center items-center min-h-[180px] sm:min-h-[200px] lg:min-h-[240px] ${
                          isServing
                            ? 'bg-blue-50 border-blue-500 shadow-lg'
                            : 'bg-gray-50 border-gray-300'
                        }`}
                      >
                        {/* Window Number */}
                        <div className="text-center mb-3 sm:mb-4">
                          <div className={`text-lg sm:text-xl lg:text-2xl font-bold uppercase tracking-wide ${
                            isServing ? 'text-blue-600' : 'text-gray-600'
                          }`}>
                            Window {windowNumber}
                          </div>
                        </div>
                        
                        {/* Queue Number - Much Bigger */}
                        <div className="text-center flex-1 flex items-center justify-center">
                          {isServing ? (
                            <div className="font-black text-blue-600"
                              style={{
                                fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                                letterSpacing: '0.01em',
                                lineHeight: '1',
                                fontWeight: '900'
                              }}
                            >
                              {currentQueue.queueNumber}
                            </div>
                          ) : (
                            <div className="font-bold text-gray-700"
                              style={{
                                fontSize: 'clamp(2rem, 4.5vw, 3.5rem)',
                                letterSpacing: '0.01em',
                                lineHeight: '1'
                              }}
                            >
                              ---
                            </div>
                          )}
                        </div>
                        
                        {/* Status */}
                        <div className="text-center mt-3 sm:mb-4">
                          <div className={`text-lg sm:text-xl lg:text-2xl font-bold ${
                            isServing ? 'text-blue-500' : 'text-gray-500'
                          }`}>
                            {isServing ? 'Now Serving' : 'Available'}
                          </div>
                        </div>
                        
                        {/* Simple Border Indicator for Active Windows */}
                        {isServing && (
                          <div className="absolute top-0 left-0 right-0 h-4 bg-blue-500 rounded-t-lg" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Right Side - Current Queue Numbers */}
            <div className="flex-1 lg:max-w-xs">
              <div className="bg-white rounded-xl p-1 sm:p-2 lg:p-2 shadow-md border border-gray-200">
                
                {/* Responsive Queue List */}
                <div className="space-y-1">
                  {/* Table Header */}
                  <div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-sm p-1 sm:p-1 flex flex-col sm:flex-row sm:items-center sm:justify-between border border-slate-600 shadow-sm">
                    {/* Left Section Headers */}
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-1 lg:space-x-1">
                      {/* Window Header */}
                      <div className="text-center sm:text-left min-w-[15px] sm:min-w-[20px] lg:min-w-[25px]">
                        <div className="text-xs text-slate-300 font-bold uppercase tracking-wide">Window</div>
                      </div>
                      
                      {/* Queue Number Header */}
                      <div className="text-center sm:text-left min-w-[25px] sm:min-w-[30px] lg:min-w-[35px]">
                        <div className="text-xs text-slate-300 font-bold uppercase tracking-wide">Queue #</div>
                      </div>
                      
                      {/* Status Header */}
                      <div className="text-center sm:text-left min-w-[25px] sm:min-w-[30px] lg:min-w-[35px]">
                        <div className="text-xs text-slate-300 font-bold uppercase tracking-wide">Status</div>
                      </div>
                      
                      {/* Transaction Header */}
                      <div className="text-center sm:text-left min-w-[30px] sm:min-w-[35px] lg:min-w-[40px] flex-1">
                        <div className="text-xs text-slate-300 font-bold uppercase tracking-wide">Service</div>
                      </div>
                      
                      {/* Person Type Header - Hidden on mobile */}
                      <div className="hidden sm:block text-center sm:text-left min-w-[20px] sm:min-w-[25px] lg:min-w-[30px]">
                        <div className="text-xs text-slate-300 font-bold uppercase tracking-wide">Type</div>
                      </div>
                    </div>
                    
                    {/* Right Section Headers */}
                    <div className="flex flex-row sm:flex-row items-center justify-end space-x-1 sm:space-x-1 lg:space-x-2 mt-1 sm:mt-0">
                      {/* Queue Position Header */}
                      <div className="text-center">
                        <div className="text-xs text-slate-300 font-bold uppercase tracking-wide">Pos</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Queue Items */}
                  {(() => {
                    const queues = getAllQueuesByPosition().slice(0, 6);
                    console.log('🔍 Debug - Queues to render:', queues);
                    console.log('🔍 Debug - Queues length:', queues.length);
                    
                    if (queues.length === 0) {
                      return (
                        <div className="text-center py-2 text-slate-500">
                          <div className="text-xs font-medium">No waiting queues</div>
                          <div className="text-xs mt-1">All queues are being served</div>
                        </div>
                      );
                    }
                    
                    return queues.map((queue) => {
                      // Sort waiting queues by creation time to get actual queue position
                      const sortedWaitingQueues = [...getAllQueuesByPosition()].sort((a, b) => 
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
                        // If no window assigned, find first available window
                        const servingWindows = currentQueues
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
                        <div key={queue._id} className="bg-gray-50 rounded-sm p-1 sm:p-1 flex flex-col sm:flex-row sm:items-center sm:justify-between hover:bg-blue-50 transition-all duration-300 border border-gray-200 shadow-sm hover:shadow-md">
                          {/* Left Section - Queue Info */}
                          <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-1 lg:space-x-1 border-r border-gray-200 pr-1 sm:pr-1">
                            {/* Window Number */}
                            <div className="text-center sm:text-left min-w-[15px] sm:min-w-[20px] lg:min-w-[25px]">
                              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Window</div>
                              <div className="text-xs sm:text-xs lg:text-sm font-bold text-slate-800">
                                {assignedWindow > 0 ? assignedWindow : 'Wait'}
                              </div>
                            </div>
                            
                            {/* Queue Number */}
                            <div className="text-center sm:text-left min-w-[25px] sm:min-w-[30px] lg:min-w-[35px]">
                              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Queue #</div>
                              <div className="text-xs sm:text-xs lg:text-sm font-bold text-blue-600">
                                {queue.queueNumber}
                              </div>
                            </div>
                            
                            {/* Status */}
                            <div className="text-center sm:text-left min-w-[25px] sm:min-w-[30px] lg:min-w-[35px]">
                              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Status</div>
                              <div className={`text-xs sm:text-xs lg:text-sm font-bold ${
                                queue.status === 'serving' ? 'text-green-600' : 'text-orange-600'
                              }`}>
                                {queue.status === 'serving' ? 'Serving' : 'Waiting'}
                              </div>
                            </div>
                            
                            {/* Transaction */}
                            <div className="text-center sm:text-left min-w-[30px] sm:min-w-[35px] lg:min-w-[40px] flex-1">
                              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Service</div>
                              <div className="text-xs sm:text-xs lg:text-sm font-semibold text-slate-700 truncate">
                                {queue.service || 'General'}
                              </div>
                            </div>
                            
                            {/* Person Type - Hidden on mobile */}
                            <div className="hidden sm:block text-center sm:text-left min-w-[20px] sm:min-w-[25px] lg:min-w-[30px]">
                              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Type</div>
                              <div className="text-xs sm:text-xs lg:text-sm font-medium text-slate-600">
                                {queue.personType}
                              </div>
                            </div>
                          </div>
                          
                          {/* Right Section - Position */}
                          <div className="flex flex-row sm:flex-row items-center justify-end space-x-1 sm:space-x-1 lg:space-x-2 mt-1 sm:mt-0">
                            {/* Queue Position */}
                            <div className="text-center">
                              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Pos</div>
                              <div className="text-xs sm:text-xs lg:text-sm font-bold text-slate-800">
                                #{actualPosition}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
                
                {/* Label Below Table */}
                <div className="text-center mt-2 text-slate-600">
                  <h4 className="text-xs sm:text-sm lg:text-sm font-bold uppercase tracking-wide">
                    <UserGroupIcon className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1 text-blue-600" />
                    Current Queue Numbers
                  </h4>
                </div>
                
                {getAllQueuesByPosition().length > 6 && (
                  <div className="text-center mt-1 text-slate-500 text-xs font-medium bg-gray-50 rounded-sm py-1 px-1 border border-gray-200">
                    And {getAllQueuesByPosition().length - 6} more waiting...
                  </div>
                )}
              </div>
            </div>
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
