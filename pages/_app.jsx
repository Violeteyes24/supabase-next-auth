import React from 'react';
import App from 'next/app';
import ErrorBoundary from '../components/ErrorBoundary';

class MyApp extends App {
  render() {
    const { Component, pageProps } = this.props;
    return (
      <ErrorBoundary>
        <Component {...pageProps} />
      </ErrorBoundary>
    );
  }
}

export default MyApp;
