import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Simple Error Boundary to prevent blank screen
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("App crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          backgroundColor: '#111827',
          color: '#fff',
          fontFamily: 'system-ui',
          minHeight: '100vh'
        }}>
          <h1 style={{ color: '#ef4444' }}>Something went wrong</h1>
          <p>The app failed to load. This is usually caused by missing environment variables.</p>
          
          <div style={{ 
            backgroundColor: '#1f2937', 
            padding: '20px', 
            borderRadius: '8px',
            marginTop: '20px',
            fontSize: '14px'
          }}>
            <strong>Common fixes:</strong>
            <ul style={{ marginTop: '10px' }}>
              <li>Make sure all <code>VITE_FIREBASE_*</code> and <code>VITE_SUPABASE_*</code> variables are set on Vercel</li>
              <li>Redeploy after adding environment variables</li>
              <li>Check browser console (F12) for detailed errors</li>
            </ul>
          </div>

          {this.state.error && (
            <details style={{ marginTop: '20px' }}>
              <summary style={{ cursor: 'pointer', color: '#94a3b8' }}>Technical Error Details</summary>
              <pre style={{ 
                backgroundColor: '#000', 
                padding: '15px', 
                borderRadius: '6px',
                overflow: 'auto',
                fontSize: '12px',
                marginTop: '10px'
              }}>
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// @ts-ignore - React is available via JSX
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
