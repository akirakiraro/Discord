import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Elemento #root não encontrado em index.html; esperado <div id="root">')
}

// Sem StrictMode: a montagem dupla dele desconecta o LiveKitRoom e dispara onDisconnected na entrada.
createRoot(rootElement).render(<App />)
