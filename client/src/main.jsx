/**
 * Main Entry Point for the React Application
 * 
 */
import 'bootstrap/dist/css/bootstrap.min.css';
import { createRoot } from 'react-dom/client'
import './assets/index.css'
import App from './App.jsx'
// Import context providers for global state management
import { UserProvider } from "./context/UserContext";

// Render the application with context providers
// UserProvider - Manages user authentication state
createRoot(document.getElementById('root')).render(
  
    <UserProvider>
      <App />
    </UserProvider>
)