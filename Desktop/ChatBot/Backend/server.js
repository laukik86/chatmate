require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const cors = require('cors');

// Models
const userModel = require('./User');
const Chat = require('./models/Chat'); // Using the Chat model we discussed earlier

const app = express();
const FLASK_URL = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
}));

// MongoDB Connection (Prevent duplicate connection attempts)
if (mongoose.connection.readyState === 0) {
    mongoose.connect(process.env.MONGO_URI)
        .then(() => console.log("✅ MongoDB Connected"))
        .catch(err => console.log("❌ DB Error:", err));
}

// --- AUTHENTICATION MIDDLEWARE ---
const isLoggedIn = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Please login" });
    try {
        const data = jwt.verify(token, "secretkey");
        req.user = data;
        next();
    } catch (err) {
        res.status(401).json({ error: "Invalid token" });
    }
};

// --- CHAT ROUTE (Consolidated) ---
app.post('/api/chat', async (req, res) => {
    const { question, chatId } = req.body;
    
    try {
        // 1. Find or Create Session
        let chat;
        if (chatId && mongoose.Types.ObjectId.isValid(chatId)) {
            chat = await Chat.findById(chatId);
        }
        
        if (!chat) {
            chat = new Chat({ messages: [], userId: req.cookies.token ? jwt.verify(req.cookies.token, "secretkey").userid : null });
        }

        // 2. Prepare History for Flask (Summary + last 6 messages)
        const history = [];
        if (chat.summary) {
            history.push({ role: "system", content: `Previous summary: ${chat.summary}` });
        }
        // Get the actual message objects for Flask
        const recentMessages = chat.messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
        history.push(...recentMessages);

        // 3. Call Flask for Answer
        const response = await axios.post(`${FLASK_URL}/chat`, {
            question: question,
            history: history
        });

        const aiReply = response.data.reply;

        // 4. Update MongoDB
        chat.messages.push({ role: 'user', content: question });
        chat.messages.push({ role: 'assistant', content: aiReply });

        // 5. Trigger Summarization (Every 10 messages)
        if (chat.messages.length % 10 === 0) {
            try {
                const summaryRes = await axios.post(`${FLASK_URL}/summarize`, {
                    messages: chat.messages
                });
                chat.summary = summaryRes.data.summary;
            } catch (sErr) {
                console.error("Summarization failed, but continuing...");
            }
        }

        await chat.save();

        res.json({
            reply: aiReply,
            chatId: chat._id,
            history: chat.messages
        });

    } catch (error) {
        console.error("Chat Error:", error.message);
        res.status(500).json({ error: "AI Service is down" });
    }
});

// --- RECORD EDITING ROUTES ---
app.post('/api/get-records', async (req, res) => {
    try {
        const response = await axios.post(`${FLASK_URL}/get-to-edit`, { query: req.body.query });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Failed to reach Flask" });
    }
});

app.post('/api/update-record', async (req, res) => {
    try {
        const response = await axios.post(`${FLASK_URL}/update-record`, req.body);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Update failed" });
    }
});

// --- AUTH ROUTES ---
app.post('/register', async (req, res) => {
    let { name, email, username, password } = req.body;
    let user = await userModel.findOne({ email });
    if (user) return res.status(400).send('User already exists');

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    
    const newUser = await userModel.create({ name, email, username, password: hash });
    let token = jwt.sign({ email: email, userid: newUser._id }, "secretkey");
    res.cookie("token", token);
    res.json({ success: true, userId: newUser._id });
});

app.post('/login', async (req, res) => {
    let { username, password } = req.body;
    let user = await userModel.findOne({ username });
    if (!user) return res.status(401).json({ success: false, message: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (match) {
        let token = jwt.sign({ username: username, userid: user._id }, "secretkey");
        res.cookie("token", token);
        res.json({ success: true, username: user.username });
    } else {
        res.status(401).json({ success: false, message: "Invalid credentials" });
    }
});
app.get('/api/chats', async (req, res) => {
    try {
        // Find chats and only return the ID and the first message as a "title"
        const chats = await Chat.find({}, { _id: 1, messages: { $slice: 1 }, updatedAt: 1 })
                                .sort({ updatedAt: -1 });
        res.json(chats);
    } catch (error) {
        res.status(500).json({ error: "Could not fetch chats" });
    }
});
app.get('/api/get-all-chats', async (req, res) => {
    try {
        // Fetch chats, getting the ID and only the first message to use as a title
        const chats = await Chat.find({}, { _id: 1, messages: { $slice: 1 }, updatedAt: 1 })
                                .sort({ updatedAt: -1 });
        res.json(chats);
    } catch (error) {
        console.error("Fetch Chats Error:", error);
        res.status(500).json({ error: "Could not fetch chats" });
    }
});

// Also ensure you have a route to fetch ONE specific chat when clicked
app.get('/api/chat/:id', async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id);
        if (!chat) return res.status(404).json({ error: "Chat not found" });
        res.json(chat);
    } catch (error) {
        res.status(500).json({ error: "Error loading chat" });
    }
});

app.listen(5000, () => console.log("🚀 Node Server running on port 5000"));