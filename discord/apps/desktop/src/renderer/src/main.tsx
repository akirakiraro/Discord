import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/base.css'
import './styles/auth.css'
import './styles/shell.css'
import './styles/chat.css'
import './styles/voice.css'
import './styles/members.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Elemento #root não encontrado em index.html; esperado <div id="root">')
}

createRoot(rootElement).render(<App />)
