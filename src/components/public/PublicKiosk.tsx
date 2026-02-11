import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TicketIcon, 
  UserGroupIcon, 
  CogIcon, 
  EyeIcon, 
  PrinterIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

interface TransactionFlow {
  _id: string;
  name: string;
  prefix: string;
  description?: string;
  color?: string;
  steps: Array<{ id: string; stepNumber: number; stepName: string; windowNumber: number; description: string; isActive: boolean }>;
  isActive: boolean;
}

interface PersonType {
  _id: string;
  name: string;
  color?: string;
  isActive: boolean;
}

const PublicKiosk: React.FC = () => {
  const [selectedTransaction, setSelectedTransaction] = useState('');
  const [selectedPersonType, setSelectedPersonType] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQueue, setGeneratedQueue] = useState<{
    _id: string;
    queueNumber: string;
    personType: string;
    service: string;
    status: string;
    createdAt: string;
  } | null>(null);
  const [kioskStatus, setKioskStatus] = useState<{ isOpen: boolean; title: string; message?: string; status?: string; governmentOfficeName?: string; logo?: string } | null>(null);
  const [transactionFlows, setTransactionFlows] = useState<TransactionFlow[]>([]);
  const [personTypes, setPersonTypes] = useState<PersonType[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [forceUpdate, setForceUpdate] = useState(0);
  const navigate = useNavigate();

  // Test navigation on component mount
  React.useEffect(() => {
    console.log('PublicKiosk component mounted, navigation available:', typeof navigate);
  }, [navigate]);


  // Helper function to get API URL
  const getApiUrl = (endpoint: string) => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${baseUrl}${endpoint}`;
  };

  // Helper function to get upload URL
  const getUploadUrl = (filename: string) => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${baseUrl}/uploads/${filename}`;
  };

  // Fetch transaction flows from backend
  const fetchTransactionFlows = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl('/api/transaction-flows/public'));
      if (response.ok) {
        const apiResponse = await response.json();
        console.log('Transaction flows from API:', apiResponse);
        setTransactionFlows(Array.isArray(apiResponse.data) ? apiResponse.data : []);
      } else {
        console.error('Failed to fetch transaction flows:', response.statusText);
        setTransactionFlows([]);
      }
    } catch (error) {
      console.error('Error fetching transaction flows:', error);
      setTransactionFlows([]);
    }
  }, []);

  // Fetch person types from backend
  const fetchPersonTypes = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl('/api/admin/person-types/public'));
      if (response.ok) {
        const data = await response.json();
        console.log('Person types from API:', data);
        setPersonTypes(Array.isArray(data) ? data.filter((type: { isActive: boolean }) => type.isActive) : []);
      } else {
        console.error('Failed to fetch person types:', response.statusText);
        setPersonTypes([]);
      }
    } catch (error) {
      console.error('Error fetching person types:', error);
      setPersonTypes([]);
    }
  }, []);

  // Fetch kiosk status from backend
  const fetchKioskStatus = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl('/api/kiosk/status'));
      if (response.ok) {
        const data = await response.json();
        console.log('Kiosk status from API:', data);
        setKioskStatus({
          isOpen: data.isOpen,
          title: data.title,
          governmentOfficeName: data.governmentOfficeName,
          logo: data.logo,
          message: data.message,
          status: data.status
        });
      }
    } catch (error) {
      console.error('Error fetching kiosk status:', error);
      // Set default status if API fails
      setKioskStatus({ isOpen: false, title: 'Queue Management System', governmentOfficeName: 'Government Office', logo: undefined, status: 'closed' });
    }
  }, []);

  useEffect(() => {
    fetchTransactionFlows();
    fetchPersonTypes();
    fetchKioskStatus();
    
    // Set up periodic status check every 30 seconds
    const interval = setInterval(fetchKioskStatus, 30000);
    
    // Set up timer for current time
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    
    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
    };
  }, [fetchKioskStatus, fetchPersonTypes, fetchTransactionFlows]);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setTimeout(() => {
        setCooldownRemaining(prev => {
          const newValue = prev - 1;
          console.log('Cooldown tick:', newValue);
          
          // Force a complete re-render when cooldown reaches 0
          if (newValue === 0) {
            setForceUpdate(prev => prev + 1);
            console.log('Cooldown ended, forcing re-render');
          }
          
          return newValue;
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownRemaining]);

  // Cleanup cooldown on component unmount
  useEffect(() => {
    return () => {
      setCooldownRemaining(0);
    };
  }, []);

  const handleGenerateQueue = async () => {
    if (!selectedTransaction) {
      alert('Please select a transaction type');
      return;
    }

    setIsGenerating(true);
    try {
      // Call backend API to generate queue
      const response = await fetch(getApiUrl('/api/queue/generate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service: selectedTransaction,
          personType: selectedPersonType,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Queue generation response:', data);
        // Handle different response structures
        const queueData = data.queue || data; // Some APIs wrap in queue object
        console.log('Queue data:', queueData);
        setGeneratedQueue(queueData);
        // Start 5-second cooldown
        setCooldownRemaining(5);
        // Unselect transaction and person type after successful generation
        setSelectedTransaction('');
        setSelectedPersonType('');
      } else {
        console.error('Failed to generate queue:', response.statusText);
        alert('Failed to generate queue. Please try again.');
      }
    } catch (error) {
      console.error('Error generating queue:', error);
      alert('Error generating queue. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const printQueue = (queue: {
    _id: string;
    queueNumber: string;
    personType: string;
    service: string;
    status: string;
    createdAt: string;
  }) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Queue Number - ${queue.queueNumber}</title>
            <style>
              @page {
                margin: 0;
                size: A4;
              }
              body {
                font-family: 'Arial', sans-serif;
                margin: 0;
                padding: 0;
                background: white;
              }
              .queue-card { 
                position: absolute;
                top: 20px;
                left: 20px;
                width: 200px; /* Auto-fit width */
                height: 120px; /* Auto-fit height */
                border: 3px solid #1e40af; 
                border-radius: 12px; 
                padding: 15px; 
                text-align: center; 
                background: white;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
              }
              .queue-number { 
                font-size: 36px; 
                font-weight: 700; 
                color: #1e40af; 
                margin-bottom: 8px;
                letter-spacing: 2px;
                line-height: 1;
              }
              .service-info { 
                font-size: 14px; 
                color: #6b7280; 
                margin-bottom: 4px;
                line-height: 1;
              }
              .person-type { 
                font-size: 12px; 
                color: #9ca3af; 
                margin-bottom: 8px;
                line-height: 1;
              }
              .timestamp { 
                font-size: 10px; 
                color: #d1d5db; 
                margin-top: 4px;
                line-height: 1;
              }
              @media print {
                body {
                  margin: 0;
                  padding: 0;
                }
                .queue-card {
                  position: absolute;
                  top: 20px;
                  left: 20px;
                  margin: 0;
                  page-break-inside: avoid;
                  break-inside: avoid;
                }
              }
            </style>
          </head>
          <body>
            <div class="queue-card">
              <div class="queue-number">${queue.queueNumber}</div>
              <div class="service-info">${queue.service}</div>
              <div class="person-type">${queue.personType}</div>
              <div class="timestamp">${new Date().toLocaleString()}</div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Modern Header - Dark Blue */}
      <header className="bg-blue-800 shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-3 sm:py-4 space-y-3 sm:space-y-0">
            {/* System Title */}
            <div className="flex items-center space-x-3">
              {/* Logo */}
              {kioskStatus?.logo && (
                <img 
                  src={getUploadUrl(kioskStatus.logo!)} 
                  alt="Government Office Logo" 
                  className="h-12 w-12 sm:h-14 sm:w-14 object-contain"
                  onError={(e) => {
                    console.error('Logo failed to load in PublicKiosk:', getUploadUrl(kioskStatus.logo!));
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              
              {/* Government Office Name */}
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  {kioskStatus?.governmentOfficeName || 'Government Office'}
                </h1>
                {kioskStatus && (
                  <div className="flex items-center mt-1 sm:mt-2">
                    {kioskStatus.status === 'open' ? (
                      <div className="flex items-center text-green-300">
                        <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                        <span className="text-xs sm:text-sm font-medium">Open</span>
                      </div>
                    ) : kioskStatus.status === 'standby' ? (
                      <div className="flex items-center text-yellow-300">
                        <ClockIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                        <span className="text-xs sm:text-sm font-medium">Standby</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-red-300">
                        <XMarkIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                        <span className="text-xs sm:text-sm font-medium">Closed</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Date and Time */}
              <div className="flex items-center space-x-2 text-white">
                <ClockIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                <div className="text-right">
                  <div className="text-sm sm:text-base font-bold">
                    {currentTime.toLocaleTimeString()}
                  </div>
                  <div className="text-xs text-blue-100">
                    {currentTime.toLocaleDateString('en-US', {
                      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                    })}
                  </div>
                </div>
              </div>
              
              {/* Actions Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center px-3 py-2 sm:px-4 sm:py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg transition-all duration-200 text-sm"
                >
                  <CogIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  <ChevronDownIcon className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                </button>
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => { setIsDropdownOpen(false); navigate('/display'); }}
                      className="w-full text-left px-3 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <EyeIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-gray-500" />
                      View Display
                    </button>
                    <button
                      onClick={() => { setIsDropdownOpen(false); navigate('/admin/login'); }}
                      className="w-full text-left px-3 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <CogIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-gray-500" />
                      Admin Login
                    </button>
                    <button
                      onClick={() => { setIsDropdownOpen(false); navigate('/window/login'); }}
                      className="w-full text-left px-3 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <UserGroupIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-gray-500" />
                      Window Login
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Kiosk Status Message */}
      {kioskStatus && !kioskStatus.isOpen && (
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-300 p-8 text-center">
            <div className={`${kioskStatus.status === 'standby' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'} border rounded-xl p-6 mb-6`}>
              {kioskStatus.status === 'standby' ? (
                <>
                  <ClockIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold text-yellow-700 mb-2">Kiosk is Currently on Standby</h2>
                  <p className="text-lg text-gray-600">{kioskStatus.message || 'Kiosk is temporarily paused. Please check back later.'}</p>
                </>
              ) : (
                <>
                  <XMarkIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold text-red-700 mb-2">Kiosk is Currently Closed</h2>
                  <p className="text-lg text-gray-600">{kioskStatus.message || 'Please check back later during business hours.'}</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Only show when kiosk is open */}
      {kioskStatus && kioskStatus.isOpen && (
        <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            
            {/* Transaction Selection */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-300 p-4 sm:p-6">
                <div className="flex items-center mb-4 sm:mb-6">
                  <div className="bg-blue-100 p-2 sm:p-3 rounded-xl">
                    <TicketIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 ml-3 sm:ml-4">Select Transaction</h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {transactionFlows.map((transaction) => (
                    <button
                      key={transaction._id}
                      onClick={() => setSelectedTransaction(selectedTransaction === transaction.name ? '' : transaction.name)}
                      className={`group relative p-4 sm:p-6 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                        selectedTransaction === transaction.name
                          ? 'border-blue-500 bg-blue-50 shadow-xl ring-2 ring-blue-500 ring-opacity-50'
                          : 'border-gray-300 hover:border-gray-400 hover:shadow-lg'
                      }`}
                    >
                      <div className="text-center">
                        <div className={`text-4xl sm:text-5xl lg:text-6xl font-black mb-3 transition-colors duration-300 ${
                          selectedTransaction === transaction.name ? 'text-blue-600' : 'text-gray-800'
                        }`}>
                          {transaction.prefix}
                        </div>
                        <h3 className={`text-lg sm:text-xl font-bold transition-colors duration-300 mb-2 ${
                          selectedTransaction === transaction.name ? 'text-blue-600' : 'text-gray-900'
                        }`}>{transaction.name}</h3>
                        {transaction.description && (
                          <p className="text-sm text-gray-600 leading-relaxed">{transaction.description}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Person Type Selection */}
            <div>
              <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-300 p-4 sm:p-6">
                <div className="flex items-center mb-4 sm:mb-6">
                  <div className="bg-green-100 p-2 sm:p-3 rounded-xl">
                    <UserGroupIcon className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 ml-3 sm:ml-4">Select Person Type</h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                  {personTypes.map((type) => (
                    <button
                      key={type._id}
                      onClick={() => setSelectedPersonType(selectedPersonType === type.name ? '' : type.name)}
                      className={`group relative p-3 sm:p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                        selectedPersonType === type.name
                          ? 'border-blue-500 bg-blue-50 shadow-xl ring-2 ring-blue-500 ring-opacity-50'
                          : 'border-gray-300 hover:border-gray-400 hover:shadow-lg'
                      }`}
                      style={{
                        borderColor: selectedPersonType === type.name ? type.color : undefined,
                        backgroundColor: selectedPersonType === type.name ? `${type.color}10` : undefined
                      }}
                    >
                      <div 
                        className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-3 rounded-full border-2 border-gray-300"
                        style={{ backgroundColor: type.color }}
                      />
                      <div className={`text-sm sm:text-base font-bold text-center transition-colors duration-300 ${
                        selectedPersonType === type.name ? 'text-blue-700' : 'text-gray-900'
                      }`}>{type.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Generate Queue Button */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-300 p-4 sm:p-6">
                <button
                  onClick={handleGenerateQueue}
                  disabled={!selectedTransaction || isGenerating || cooldownRemaining > 0}
                  key={forceUpdate} // Force re-render when cooldown ends
                  className={`w-full py-4 sm:py-6 text-white rounded-xl transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100 font-semibold text-base sm:text-lg shadow-lg ${
                    !selectedTransaction || isGenerating || cooldownRemaining > 0
                      ? 'bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                  }`}
                >
                  {isGenerating ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-white mr-3"></div>
                      Generating Queue Number...
                    </div>
                  ) : cooldownRemaining > 0 ? (
                    <div className="flex items-center justify-center">
                      <ClockIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-3" />
                      Please wait {cooldownRemaining} second{cooldownRemaining !== 1 ? 's' : ''}...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <TicketIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-3" />
                      Generate Queue Number
                    </div>
                  )}
                </button>
                
                {/* Status Display */}
                <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-50 rounded-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-600">Selected:</span>
                      <span className="font-medium text-gray-900">{selectedTransaction || 'None'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium text-gray-900">{selectedPersonType}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-600">Cooldown:</span>
                      <span className="font-medium text-gray-900">{cooldownRemaining}s</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* Queue Modal */}
      {generatedQueue && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-auto animate-bounce-in">
            <div className="text-center p-6 sm:p-8">
              <div className="bg-green-100 p-3 sm:p-4 rounded-full w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 flex items-center justify-center">
                <CheckCircleIcon className="w-8 h-8 sm:w-12 sm:h-12 text-green-600" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Your Queue Number</h2>
              <div className="text-4xl sm:text-5xl font-bold text-blue-600 mb-3 sm:mb-4 font-mono">
                {generatedQueue.queueNumber}
              </div>
              <div className="bg-gray-50 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                <div className="text-base sm:text-lg text-gray-700 mb-2">Service: {generatedQueue.service}</div>
                <div className="text-sm sm:text-md text-gray-500 mb-3 sm:mb-4">Type: {generatedQueue.personType}</div>
                <div className="text-xs sm:text-sm text-gray-400 flex items-center justify-center">
                  <ClockIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  Please wait for your number to be called
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-3 sm:mt-6">
                <button
                  onClick={() => setGeneratedQueue(null)}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors duration-200 text-sm sm:text-base"
                >
                  Close
                </button>
                <button
                  onClick={() => printQueue(generatedQueue)}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center text-sm sm:text-base"
                >
                  <PrinterIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Footer */}
      <div className="text-center py-4 text-gray-700 text-sm font-medium bg-gray-100 border-t border-gray-200">
        All Rights Reserved 2026 Queue Management System<br/>
        Developer: Servando Tio III
      </div>
    </div>
  );
};

export default PublicKiosk;
