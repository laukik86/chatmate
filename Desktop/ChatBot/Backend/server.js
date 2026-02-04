require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

// Models
const userModel = require('./user');
const Chat = require('./models/Chat'); 

const app = express();

// --- CONFIGURATION ---
// 1. Render assigns a port for THIS Node app to run on
const PORT = process.env.PORT || 5000; 

// 2. This is where the Python Bot lives (Local vs Production)
const FLASK_URL = process.env.FLASK_API_URL || "http://127.0.0.1:8000";

// 3. This is where your React Frontend lives
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Update CORS to allow the production Frontend
app.use(cors({
    origin: FRONTEND_URL, 
    credentials: true,
}));

// MongoDB Connection
// Replace your current MongoDB Connection block with this:
if (!MONGO_URI) {
    console.error("❌ ERROR: MONGO_URI is missing from environment variables!");
    process.exit(1); // Stop the server if there is no DB to connect to
}

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch(err => {
        console.error("❌ MongoDB Connection Error Details:");
        console.error(err);
    });

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

// --- CHAT ROUTE ---
app.post('/api/chat', async (req, res) => {
    const { question, chatId } = req.body;
    
    try {
        let chat;
        if (chatId && mongoose.Types.ObjectId.isValid(chatId)) {
            chat = await Chat.findById(chatId);
        }
        
        if (!chat) {
            chat = new Chat({ messages: [], userId: req.cookies.token ? jwt.verify(req.cookies.token, "secretkey").userid : null });
        }

        const history = [];
        if (chat.summary) {
            history.push({ role: "system", content: `Previous summary: ${chat.summary}` });
        }
        const recentMessages = chat.messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
        history.push(...recentMessages);

        // Call Flask (Using the corrected URL variable)
        const response = await axios.post(`${FLASK_URL}/chat`, {
            question: question,
            history: history
        });

        const aiReply = response.data.reply;

        chat.messages.push({ role: 'user', content: question });
        chat.messages.push({ role: 'assistant', content: aiReply });

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

app.get('/api/get-all-chats', async (req, res) => {
    try {
        const chats = await Chat.find({}, { _id: 1, messages: { $slice: 1 }, updatedAt: 1 })
                                .sort({ updatedAt: -1 });
        res.json(chats);
    } catch (error) {
        res.status(500).json({ error: "Could not fetch chats" });
    }
});

app.get('/api/chat/:id', async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id);
        if (!chat) return res.status(404).json({ error: "Chat not found" });
        res.json(chat);
    } catch (error) {
        res.status(500).json({ error: "Error loading chat" });
    }
});

// LISTEN ON THE DYNAMIC PORT
app.listen(PORT, () => console.log(`🚀 Node Server running on port ${PORT}`));