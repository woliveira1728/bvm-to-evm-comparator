import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

import { BvmToEvmComparator } from './contracts/bvmToEvmComparator';
import { MessageStorageSCrypt } from './contracts/MessageStorageSCrypt';
import artifactHelloWorld from './artifacts/bvmToEvmComparator.json';
import messageContract from './artifacts/MessageStorageSCrypt.json'

BvmToEvmComparator.loadArtifact(artifactHelloWorld);
MessageStorageSCrypt.loadArtifact(messageContract);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();