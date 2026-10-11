import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { director } from './director/Director';
import { frame, getUi, setUi } from './state';

// QA hook: drive the run from a test browser.
if (import.meta.env.DEV || location.search.includes('debug')) Object.assign(window, { __mv: { director, frame, getUi, setUi } });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
