import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter, Routes, Route} from 'react-router-dom';
import App from './App.tsx';
import {AdminApp} from './admin/AdminApp.tsx';
import {AuthProvider} from './components/AuthContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="/*" element={<App />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
