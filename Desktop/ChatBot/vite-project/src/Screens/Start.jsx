import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatHistory from './ChatHistory';
import { Send, LogOut, LogIn, UserPlus, Sparkles } from 'lucide-react';

// Use the VITE_ prefix for environment variables in Vite
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Start() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('username');
    if (savedUser) {
      setUsername(savedUser);
    }
  }, []);

  const handleLogin = () => navigate('/login');
  const handleRegister = () => navigate('/register');

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/logout`, {
        method: 'GET',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout request failed:', err);
    }
    localStorage.removeItem('username');
    setUsername('');
    navigate('/login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsLoading(true);
    setResponse(''); // Clear previous response
    
    try {
      // Changed 'query' to 'question' to match your server.js
      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query }), 
      });

      const data = await res.json();
      
      if (res.ok) {
        // Your server.js returns { reply: "..." }
        setResponse(data.reply || "No response received.");
      } else {
        setResponse(data.error || "Something went wrong.");
      }
    } catch (err) {
      console.error('Error communicating with backend:', err);
      setResponse('Server error. Please ensure the backend is running.');
    } finally {
      setIsLoading(false);
      setQuery(''); // Optional: clear input after send
    }
  };

  return (
    <div className='bg-gradient-to-br from-slate-900 via-zinc-900 to-slate-900 w-full h-screen text-white flex overflow-hidden'>
      {/* Sidebar */}
      <div className='border-r border-slate-800/50 backdrop-blur-sm'>
        <ChatHistory />
      </div>

      {/* Main Content */}
      <div className='flex flex-col flex-1 relative'>
        <div className='absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none' />
        
        {/* Header */}
        <div className='relative z-10 flex justify-between items-center px-10 py-6 border-b border-slate-800/50 backdrop-blur-sm bg-slate-900/30'>
          <div className='flex items-center space-x-3'>
            <div className='w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center'>
              <Sparkles className='w-5 h-5' />
            </div>
            <h1 className='text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent'>
              AI Assistant
            </h1>
          </div>

          <div className='flex items-center space-x-4'>
            {username ? (
              <>
                <div className='flex items-center space-x-3 bg-slate-800/50 backdrop-blur-sm rounded-full px-5 py-2 border border-slate-700/50'>
                  <div className='w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-semibold'>
                    {username.charAt(0).toUpperCase()}
                  </div>
                  <span className='text-sm font-medium'>{username}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className='flex items-center space-x-2 px-5 py-2 rounded-full border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition-all duration-300 hover:border-red-500/50'
                >
                  <LogOut className='w-4 h-4' />
                  <span className='text-sm font-medium'>Logout</span>
                </button>
              </>
            ) : (
              <>
                <button onClick={handleLogin} className='flex items-center space-x-2 px-5 py-2 rounded-full border border-slate-700 bg-slate-800/50 hover:bg-slate-800 transition-all duration-300 hover:border-slate-600'>
                  <LogIn className='w-4 h-4' />
                  <span className='text-sm font-medium'>Login</span>
                </button>
                <button onClick={handleRegister} className='flex items-center space-x-2 px-5 py-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all duration-300 shadow-lg shadow-blue-500/20'>
                  <UserPlus className='w-4 h-4' />
                  <span className='text-sm font-medium'>Sign Up</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className='relative z-10 flex-1 flex flex-col items-center justify-center px-10 py-10 overflow-y-auto'>
          {!response && !isLoading && (
            <div className='text-center mb-12 animate-fade-in'>
              <div className='w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-blue-500/30 flex items-center justify-center'>
                <Sparkles className='w-10 h-10 text-blue-400' />
              </div>
              <h2 className='text-4xl font-bold mb-3 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent'>
                How can I help you today?
              </h2>
              <p className='text-slate-400 text-lg'>Ask me anything and I'll do my best to assist you</p>
            </div>
          )}

          {response && (
            <div className='w-full max-w-3xl mb-8 animate-fade-in'>
              <div className='bg-gradient-to-br from-slate-800/50 to-slate-800/30 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-2xl'>
                <div className='flex items-start space-x-3 mb-3'>
                  <div className='w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0'>
                    <Sparkles className='w-4 h-4' />
                  </div>
                  <h3 className='font-semibold text-lg text-blue-400'>AI Response</h3>
                </div>
                <p className='text-slate-200 leading-relaxed pl-11 whitespace-pre-wrap'>{response}</p>
              </div>
            </div>
          )}

          {isLoading && (
            <div className='flex items-center space-x-3 text-slate-400 animate-pulse'>
              <div className='w-2 h-2 bg-blue-500 rounded-full animate-bounce' style={{ animationDelay: '0ms' }} />
              <div className='w-2 h-2 bg-purple-500 rounded-full animate-bounce' style={{ animationDelay: '150ms' }} />
              <div className='w-2 h-2 bg-pink-500 rounded-full animate-bounce' style={{ animationDelay: '300ms' }} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className='relative z-10 px-10 py-6 border-t border-slate-800/50 backdrop-blur-sm bg-slate-900/30'>
          <form onSubmit={handleSubmit} className='max-w-3xl mx-auto'>
            <div className='relative flex items-center'>
              <input
                type='text'
                className='w-full h-14 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl text-white px-6 pr-14 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300'
                placeholder='Type your message here...'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isLoading}
              />
              <button
                type='submit'
                disabled={isLoading || !query.trim()}
                className='absolute right-2 w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center hover:from-blue-500 hover:to-purple-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20'
              >
                <Send className='w-5 h-5' />
              </button>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
      `}</style>
    </div>
  );
}