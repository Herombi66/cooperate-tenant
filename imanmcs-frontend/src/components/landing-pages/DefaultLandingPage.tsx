import React from 'react';
import { HomePage } from '../../pages/HomePage';

// Must be a default export so React.lazy can resolve it dynamically
export default function DefaultLandingPage() {
  return <HomePage />;
}
