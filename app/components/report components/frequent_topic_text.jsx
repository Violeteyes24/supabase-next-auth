'use client';

import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  IconButton, 
  Typography, 
  Box, 
  CircularProgress 
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const FrequentTopicText = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
        
        // Store data in global object for text reports
        if (typeof window !== 'undefined' && window.chartData) {
          window.chartData.frequentTopics = data.report;
        }
      } catch (error) {
        console.error('Error fetching report:', error);
        setError(error.message || 'Failed to load report data');
        setLoading(false);
      }
    }
    fetchReport();
  }, []);

  // Format JSON for better display
  const formatReport = (report, isTrimmed = false) => {
    if (typeof report === 'object') {
      const formattedJson = JSON.stringify(report, null, 2);
      const trimmedJson = formattedJson.length > 200 
        ? formattedJson.slice(0, 200) + '...' 
        : formattedJson;

      return (
        <Box 
          sx={{
            backgroundColor: 'grey.100',
            border: '1px solid',
            borderColor: 'grey.300',
            borderRadius: 1,
            p: 2,
            fontFamily: 'monospace',
            fontSize: 'small',
            maxHeight: 300,
            overflow: 'auto'
          }}
        >
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-words' }}>
            {isTrimmed ? trimmedJson : formattedJson}
          </pre>
        </Box>
      );
    }
    
    // If text report, display with proper styling
    const trimmedText = report.length > 200 
      ? report.slice(0, 200) + '...' 
      : report;

    return (
      <Box>
        {(isTrimmed ? trimmedText : report)
          .split('\n')
          .map((line, i) => (
            <Typography key={i} paragraph>
              {line}
            </Typography>
          ))
        }
      </Box>
    );
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={3}>
        <CircularProgress size={24} />
        <Typography ml={2} color="text.secondary">
          Loading report data...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box 
        sx={{
          backgroundColor: 'error.light',
          borderLeft: '4px solid',
          borderColor: 'error.main',
          p: 2,
          my: 2
        }}
      >
        <Typography color="error.dark" variant="h6">
          Error loading report
        </Typography>
        <Typography color="error.main" variant="body2">
          {error}
        </Typography>
        <Box mt={2}>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: 'rgba(255,0,0,0.1)',
              color: 'darkred',
              padding: '8px 12px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </Box>
      </Box>
    );
  }

  if (!report) {
    return (
      <Box 
        sx={{
          backgroundColor: 'warning.light',
          borderLeft: '4px solid',
          borderColor: 'warning.main',
          p: 2
        }}
      >
        <Typography color="warning.dark">
          No report data available.
        </Typography>
      </Box>
    );
  }

  return (
    <Box 
      sx={{
        backgroundColor: 'background.paper',
        boxShadow: 1,
        borderRadius: 2,
        p: 3
      }}
    >
      <Typography variant="h5" color="text.primary" gutterBottom>
        Report Results
      </Typography>
      
      {/* Trimmed View */}
      <Box 
        onClick={openModal} 
        sx={{
          cursor: (typeof report === 'object' || report.length > 200) 
            ? 'pointer' 
            : 'default',
          '&:hover': {
            textDecoration: (typeof report === 'object' || report.length > 200) 
              ? 'underline' 
              : 'none'
          }
        }}
      >
        {formatReport(report, true)}
      </Box>

      {/* Modal/Lightbox */}
      <Dialog 
        open={isModalOpen} 
        onClose={closeModal}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            Full Report
            <IconButton 
              onClick={closeModal}
              edge="end"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {formatReport(report)}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default FrequentTopicText;