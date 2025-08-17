import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "./models/User.js";
import path from 'path';
import { fileURLToPath } from 'url';

// Initialize Express app
const app = express();

// Configure CORS for production and development
const allowedOrigins = [
  'http://localhost:3000',
  'https://your-render-frontend-url.onrender.com' // Replace with your actual frontend URL
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Database connection with environment variable fallback
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/crushDB";

mongoose.connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Crush schema
const crushSchema = new mongoose.Schema({
  name: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
});

const Crush = mongoose.model("Crush", crushSchema);

// JWT secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || "secret";

// Register (Signup)
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    
    if (!trimmedUsername || !trimmedPassword) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const existingUser = await User.findOne({ username: trimmedUsername });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const user = new User({ 
      username: trimmedUsername, 
      password: trimmedPassword 
    });
    
    await user.save();
    res.json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "Invalid username or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid username or password" });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ 
      token,
      userId: user._id 
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Add crush
app.post("/api/crush", async (req, res) => {
  try {
    const { name, userId } = req.body;
    if (!name || !userId) {
      return res.status(400).json({ message: "Name and userId are required" });
    }
    
    const newCrush = new Crush({ name, userId });
    await newCrush.save();
    res.status(201).json(newCrush);
  } catch (err) {
    console.error("Add crush error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get crushes of a user
app.get("/api/crush/:userId", async (req, res) => {
  try {
    const crushes = await Crush.find({ userId: req.params.userId });
    res.json(crushes);
  } catch (err) {
    console.error("Get crushes error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get matches of a user
app.get("/api/matches/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const myCrushes = await Crush.find({ userId }).populate("userId");
    
    const matches = [];
    for (let crush of myCrushes) {
      const user = await User.findOne({ username: crush.name });
      if (user) {
        const reverse = await Crush.findOne({ 
          userId: user._id, 
          name: (await User.findById(userId)).username 
        });
        if (reverse) {
          matches.push(crush.name);
        }
      }
    }

    res.json({ matches });
  } catch (err) {
    console.error("Get matches error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../crush-frontend/build')));

  // Handle React routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../crush-frontend/build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});