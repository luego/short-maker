import { createRoot } from 'react-dom/client'
import AppShell from './AppShell'
import './index.css' // path to global css

const root = createRoot(document.getElementById('root')!)
root.render(<AppShell />)
