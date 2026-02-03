import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, User, Bot, MessageSquare } from 'lucide-react';

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
            const res = await axios.get('/api/get-all-chats');
            setChatList(res.data);
        } catch (err) {
            console.error("Error loading chat list");
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
            const res = await axios.get(`/api/chat/${id}`);
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

        const userMessage = { role: 'user', content: input };
        const currentInput = input;
        
        // Optimistically add user message
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const response = await axios.post('/api/chat', {
                question: currentInput,
                chatId: chatId
            });

            const { chatId: newChatId, history } = response.data;

            // Update chat ID if it's a new chat
            if (newChatId !== chatId) {
                setChatId(newChatId);
                localStorage.setItem('currentChatId', newChatId);
            }
            
            // Set messages from server history (this replaces optimistic update)
            setMessages(history);
            
            // Refresh chat list to show updated sidebar
            fetchChatList();
            
        } catch (error) {
            console.error("Chat error:", error);
            // On error, add error message instead of replacing
            setMessages((prev) => [
                ...prev, 
                { role: 'assistant', content: "Sorry, I'm having trouble connecting. Please try again." }
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f3f4f6' }}>
            {/* Sidebar Area */}
            <div style={{ 
                width: '260px', 
                backgroundColor: '#1f2937', 
                color: 'white', 
                padding: '20px',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <button 
                    onClick={startNewChat} 
                    style={{ 
                        width: '100%', 
                        padding: '10px', 
                        marginBottom: '20px',
                        backgroundColor: '#2563eb',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                    }}
                >
                    + New Chat
                </button>
                
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px', fontWeight: '600' }}>
                        Chat History
                    </p>
                    {chatList.length === 0 && (
                        <p style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>
                            No chats yet
                        </p>
                    )}
                    {chatList.map((chat) => (
                        <div 
                            key={chat._id} 
                            onClick={() => loadChat(chat._id)}
                            style={{ 
                                padding: '10px', 
                                cursor: 'pointer', 
                                borderRadius: '5px', 
                                backgroundColor: chatId === chat._id ? '#374151' : 'transparent',
                                marginBottom: '5px',
                                fontSize: '14px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                if (chatId !== chat._id) {
                                    e.currentTarget.style.backgroundColor = '#374151';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (chatId !== chat._id) {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }
                            }}
                        >
                            <MessageSquare size={14} style={{ marginRight: '8px', flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {chat.messages[0]?.content || "Empty Chat"}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        {messages.length === 0 && (
                            <div style={{ textAlign: 'center', marginTop: '100px', color: '#6b7280' }}>
                                <h2 style={{ fontSize: '32px', marginBottom: '10px' }}>MahaEduBot</h2>
                                <p style={{ fontSize: '16px' }}>Ask me about B.Tech/M.Tech admissions in Maharashtra.</p>
                            </div>
                        )}
                        
                        {messages.map((msg, index) => (
                            <div 
                                key={index} 
                                style={{ 
                                    display: 'flex', 
                                    gap: '15px', 
                                    marginBottom: '20px', 
                                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                    alignItems: 'flex-start'
                                }}
                            >
                                {msg.role === 'assistant' && (
                                    <div style={{ 
                                        backgroundColor: '#2563eb', 
                                        padding: '8px', 
                                        borderRadius: '50%', 
                                        height: 'fit-content',
                                        minWidth: '36px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Bot size={20} color="white" />
                                    </div>
                                )}
                                <div style={{ 
                                    maxWidth: '70%', 
                                    padding: '12px 16px', 
                                    borderRadius: '12px', 
                                    backgroundColor: msg.role === 'user' ? '#2563eb' : 'white', 
                                    color: msg.role === 'user' ? 'white' : '#1f2937', 
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                    wordWrap: 'break-word',
                                    whiteSpace: 'pre-wrap'
                                }}>
                                    {msg.content}
                                </div>
                                {msg.role === 'user' && (
                                    <div style={{ 
                                        backgroundColor: '#6b7280', 
                                        padding: '8px', 
                                        borderRadius: '50%', 
                                        height: 'fit-content',
                                        minWidth: '36px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <User size={20} color="white" />
                                    </div>
                                )}
                            </div>
                        ))}
                        {loading && (
                            <div style={{ 
                                color: '#6b7280', 
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                marginLeft: '50px'
                            }}>
                                <div className="typing-indicator">
                                    <span>.</span><span>.</span><span>.</span>
                                </div>
                                Thinking...
                            </div>
                        )}
                        <div ref={scrollRef} />
                    </div>
                </div>

                {/* Input Area */}
                <div style={{ padding: '20px', backgroundColor: 'white', borderTop: '1px solid #e5e7eb' }}>
                    <form onSubmit={handleSendMessage} style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', gap: '10px' }}>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type your question here..."
                            disabled={loading}
                            style={{ 
                                flex: 1, 
                                padding: '12px', 
                                border: '1px solid #d1d5db', 
                                borderRadius: '8px', 
                                outline: 'none',
                                fontSize: '14px',
                                opacity: loading ? 0.6 : 1
                            }}
                        />
                        <button 
                            type="submit" 
                            disabled={loading || !input.trim()} 
                            style={{ 
                                backgroundColor: loading || !input.trim() ? '#9ca3af' : '#2563eb', 
                                color: 'white', 
                                border: 'none', 
                                padding: '10px 20px', 
                                borderRadius: '8px', 
                                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
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