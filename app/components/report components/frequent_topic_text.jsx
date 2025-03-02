'use client';

import React, { useState, useEffect } from 'react';

const FrequentTopicText = () => {
  const [report, setReport] = useState(null);

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch('/api/openai', { 
          method: 'POST',
          headers: { "Accept": "application/json" } // Explicitly expect JSON
        });
        const data = await res.json();
        setReport(data.report);
      } catch (error) {
        console.error('Error fetching report:', error);
      }
    }
    fetchReport();
  }, []);

  if (!report) return <p>Loading...</p>;
  return <p>{typeof report === 'object' ? JSON.stringify(report) : report}</p>;
};

export default FrequentTopicText;
