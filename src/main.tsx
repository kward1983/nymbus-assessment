import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { TransactionStoreProvider } from './context/TransactionStore';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <TransactionStoreProvider>
        <App />
      </TransactionStoreProvider>
    </HashRouter>
  </StrictMode>,
);
