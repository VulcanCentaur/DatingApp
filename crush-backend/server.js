import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Initialize environment variables
dotenv.config();

// ES module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// App configuration
const app = express();

// Environment variables with fallbacks
const PORT = process.env.PORT || 8080;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crushDB';
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-at-least-32-chars-long';
const NODE_ENV = process.env.NODE_ENV || 'development';

// CORS configuration - works for both local and production
const CORS_ORIGINS = [
  'http://localhost:3000',                      // Local frontend
  'https://your-frontend.onrender.com',         // Your Render frontend
  'https://your-backend.onrender.com'           // Allow direct API access
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (CORS_ORIGINS.includes(origin) || 
        origin.includes('localhost') || 
        origin.includes('onrender.com')) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Middleware
app.use(express.json());

// MongoDB connection with error handling
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('MongoDB connection error:', err));

// User Schema and Model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

const User = mongoose.model('User', userSchema);

// Crush Schema and Model
const crushSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

const Crush = mongoose.model('Crush', crushSchema);

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    environment: NODE_ENV,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Auth routes
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const user = new User({ username, password });
    await user.save();
    
    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, userId: user._id });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Protected routes
app.post('/api/crush', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    const { id: userId } = req.user;
    
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const crush = new Crush({ name, userId });
    await crush.save();
    
    res.status(201).json(crush);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.get('/api/crush/:userId', authenticateToken, async (req, res) => {
  try {
    const crushes = await Crush.find({ userId: req.params.userId });
    res.json(crushes);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
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

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running in ${NODE_ENV} mode on port ${PORT}`);
  console.log(`🔗 http://localhost:${PORT}`);
});