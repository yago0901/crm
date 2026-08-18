import React from "react";
import ReactDOM from "react-dom/client";

import { BrowserRouter } from "react-router-dom";

import "./reset.scss";
import "./styles/tokens.scss";
import Router from './routes/Routes.tsx';


import { AuthProvider } from './contexts/auth';
import { ToastProvider } from './components/common/Toast';

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Router />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  </React.StrictMode>
);
