'use client';

import React, { useState, useEffect } from 'react';

const FrequentTopicText = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchReport() {
      try {
        setLoading(true);
        const res = await fetch('/api/openai', { 
          method: 'POST',
          headers: { "Accept": "application/json" }
        });
        
        if (!res.ok) {
          throw new Error(`Server responded with status: ${res.status}`);
        }
        
        const data = await res.json();
        setReport(data.report);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching report:', error);
        setError(error.message || 'Failed to load report data');
        setLoading(false);
      }
    }
    fetchReport();
  }, []);

  // Format JSON for better display
  const formatReport = (report) => {
    if (typeof report === 'object') {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4 font-mono text-sm overflow-auto max-h-96">
          <pre className="whitespace-pre-wrap break-words">
            {JSON.stringify(report, null, 2)}
          </pre>
        </div>
      );
    }
    
    // If text report, display with proper styling
    return (
      <div className="prose max-w-none">
        {report.split('\n').map((line, i) => (
          <p key={i} className="mb-2">{line}</p>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Loading report data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 my-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading report</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
            <div className="mt-4">
              <button
                onClick={() => window.location.reload()}
                className="bg-red-100 text-red-800 px-3 py-1 rounded-md text-sm font-medium hover:bg-red-200"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <p className="text-yellow-700">No report data available.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Report Results</h2>
      {formatReport(report)}
    </div>
  );
};

export default FrequentTopicText;