import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import i18n from './i18n/config'
import { isSingleDentistRole } from './lib/singleDentistRole'
import App from './App.tsx'

if (isSingleDentistRole(localStorage.getItem('role'))) void i18n.changeLanguage('en')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
