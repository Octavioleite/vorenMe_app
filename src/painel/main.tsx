import '@fontsource-variable/geist'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import './painel.css'
import { Painel } from './Painel'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Painel />
  </StrictMode>,
)
