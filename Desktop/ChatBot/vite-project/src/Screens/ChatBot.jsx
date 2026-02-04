import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, User, Bot, MessageSquare } from 'lucide-react';

// Use the VITE_ prefix for environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ChatBot = () => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([]);
    const [chatId, setChatId] = useState(localStorage.getItem('currentChatId') || null);
    const [loading, setLoading] = useState(false);
    const [chatList, setChatList] = useState([]);
    const scrollRef = useRef(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Fetch all chats on component mount
    useEffect(() => {
        fetchChatList();
    }, []);

    const fetchChatList = async () => {
        try {
            // Updated to production URL
            const res = await axios.get(`${API_BASE_URL}/api/get-all-chats`, { withCredentials: true });
            setChatList(res.data);
        } catch (err) {
            console.error("Error loading chat list:", err);
        }
    };

    const startNewChat = () => {
        setMessages([]);
        setChatId(null);
        localStorage.removeItem('currentChatId');
    };

    const loadChat = async (id) => {
        setLoading(true);
        try {
            // Updated to production URL
            const res = await axios.get(`${API_BASE_URL}/api/chat/${id}`, { withCredentials: true });
            setMessages(res.data.messages);
            setChatId(id);
            localStorage.setItem('currentChatId', id);
        } catch (err) {
            alert("Could not load that chat");
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const currentInput = input;
        
        // Optimistically add user message for better UI feel
        setMessages((prev) => [...prev, { role: 'user', content: currentInput }]);
        setInput('');
        setLoading(true);

        try {
            // Updated to production URL
            const response = await axios.post(`${API_BASE_URL}/api/chat`, {
                question: currentInput,
                chatId: chatId
            }, { withCredentials: true });

            const { chatId: newChatId, history } = response.data;

            // Update chat ID if it's a new conversation
            if (newChatId !== chatId) {
                setChatId(newChatId);
                localStorage.setItem('currentChatId', newChatId);
            }
            
            // Re-sync messages with server history
            setMessages(history);
            
            // Refresh sidebar list
            fetchChatList();
            
        } catch (error) {
            console.error("Chat error:", error);
            setMessages((prev) => [
                ...prev, 
                { role: 'assistant', content: "Sorry, I'm having trouble connecting to the server. Please check your connection." }
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', height: '100vh', backgroundColor: '#0f172a' }}>
            {/* Sidebar Area */}
            <div style={{ 
                width: '260px', 
                backgroundColor: '#1e293b', 
                color: 'white', 
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                borderRight: '1px solid #334155'
            }}>
                <button 
                    onClick={startNewChat} 
                    style={{ 
                        width: '100%', 
                        padding: '12px', 
                        marginBottom: '20px',
                        backgroundColor: '#2563eb',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                >
                    + New Chat
                </button>
                
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '15px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Chat History
                    </p>
                    {chatList.length === 0 && (
                        <p style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>No chats yet</p>
                    )}
                    {chatList.map((chat) => (
                        <div 
                            key={chat._id} 
                            onClick={() => loadChat(chat._id)}
                            style={{ 
                                padding: '10px 12px', 
                                cursor: 'pointer', 
                                borderRadius: '6px', 
                                backgroundColor: chatId === chat._id ? '#334155' : 'transparent',
                                marginBottom: '4px',
                                fontSize: '13px',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'all 0.2s',
                                border: chatId === chat._id ? '1px solid #475569' : '1px solid transparent'
                            }}
                        >
                            <MessageSquare size={14} style={{ marginRight: '10px', flexShrink: 0, color: '#94a3b8' }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {chat.messages[0]?.content || "Empty Chat"}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Chat Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#0f172a' }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 0' }}>
                    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px' }}>
                        {messages.length === 0 && !loading && (
                            <div style={{ textAlign: 'center', marginTop: '15vh', color: '#94a3b8' }}>
                                <div style={{ display: 'inline-flex', padding: '15px', backgroundColor: '#1e293b', borderRadius: '20px', marginBottom: '20px' }}>
                                    <Bot size={48} color="#3b82f6" />
                                </div>
                                <h2 style={{ fontSize: '28px', color: '#f8fafc', marginBottom: '10px' }}>MahaEduBot</h2>
                                <p style={{ fontSize: '16px' }}>Your AI assistant for Maharashtra Engineering admissions.</p>
                            </div>
                        )}
                        
                        {messages.map((msg, index) => (
                            <div 
                                key={index} 
                                style={{ 
                                    display: 'flex', 
                                    gap: '15px', 
                                    marginBottom: '24px', 
                                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                                }}
                            >
                                {msg.role === 'assistant' && (
                                    <div style={{ backgroundColor: '#2563eb', padding: '8px', borderRadius: '10px', height: '36px', minWidth: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Bot size={20} color="white" />
                                    </div>
                                )}
                                <div style={{ 
                                    maxWidth: '80%', 
                                    padding: '12px 18px', 
                                    borderRadius: '15px', 
                                    backgroundColor: msg.role === 'user' ? '#2563eb' : '#1e293b', 
                                    color: '#f8fafc', 
                                    fontSize: '15px',
                                    lineHeight: '1.6',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                    whiteSpace: 'pre-wrap'
                                }}>
                                    {msg.content}
                                </div>
                                {msg.role === 'user' && (
                                    <div style={{ backgroundColor: '#475569', padding: '8px', borderRadius: '10px', height: '36px', minWidth: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <User size={20} color="white" />
                                    </div>
                                )}
                            </div>
                        ))}
                        {loading && (
                            <div style={{ color: '#94a3b8', fontSize: '14px', marginLeft: '50px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div className="typing-dots">Thinking...</div>
                            </div>
                        )}
                        <div ref={scrollRef} />
                    </div>
                </div>

                {/* Input Area */}
                <div style={{ padding: '24px', borderTop: '1px solid #1e293b' }}>
                    <form onSubmit={handleSendMessage} style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', gap: '12px' }}>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about MHT-CET, eligibility, or college cutoffs..."
                            disabled={loading}
                            style={{ 
                                flex: 1, 
                                padding: '14px 18px', 
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155', 
                                borderRadius: '12px', 
                                color: 'white',
                                outline: 'none',
                                fontSize: '15px'
                            }}
                        />
                        <button 
                            type="submit" 
                            disabled={loading || !input.trim()} 
                            style={{ 
                                backgroundColor: loading || !input.trim() ? '#334155' : '#2563eb', 
                                color: 'white', 
                                border: 'none', 
                                padding: '0 24px', 
                                borderRadius: '12px', 
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Send size={20} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ChatBot;