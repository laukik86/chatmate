const mongoose = require('mongoose');

// Schema for individual messages within a chat
const MessageSchema = new mongoose.Schema({
    role: { 
        type: String, 
        enum: ['user', 'assistant'], 
        required: true 
    },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

// Schema for a Chat Session
const ChatSchema = new mongoose.Schema({
    userId: { type: String, default: "guest_user" }, // Useful for future auth
    title: { type: String, default: "New Conversation" },
    messages: [MessageSchema], // Array of messages
}, { timestamps: true });

module.exports = mongoose.model('Chat', ChatSchema);