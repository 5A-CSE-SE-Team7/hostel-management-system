import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './auth';
import './styles.css';
// Integrate genuine M1 pages when their PR is present; absent pages do not
// create placeholder registration or replace the functional shared shell.
const m1Pages = import.meta.glob(['./pages/Login.jsx', './pages/Register.jsx'], { eager: true });
const M1Login = m1Pages['./pages/Login.jsx']?.default;
const M1Register = m1Pages['./pages/Register.jsx']?.default;
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><BrowserRouter><AuthProvider><App loginPage={M1Login ? <M1Login /> : null} registrationPage={M1Register ? <M1Register /> : null} /></AuthProvider></BrowserRouter></React.StrictMode>);
