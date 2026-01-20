
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// Đảm bảo process.env tồn tại trước khi React render
if (!(window as any).process) {
  (window as any).process = { env: { API_KEY: "" } };
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
