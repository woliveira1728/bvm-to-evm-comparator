import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import "./styles/reset.scss";
import { BrowserRouter } from "react-router-dom";
import reportWebVitals from './reportWebVitals';
import { MessageStorageSCrypt } from './contracts/MessageStorageSCrypt';
import messageContract from './artifacts/MessageStorageSCrypt.json'
import { CounterSCrypt } from './contracts/CounterSCrypt';
import counterContract from './artifacts/CounterSCrypt.json'

MessageStorageSCrypt.loadArtifact(messageContract);
CounterSCrypt.loadArtifact(counterContract);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();