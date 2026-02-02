import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import AppRoutes from './app/routes/AppRoutes'
import './index.css'

import { HelmetProvider } from 'react-helmet-async'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <AuthProvider>
            <HelmetProvider>
                <BrowserRouter>
                    <AppRoutes />
                </BrowserRouter>
            </HelmetProvider>
        </AuthProvider>
    </React.StrictMode>,
)
