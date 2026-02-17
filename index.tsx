import React from 'react';
import './index.css';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/src/context/ThemeContext';
import { ThemeToggle } from '@/src/components/ThemeToggle';
import App from './App';

const queryClient = new QueryClient();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <App />
        <ThemeToggle />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);