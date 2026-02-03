import { useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Start from './Screens/Start'
import Login from './Screens/Login'
import Register from './Screens/Register'
import EditDatabase from './Screens/EditDatabase'
import ChatBot from './Screens/ChatBot' // Assuming this is where the new JSX is

function App() {
  return (
    <BrowserRouter>
      {/* Simple Navigation Bar */}
      <nav style={{ 
        padding: '10px 20px', 
        background: '#fff', 
        borderBottom: '1px solid #ddd', 
        display: 'flex', 
        gap: '20px',
        alignItems: 'center' 
      }}>
        <Link to="/" style={{ textDecoration: 'none', color: '#2563eb', fontWeight: 'bold' }}>Home</Link>
        <Link to="/chat" style={{ textDecoration: 'none', color: '#4b5563' }}>Chat Bot</Link>
        <Link to="/edit" style={{ textDecoration: 'none', color: '#4b5563' }}>Admin (Edit DB)</Link>
      </nav>

      <Routes>
        {/* Landing Page */}
        <Route path='/' element={<Start/>}/>
        
        {/* The New Chat Interface */}
        <Route path='/chat' element={<ChatBot/>}/>
        
        {/* The Vector DB Editor */}
        <Route path='/edit' element={<EditDatabase/>}/>
        
        {/* Auth Routes */}
        <Route path='/login' element={<Login/>}/>
        <Route path='/register' element={<Register/>}/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;