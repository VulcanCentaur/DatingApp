import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"; // Added missing import
import User from "./models/User.js";
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());

// DB connect
mongoose.connect("mongodb://127.0.0.1:27017/crushDB")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error(err));

// Crush schema
const crushSchema = new mongoose.Schema({
  name: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
});
const Crush = mongoose.model("Crush", crushSchema);

// Register (Signup)
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // Trim whitespace
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    
    const existingUser = await User.findOne({ username: trimmedUsername });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    // Let the model's pre-save hook handle the hashing
    const user = new User({ 
      username: trimmedUsername, 
      password: trimmedPassword 
    });
    
    await user.save();
    res.json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login - Fixed to return user ID and proper token
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "Invalid username" });

    const isMatch = await bcrypt.compare(password, user.password);
    console.log(isMatch);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign({ id: user._id }, "secret", { expiresIn: "1h" });
    res.json({ 
      token,
      userId: user._id 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add crush (userId required)
app.post("/api/crush", async (req, res) => {
  const { name, userId } = req.body;
  const newCrush = new Crush({ name, userId });
  await newCrush.save();
  res.json(newCrush);
});

// Get crushes of a user
app.get("/api/crush/:userId", async (req, res) => {
  const crushes = await Crush.find({ userId: req.params.userId });
  res.json(crushes);
});

// Logout
app.post("/api/logout", (req, res) => {
  res.json({ message: "Logged out" });
});

// Get matches of a user
app.get("/api/matches/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Step 1: Get all crushes this user has added
    const myCrushes = await Crush.find({ userId }).populate("userId");

    // Step 2: Check mutual crushes
    const matches = [];
    for (let crush of myCrushes) {
      const reverse = await Crush.findOne({ userId: await User.findOne({ username: crush.name }).then(u => u?._id), name: (await User.findById(userId)).username });
      if (reverse) {
        matches.push(crush.name);
      }
    }

    res.json({ matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from React app
app.use(express.static(path.join(__dirname, '../crush-frontend/build')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../crush-frontend/build', 'index.html'));
});

const PORT = 8080;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Server running on http://127.0.0.1:${PORT}`)
);