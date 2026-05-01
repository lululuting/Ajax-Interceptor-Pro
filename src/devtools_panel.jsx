import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const tabIdParam = new URLSearchParams(window.location.search).get('tabId');
const parsedTabId = Number(tabIdParam);
const contextTabId = tabIdParam !== null && Number.isFinite(parsedTabId) ? parsedTabId : null;
const root = createRoot(document.getElementById('root'));
root.render(<App mode="devtools" contextTabId={contextTabId} />);
