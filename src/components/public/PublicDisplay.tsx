import React, { useState, useEffect, useCallback } from 'react';
import { useQueue } from '../../contexts/QueueContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl, getUploadUrl } from '../../config/api';
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
  const [governmentOfficeName, setGovernmentOfficeName] = useState('Government Office');
  const [logo, setLogo] = useState<string | null>(null);
  const [repeatAnnouncementTracker, setRepeatAnnouncementTracker] = useState<Set<string>>(new Set());
  const [windowUsers, setWindowUsers] = useState<any[]>([]);
  const [onHoldQueues, setOnHoldQueues] = useState<any[]>([]);
  const [lastTableRefresh, setLastTableRefresh] = useState<Date>(new Date());
  
  // Announcement management state
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const [announcementQueue, setAnnouncementQueue] = useState<Array<{queueNumber: string, windowNumber: number, force?: boolean, priority?: number}>>([]);
  const [announcementHistory, setAnnouncementHistory] = useState<Map<string, {count: number, lastAnnounced: number}>>(new Map());
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  const [customMessages, setCustomMessages] = useState<Map<string, string>>(new Map());
  
  const navigate = useNavigate();

  // Fetch window users from database
  const fetchOnHoldQueues = async () => {
    console.log('🚀 fetchOnHoldQueues called in PublicDisplay');
    try {
      console.log('🔍 Fetching all on-hold queues for PublicDisplay');
      
      const response = await fetch(getApiUrl('/api/queue/on-hold/all'), {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ On-hold queues response for PublicDisplay:', data);
        console.log(`📊 On-hold queues length: ${data.length}`);
        setOnHoldQueues(data);
        setLastTableRefresh(new Date());
        console.log('🔄 On-hold queues refreshed at:', new Date().toLocaleTimeString());
      } else {
        console.error(`❌ On-hold queues failed for PublicDisplay with status:`, response.status);
        setOnHoldQueues([]);
      }
    } catch (error) {
      console.error(`💥 Error fetching on-hold queues for PublicDisplay:`, error);
      setOnHoldQueues([]);
    }
  };

  const fetchWindowUsers = async () => {
    try {
      const response = await axios.get(getApiUrl('/api/users/window-users/public'));
      if (response.data) {
        setWindowUsers(response.data);
        setLastTableRefresh(new Date());
        console.log('🔄 Window users refreshed at:', new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error('Error fetching window users:', error);
    }
  };

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

  // Enhanced announcement queue system
  const queueAnnouncement = (queueNumber: string, windowNumber: number, force: boolean = false, priority: number = 1) => {
    const announcementKey = `${queueNumber}-${windowNumber}`;
    
    // Check announcement history
    const history = announcementHistory.get(announcementKey);
    const maxAnnouncements = 1;
    
    // Don't queue if already announced max times (unless forced)
    if (!force && history && history.count >= maxAnnouncements) {
      console.log(`🔇 Queue ${queueNumber} at Window ${windowNumber} already announced ${maxAnnouncements} time`);
      return false;
    }
    
    // Add to queue with priority
    setAnnouncementQueue(prev => {
      // Remove existing announcement for same queue if present
      const filtered = prev.filter(a => `${a.queueNumber}-${a.windowNumber}` !== announcementKey);
      // Add new announcement with priority
      return [...filtered, { queueNumber, windowNumber, force, priority }].sort((a, b) => (b.priority || 1) - (a.priority || 1));
    });
    
    console.log(`📝 Queued announcement: ${queueNumber} at Window ${windowNumber} (Priority: ${priority})`);
    return true;
  };

  // Process announcement queue
  const processAnnouncementQueue = useCallback(async () => {
    if (isAnnouncing || announcementQueue.length === 0) {
      return;
    }

    const announcement = announcementQueue[0];
    const announcementKey = `${announcement.queueNumber}-${announcement.windowNumber}`;
    
    setIsAnnouncing(true);
    
    try {
      // Update announcement history
      const history = announcementHistory.get(announcementKey) || { count: 0, lastAnnounced: 0 };
      const newHistory = { 
        count: history.count + 1, 
        lastAnnounced: Date.now() 
      };
      
      setAnnouncementHistory(prev => new Map(prev).set(announcementKey, newHistory));
      
      // Update localStorage for persistence
      localStorage.setItem(`${announcementKey}-count`, newHistory.count.toString());
      localStorage.setItem(`${announcementKey}-last`, newHistory.lastAnnounced.toString());
      
      // Perform the actual announcement
      await performAnnouncement(announcement.queueNumber, announcement.windowNumber, newHistory.count);
      
      // Remove from queue
      setAnnouncementQueue(prev => prev.slice(1));
      
    } catch (error) {
      console.error('💥 Error processing announcement:', error);
    } finally {
      setIsAnnouncing(false);
    }
  }, [isAnnouncing, announcementQueue, announcementHistory]);

  // Actual speech synthesis implementation
  const performAnnouncement = async (queueNumber: string, windowNumber: number, count: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Cross-browser speech synthesis support
      const SpeechSynthesis = (window as any).speechSynthesis || (window as any).webkitSpeechSynthesis || (window as any).mozSpeechSynthesis || (window as any).msSpeechSynthesis;
      
      // Check if this is a custom announcement
      const isCustom = queueNumber.startsWith('custom-');
      let announcementText = '';
      
      if (isCustom) {
        // Get the actual custom message from the map
        const customMessage = customMessages.get(queueNumber);
        if (customMessage) {
          announcementText = `ANNOUNCEMENT FROM WINDOW ${windowNumber} : ${customMessage}`;
        } else {
          announcementText = `ANNOUNCEMENT FROM WINDOW ${windowNumber} : Custom announcement`;
        }
      } else {
        // Regular queue announcement
        announcementText = `Now serving number ${queueNumber} at Window ${windowNumber}`;
      }
      
      if (SpeechSynthesis) {
        try {
          // Cancel any ongoing speech
          SpeechSynthesis.cancel();
          
          // Wait a bit for cancellation to take effect
          setTimeout(() => {
            try {
              // Create speech synthesis utterance with cross-browser support
              const SpeechSynthesisUtterance = (window as any).SpeechSynthesisUtterance || (window as any).webkitSpeechSynthesisUtterance || (window as any).mozSpeechSynthesisUtterance || (window as any).msSpeechSynthesisUtterance;
              
              const utterance = new SpeechSynthesisUtterance(announcementText);
              
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
              
              // Set up event handlers
              utterance.onend = () => {
                console.log(`✅ Announced ${queueNumber} at Window ${windowNumber} (${count}/1) - Voice: ${utterance.voice ? utterance.voice.name : 'Default'}`);
                resolve();
              };
              
              utterance.onerror = (event: any) => {
                console.error(`💥 Speech synthesis error:`, event);
                reject(event);
              };
              
              // Speak announcement
              SpeechSynthesis.speak(utterance);
              
            } catch (error) {
              console.error(`💥 Speech synthesis setup error: ${error}`);
              reject(error);
            }
          }, 100);
          
        } catch (error) {
          console.error(`💥 Speech synthesis error: ${error}`);
          console.log(`🔇 Silent announcement logged: ${queueNumber} at Window ${windowNumber} (${count}/1) - Speech synthesis failed`);
          resolve(); // Resolve even on error to continue queue
        }
      } else {
        // Fallback for devices without speech synthesis
        console.log(`🔇 Speech synthesis not available, silent announcement logged: ${queueNumber} at Window ${windowNumber} (${count}/1)`);
        
        // Try alternative notification methods
        try {
          // Visual notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(isCustom ? 'Custom Announcement' : 'Queue Announcement', {
              body: announcementText,
              icon: '/favicon.ico'
            });
          }
          
          // Console-based visual indicator
          console.log(`%c📢 ${isCustom ? 'CUSTOM ANNOUNCEMENT' : 'QUEUE ANNOUNCEMENT'}: ${announcementText}`, 'background: #3B82F6; color: white; font-size: 16px; padding: 10px; border-radius: 5px;');
          
          // Vibration if available
          if ('vibrate' in navigator) {
            (navigator as any).vibrate([200, 100, 200]);
          }
          
        } catch (fallbackError) {
          console.error(`💥 Fallback notification error: ${fallbackError}`);
        }
        
        resolve(); // Resolve after fallback
      }
    });
  };

  // Legacy announceQueue function for backward compatibility
  const announceQueue = (queueNumber: string, windowNumber: number, forceAnnounce: boolean = false) => {
    return queueAnnouncement(queueNumber, windowNumber, forceAnnounce, forceAnnounce ? 10 : 1);
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Process announcement queue
  useEffect(() => {
    if (isAnnouncing || announcementQueue.length === 0) {
      return;
    }

    const processNext = async () => {
      await processAnnouncementQueue();
    };

    // Small delay to ensure state is updated
    const timeoutId = setTimeout(processNext, 100);
    return () => clearTimeout(timeoutId);
  }, [isAnnouncing, announcementQueue, processAnnouncementQueue]);

  useEffect(() => {
    fetchKioskTitle();
    fetchWindowUsers();
    fetchOnHoldQueues();
    
    // Only refresh table data, not the entire system
    const tablesInterval = setInterval(() => {
      console.log('🔄 Refreshing tables only...');
      fetchWindowUsers();
      fetchOnHoldQueues();
    }, 7000); // Refresh tables every 7 seconds (reduced frequency)
    
    // Refresh kiosk title less frequently
    const titleInterval = setInterval(() => {
      console.log('🔄 Refreshing kiosk title...');
      fetchKioskTitle();
    }, 45000); // Refresh title every 45 seconds (reduced frequency)
    
    return () => {
      clearInterval(tablesInterval);
      clearInterval(titleInterval);
    };
  }, []);

  // Test immediate call
  useEffect(() => {
    console.log('🧪 Testing immediate fetchOnHoldQueues call');
    fetchOnHoldQueues();
  }, []);

  // Enhanced Socket.io connection for real-time updates
  useEffect(() => {
    const newSocket = io(getApiUrl(''), {
      transports: ['websocket', 'polling'],
      upgrade: false,
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to server via Socket.IO');
      setConnectionStatus('connected');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
      setConnectionStatus('disconnected');
    });

    newSocket.on('reconnecting', (attemptNumber) => {
      console.log(`🔄 Reconnecting to server (attempt ${attemptNumber})`);
      setConnectionStatus('reconnecting');
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`✅ Reconnected to server after ${attemptNumber} attempts`);
      setConnectionStatus('connected');
    });

    newSocket.on('reconnect_failed', () => {
      console.error('❌ Failed to reconnect to server');
      setConnectionStatus('disconnected');
    });

    newSocket.on('queueServed', (data: { queueNumber: string, windowNumber: number }) => {
      console.log(`🔔 Queue served: ${data.queueNumber} at Window ${data.windowNumber}`);
      
      // Always play sound and announce when queueServed event is received
      playSound(); // Play sound when queue is served
      // Queue announcement with high priority
      queueAnnouncement(data.queueNumber, data.windowNumber, false, 5);
    });

    newSocket.on('newQueues', (data: any) => {
      console.log('📊 Using currentQueues from QueueContext:', data);
    });

    newSocket.on('repeat-announcement', (data) => {
      console.log('🔄 Repeat announcement received in PublicDisplay:', data);
      
      // Handle both single queue and multiple queues
      if (data.queues && data.queues.length > 0) {
        // Multiple queues - handle each one
        data.queues.forEach((queue: any, index: number) => {
          if (queue.queueNumber && queue.currentWindow) {
            const announcementKey = `${queue.queueNumber}-${queue.currentWindow}`;
            
            // Check if announceOnce flag is set
            if (data.announceOnce) {
              // Check if this announcement has already been made
              if (!repeatAnnouncementTracker.has(announcementKey)) {
                // Queue announcements with delay to prevent overlap
                setTimeout(() => {
                  queueAnnouncement(queue.queueNumber, queue.currentWindow, true, 8);
                }, index * 2000); // 2 seconds between each announcement
                
                setRepeatAnnouncementTracker(prev => new Set(prev).add(announcementKey));
              }
            } else {
              // Force announce for repeat announcements with high priority
              queueAnnouncement(queue.queueNumber, queue.currentWindow, true, 10);
            }
          }
        });
      } else if (data.queueNumber && data.windowNumber) {
        const announcementKey = `${data.queueNumber}-${data.windowNumber}`;
        
        // Single queue - announce it
        if (data.announceOnce) {
          // Check if this announcement has already been made
          if (!repeatAnnouncementTracker.has(announcementKey)) {
            queueAnnouncement(data.queueNumber, data.windowNumber, true, 8);
            setRepeatAnnouncementTracker(prev => new Set(prev).add(announcementKey));
          }
        } else {
          // Force announce for repeat announcements with highest priority
          queueAnnouncement(data.queueNumber, data.windowNumber, true, 10);
        }
      }
    });

    newSocket.on('custom-announcement', (data) => {
      console.log('🎤 Custom announcement received in PublicDisplay:', data);
      
      if (data.message && data.windowNumber) {
        // Create a unique key for custom announcements
        const customKey = `custom-${data.windowNumber}-${Date.now()}`;
        
        // Store the custom message in a map for retrieval
        setCustomMessages((prev: Map<string, string>) => new Map(prev).set(customKey, data.message));
        
        // Announce the custom message with highest priority
        setTimeout(() => {
          queueAnnouncement(customKey, data.windowNumber, true, 15);
        }, 500);
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [currentQueues, repeatAnnouncementTracker]);

  useEffect(() => {
    // Announce new queues in order (Window 1 first) - 1 time each
    if (currentQueues && currentQueues.length > 0) {
      currentQueues.forEach((queue: any, queueIndex: number) => {
        if (queue.queueNumber && queue.currentWindow) {
          // Check if this queue has already been announced 1 time
          const announcementCountKey = `${queue.queueNumber}-${queue.currentWindow}-count`;
          const currentCount = parseInt(localStorage.getItem(announcementCountKey) || '0');
          
          // Only announce if not already announced 1 time
          if (currentCount < 1) {
            // Announce this queue 1 time with delay
            const totalDelay = queueIndex * 2000; // 2s between queues
            setTimeout(() => {
              // Force announce for new queues (ignore 1-time limit)
              announceQueue(queue.queueNumber, queue.currentWindow, true);
            }, totalDelay);
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
        setGovernmentOfficeName(response.data.governmentOfficeName || 'Government Office');
        setLogo(response.data.logo || null);
        console.log('🔄 Kiosk title refreshed at:', new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error('Error fetching kiosk title:', error);
    }
  };

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 safe-area">
      {/* Top Bar - Dark Blue */}
      <div className="bg-blue-800 shadow-lg border-b border-blue-700 fixed top-0 left-0 right-0 z-50 safe-area-top">
        <div className="container mx-auto max-w-7xl px-2 sm:px-3 py-1 tv-optimized">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Logo */}
              {logo && (
                <img 
                  src={getUploadUrl(logo)} 
                  alt="Government Office Logo" 
                  className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 object-contain"
                  onError={(e) => {
                    console.error('Logo failed to load in PublicDisplay:', getUploadUrl(logo));
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              
              {/* Government Office Name and Title */}
              <div className="tv-optimized">
                <div className="text-xs text-blue-100">
                  {governmentOfficeName}
                </div>
                <h1 className="text-xs sm:text-sm lg:text-lg font-bold text-white tv-optimized">
                  {kioskTitle}
                </h1>
                {/* Connection Status Indicator */}
                <div className="flex items-center space-x-2 mt-0">
                  <div className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-green-400' : 
                    connectionStatus === 'reconnecting' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'
                  }`} />
                  <span className="text-xs text-blue-200">
                    {connectionStatus === 'connected' ? 'Connected' : 
                     connectionStatus === 'reconnecting' ? 'Reconnecting...' : 'Disconnected'}
                  </span>
                  {isAnnouncing && (
                    <span className="text-xs text-green-300 animate-pulse ml-2">
                      🔊 Announcing...
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Date and Time - Responsive */}
              <div className="flex items-center space-x-2 text-white tv-optimized">
                <ClockIcon className="w-3 h-3 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                <div className="text-right">
                  <div className="text-xs font-bold">
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
                  className="p-2 rounded-lg hover:bg-blue-700 transition-colors touch-manipulation active-scale"
                  aria-label="Settings menu"
                  aria-expanded={isDropdownOpen}
                >
                  <CogIcon className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
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
      <div className="h-screen pt-12">
        <div className="container mx-auto max-w-7xl px-2 sm:px-3 py-2 h-full">
          
          {/* Side-by-side layout */}
          <div className="flex flex-col lg:flex-row gap-2 lg:gap-3 justify-center items-start h-full">
            
            {/* Left Side - Window Status */}
            <div className="flex-1">
              <div className="bg-white rounded-xl p-4 sm:p-6 lg:p-8 shadow-xl border border-gray-200 h-full overflow-hidden">
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 sm:mb-6 flex items-center justify-between text-slate-800">
                  <div className="flex items-center">
                    <UserGroupIcon className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 mr-4 sm:mr-5 text-blue-600" />
                    Window Status
                  </div>
                  <div className="text-xs text-gray-400 font-normal">
                    Last: {lastTableRefresh.toLocaleTimeString()}
                  </div>
                </h3>
                
                {/* Dynamic Window Status - Show windows from database */}
                <div className="space-y-3 sm:space-y-4">
                  {(() => {
                    const activeWindows = windowUsers
                      .filter(user => user.isActive && user.windowNumber)
                      .sort((a, b) => (a.windowNumber || 0) - (b.windowNumber || 0));
                    
                    // Auto-resize grid based on number of windows
                    const windowCount = activeWindows.length;
                    let gridCols = 'grid-cols-1';
                    if (windowCount === 2) gridCols = 'grid-cols-1 sm:grid-cols-2';
                    else if (windowCount === 3) gridCols = 'grid-cols-1 sm:grid-cols-3';
                    else if (windowCount >= 4) gridCols = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
                    
                    return (
                      <div className={`grid ${gridCols} gap-3 sm:gap-4 lg:gap-6`}>
                        {activeWindows.map((windowUser) => {
                          const windowNumber = windowUser.windowNumber;
                          const currentQueue = currentQueues.find(q => q.currentWindow === windowNumber);
                          const isServing = currentQueue && currentQueue.status === 'serving';
                          
                          return (
                            <div
                              key={windowUser._id}
                              className={`relative overflow-hidden rounded-lg p-4 sm:p-6 lg:p-8 transition-all duration-300 transform hover:scale-105 border-2 flex flex-col justify-center items-center min-h-[140px] sm:min-h-[160px] lg:min-h-[180px] ${
                                isServing
                                  ? 'bg-blue-50 border-blue-500 shadow-lg'
                                  : 'bg-gray-50 border-gray-300'
                              }`}
                            >
                              {/* Window Number */}
                              <div className="text-center mb-2 sm:mb-3">
                                <div className={`text-sm sm:text-base lg:text-lg font-bold uppercase tracking-wide ${
                                  isServing ? 'text-blue-600' : 'text-gray-600'
                                }`}>
                                  Window {windowNumber}
                                </div>
                              </div>
                              
                              {/* Queue Number */}
                              <div className="text-center flex-1 flex items-center justify-center">
                                {isServing ? (
                                  <div className="font-black text-blue-600"
                                    style={{
                                      fontSize: 'clamp(1.8rem, 4vw, 3rem)',
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
                                      fontSize: 'clamp(1.5rem, 3.5vw, 2.5rem)',
                                      letterSpacing: '0.01em',
                                      lineHeight: '1'
                                    }}
                                  >
                                    ---
                                  </div>
                                )}
                              </div>
                              
                              {/* Status */}
                              <div className="text-center mt-2 sm:mt-3">
                                <div className={`text-sm sm:text-base lg:text-lg font-bold ${
                                  isServing ? 'text-blue-500' : 'text-gray-500'
                                }`}>
                                  {isServing ? 'Now Serving' : 'Available'}
                                </div>
                              </div>
                              
                              {/* Border Indicator for Active Windows */}
                              {isServing && (
                                <div className="absolute top-0 left-0 right-0 h-3 bg-blue-500 rounded-t-lg" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
            
            {/* Right Side - Current Queue Numbers */}
            <div className="flex-1 lg:max-w-sm">
              <div className="bg-white rounded-xl p-2 sm:p-3 lg:p-4 shadow-md border border-gray-200 h-full overflow-hidden flex flex-col">
                
                {/* Responsive Queue List */}
                <div className="space-y-1 flex-1 overflow-y-auto">
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
                    const queues = getAllQueuesByPosition().slice(0, 5);
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
                  <h4 className="text-xs sm:text-sm lg:text-sm font-bold uppercase tracking-wide flex items-center justify-center">
                    <UserGroupIcon className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1 text-blue-600" />
                    Current Queue Numbers
                    <span className="ml-2 text-xs text-gray-400 font-normal">
                      ({lastTableRefresh.toLocaleTimeString()})
                    </span>
                  </h4>
                </div>
                
                {getAllQueuesByPosition().length > 5 && (
                  <div className="text-center mt-1 text-slate-500 text-xs font-medium bg-gray-50 rounded-sm py-1 px-1 border border-gray-200">
                    And {getAllQueuesByPosition().length - 5} more waiting...
                  </div>
                )}
              </div>
              
              {/* On Hold Queue Numbers */}
              <div className="bg-white rounded-xl p-2 sm:p-3 lg:p-4 shadow-md border border-gray-200 h-full overflow-hidden flex flex-col mt-2">
                {/* On Hold Queue List */}
                <div className="space-y-1 flex-1 overflow-y-auto">
                  {/* Table Header */}
                  <div className="bg-gradient-to-r from-orange-700 to-orange-800 rounded-sm p-1 sm:p-1 flex flex-col sm:flex-row sm:items-center sm:justify-between border border-orange-600 shadow-sm">
                    {/* Left Section Headers */}
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-1 lg:space-x-1">
                      {/* Window Header */}
                      <div className="text-center sm:text-left min-w-[15px] sm:min-w-[20px] lg:min-w-[25px]">
                        <div className="text-xs text-orange-300 font-bold uppercase tracking-wide">Window</div>
                      </div>
                      
                      {/* Queue Number Header */}
                      <div className="text-center sm:text-left min-w-[25px] sm:min-w-[30px] lg:min-w-[35px]">
                        <div className="text-xs text-orange-300 font-bold uppercase tracking-wide">Queue #</div>
                      </div>
                      
                      {/* Service Header */}
                      <div className="text-center sm:text-left min-w-[30px] sm:min-w-[35px] lg:min-w-[40px] flex-1">
                        <div className="text-xs text-orange-300 font-bold uppercase tracking-wide">Service</div>
                      </div>
                      
                      {/* Person Type Header - Hidden on mobile */}
                      <div className="hidden sm:block text-center sm:text-left min-w-[20px] sm:min-w-[25px] lg:min-w-[30px]">
                        <div className="text-xs text-orange-300 font-bold uppercase tracking-wide">Type</div>
                      </div>
                    </div>
                    
                    {/* Right Section Headers */}
                    <div className="flex flex-row sm:flex-row items-center justify-end space-x-1 sm:space-x-1 lg:space-x-2 mt-1 sm:mt-0">
                      {/* Hold Time Header */}
                      <div className="text-center">
                        <div className="text-xs text-orange-300 font-bold uppercase tracking-wide">Hold</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* On Hold Queue Items */}
                  {(() => {
                    const displayOnHoldQueues = onHoldQueues.slice(0, 5);
                    console.log('🔍 Debug - On Hold Queues to render:', displayOnHoldQueues);
                    console.log('🔍 Debug - On Hold Queues length:', displayOnHoldQueues.length);
                    
                    if (displayOnHoldQueues.length === 0) {
                      return (
                        <div className="text-center py-2 text-slate-500">
                          <div className="text-xs font-medium">No on-hold queues</div>
                          <div className="text-xs mt-1">All queues are being served or waiting</div>
                        </div>
                      );
                    }
                    
                    return displayOnHoldQueues.map((queue) => {
                      // Calculate hold time
                      const holdTime = new Date(queue.updatedAt).getTime();
                      const currentTimeMs = new Date().getTime();
                      const holdDuration = Math.floor((currentTimeMs - holdTime) / 60000); // minutes
                      
                      return (
                        <div key={queue._id} className="bg-orange-50 rounded-sm p-1 sm:p-1 flex flex-col sm:flex-row sm:items-center sm:justify-between hover:bg-orange-100 transition-all duration-300 border border-orange-200 shadow-sm hover:shadow-md">
                          {/* Left Section - Queue Info */}
                          <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-1 lg:space-x-1 border-r border-orange-200 pr-1 sm:pr-1">
                            {/* Window Number */}
                            <div className="text-center sm:text-left min-w-[15px] sm:min-w-[20px] lg:min-w-[25px]">
                              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Window</div>
                              <div className="text-xs sm:text-xs lg:text-sm font-bold text-slate-800">
                                {queue.currentWindow || 'Wait'}
                              </div>
                            </div>
                            
                            {/* Queue Number */}
                            <div className="text-center sm:text-left min-w-[25px] sm:min-w-[30px] lg:min-w-[35px]">
                              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Queue #</div>
                              <div className="text-xs sm:text-xs lg:text-sm font-bold text-orange-600">
                                {queue.queueNumber}
                              </div>
                            </div>
                            
                            {/* Service */}
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
                          
                          {/* Right Section - Hold Time */}
                          <div className="flex flex-row sm:flex-row items-center justify-end space-x-1 sm:space-x-1 lg:space-x-2 mt-1 sm:mt-0">
                            {/* Hold Duration */}
                            <div className="text-center">
                              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Hold</div>
                              <div className="text-xs sm:text-xs lg:text-sm font-bold text-orange-600">
                                {holdDuration}m
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
                  <h4 className="text-xs sm:text-sm lg:text-sm font-bold uppercase tracking-wide flex items-center justify-center">
                    <UserGroupIcon className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1 text-orange-600" />
                    On Hold Queue Numbers
                    <span className="ml-2 text-xs text-gray-400 font-normal">
                      ({lastTableRefresh.toLocaleTimeString()})
                    </span>
                  </h4>
                </div>
                
                {onHoldQueues.length > 5 && (
                  <div className="text-center mt-1 text-slate-500 text-xs font-medium bg-orange-50 rounded-sm py-1 px-1 border border-orange-200">
                    And {onHoldQueues.length - 5} more on hold...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicDisplay;
