const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    role:{
        type: String,
        enum: ['user', 'assistant'],
        required: true,
    },
    content:String,
}, { timestamps: true });

const chatSessionSchema = new mongoose.Schema({
    userId:{
        type: String,
        ref: 'User',
        required: false,
    },
    summary: {
        type: String,
        default: "",    
    }
}, { timestamps: true });

module.exports = mongoose.model('ChatSession', chatSessionSchema);