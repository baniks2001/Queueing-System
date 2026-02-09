import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TicketIcon, 
  UserGroupIcon, 
  CogIcon, 
  EyeIcon, 
  PrinterIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';





const PublicKiosk: React.FC = () => {
  const [selectedTransaction, setSelectedTransaction] = useState<string>('');
  const [selectedPersonType, setSelectedPersonType] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQueue, setGeneratedQueue] = useState<any>(null);
  const [kioskStatus, setKioskStatus] = useState<{ isOpen: boolean; title: string; message?: string; status?: string } | null>(null);
  const [transactionFlows, setTransactionFlows] = useState<any[]>([]);
  const [personTypes, setPersonTypes] = useState<any[]>([]);
  const navigate = useNavigate();

  // Test navigation on component mount
  React.useEffect(() => {
    console.log('PublicKiosk component mounted, navigation available:', typeof navigate);
  }, []);


  // Helper function to get API URL
  const getApiUrl = (endpoint: string) => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${baseUrl}${endpoint}`;
  };

  // Fetch transaction flows from backend
  const fetchTransactionFlows = async () => {
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
  };

  // Fetch person types from backend
  const fetchPersonTypes = async () => {
    try {
      const response = await fetch(getApiUrl('/api/admin/person-types/public'));
      if (response.ok) {
        const data = await response.json();
        console.log('Person types from API:', data);
        setPersonTypes(Array.isArray(data) ? data.filter((type: any) => type.isActive) : []);
      } else {
        console.error('Failed to fetch person types:', response.statusText);
        setPersonTypes([]);
      }
    } catch (error) {
      console.error('Error fetching person types:', error);
      setPersonTypes([]);
    }
  };

  // Fetch kiosk status from backend
  const fetchKioskStatus = async () => {
    try {
      const response = await fetch(getApiUrl('/api/kiosk/status'));
      if (response.ok) {
        const data = await response.json();
        console.log('Kiosk status from API:', data);
        setKioskStatus({
          isOpen: data.isOpen,
          title: data.title,
          message: data.message,
          status: data.status
        });
      }
    } catch (error) {
      console.error('Error fetching kiosk status:', error);
      // Set default status if API fails
      setKioskStatus({ isOpen: false, title: 'Queue Management System', status: 'closed' });
    }
  };

  useEffect(() => {
    fetchTransactionFlows();
    fetchPersonTypes();
    fetchKioskStatus();
    
    // Set up periodic status check every 30 seconds
    const interval = setInterval(fetchKioskStatus, 30000);
    
    return () => clearInterval(interval);
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

  const printQueue = (queue: any) => {
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
      {/* Modern Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-3 sm:py-4 space-y-3 sm:space-y-0">
            {/* System Title */}
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-2 sm:p-3 rounded-xl">
                <TicketIcon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {kioskStatus?.title || 'Queue Management System'}
                </h1>
                {kioskStatus && (
                  <div className="flex items-center mt-1 sm:mt-2">
                    {kioskStatus.status === 'open' ? (
                      <div className="flex items-center text-green-600">
                        <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                        <span className="text-xs sm:text-sm font-medium">Open</span>
                      </div>
                    ) : kioskStatus.status === 'standby' ? (
                      <div className="flex items-center text-yellow-600">
                        <ClockIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                        <span className="text-xs sm:text-sm font-medium">Standby</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-red-600">
                        <XMarkIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                        <span className="text-xs sm:text-sm font-medium">Closed</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions Dropdown */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  console.log('View Queue Display button clicked, navigating to /display');
                  navigate('/display');
                }}
                className="flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 text-sm"
              >
                <EyeIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 mr-2" />
                <span>View Display</span>
              </button>
              <button
                onClick={() => {
                  console.log('Admin Login button clicked, navigating to /admin/login');
                  navigate('/admin/login');
                }}
                className="flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 text-sm"
              >
                <CogIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 mr-2" />
                <span>Admin Login</span>
              </button>
              <button
                onClick={() => {
                  console.log('Window Login button clicked, navigating to /window/login');
                  navigate('/window/login');
                }}
                className="flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 text-sm"
              >
                <UserGroupIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 mr-2" />
                <span>Window Login</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Kiosk Status Message */}
      {kioskStatus && !kioskStatus.isOpen && (
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
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
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
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
                      onClick={() => setSelectedTransaction(transaction.name)}
                      className={`group relative p-4 sm:p-6 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                        selectedTransaction === transaction.name
                          ? 'border-blue-500 bg-blue-50 shadow-xl ring-2 ring-blue-500 ring-opacity-50'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'
                      }`}
                    >
                      <div className="text-center">
                        <div className={`text-3xl sm:text-4xl font-bold mb-2 transition-colors duration-300 ${
                          selectedTransaction === transaction.name ? 'text-blue-600' : 'text-gray-700'
                        }`}>
                          {transaction.prefix}
                        </div>
                        <h3 className={`text-base sm:text-lg font-semibold transition-colors duration-300 ${
                          selectedTransaction === transaction.name ? 'text-blue-600' : 'text-gray-900'
                        }`}>{transaction.name}</h3>
                        {transaction.description && (
                          <p className="text-xs sm:text-sm text-gray-600 mt-2">{transaction.description}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Person Type Selection */}
            <div>
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
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
                      onClick={() => setSelectedPersonType(type.name)}
                      className={`group relative p-3 sm:p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                        selectedPersonType === type.name
                          ? 'border-blue-500 bg-blue-50 shadow-xl ring-2 ring-blue-500 ring-opacity-50'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'
                      }`}
                      style={{
                        borderColor: selectedPersonType === type.name ? type.color : undefined,
                        backgroundColor: selectedPersonType === type.name ? `${type.color}10` : undefined
                      }}
                    >
                      <div 
                        className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2 rounded-full border-2 border-gray-300"
                        style={{ backgroundColor: type.color }}
                      />
                      <div className={`text-xs sm:text-sm font-medium text-center transition-colors duration-300 ${
                        selectedPersonType === type.name ? 'text-blue-700' : 'text-gray-900'
                      }`}>{type.name}</div>
                      {type.description && (
                        <div className="text-xs text-gray-500 text-center mt-1 hidden sm:block">{type.description}</div>
                      )}
                      {type.priority && (
                        <div className={`text-xs text-center mt-1 font-medium ${
                          type.priority === 'High' ? 'text-red-600' : 'text-blue-600'
                        }`}>
                          {type.priority}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Generate Queue Button */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
                <button
                  onClick={handleGenerateQueue}
                  disabled={!selectedTransaction || isGenerating}
                  className="w-full py-4 sm:py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100 font-semibold text-base sm:text-lg shadow-lg"
                >
                  {isGenerating ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-white mr-3"></div>
                      Generating Queue Number...
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-600">Selected:</span>
                      <span className="font-medium text-gray-900">{selectedTransaction || 'None'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium text-gray-900">{selectedPersonType}</span>
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
      <div className="text-center py-4 text-gray-500 text-sm">
        Developed by: Servando S. Tio III
      </div>
    </div>
  );
};

export default PublicKiosk;
