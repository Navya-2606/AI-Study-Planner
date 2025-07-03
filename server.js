const express = require("express");
const cors = require("cors");
const axios = require("axios");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const session = require("express-session");
const bodyParser = require("body-parser");
const MongoStore = require("connect-mongo");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_key";
const PORT = process.env.PORT || 8000;
const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://tejasvibhoghireddy12:tejasvi12@cluster0.ymlcjkk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Connect to MongoDB
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ Connected to MongoDB Atlas"))
.catch((err) => console.error("❌ MongoDB connection error:", err));

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());

// Session setup
const sessionMiddleware = session({
  secret: "mysecretkey",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGO_URI,
    collectionName: "sessions"
  })
});
app.use(sessionMiddleware);

// Now override the default / to home.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "home.html"));
});


// Serve frontend static files first
app.use(express.static(path.join(__dirname, "..", "frontend")));


// Specific routes
app.get("/home.html", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "home.html"));
});

app.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "login.html"));
});

app.get("/index.html", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

app.get("/chatlogin.html", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "chatlogin.html"));
});

app.get("/chat.html", (req, res) => {
  if (!req.session.username) return res.redirect("/chatlogin.html");
  res.sendFile(path.join(__dirname, "..", "frontend", "chat.html"));
});

// Share session with Socket.IO
io.use((socket, next) => {
  sessionMiddleware(socket.request, socket.request.res || {}, next);
});

const onlineUsers = {};

io.on("connection", (socket) => {
  const session = socket.request.session;
  if (!session.username) return;

  const username = session.username;
  onlineUsers[username] = socket;

  console.log(`${username} connected via WebSocket`);

  socket.on("send-message", async ({ to, content }) => {
    const message = new Message({ from: username, to, content });
    await message.save();

    if (onlineUsers[to]) {
      onlineUsers[to].emit("receive-message", {
        from: username,
        content,
        timestamp: new Date()
      });
    }
  });

  socket.on("disconnect", () => {
    delete onlineUsers[username];
    console.log(`${username} disconnected`);
  });
});

// Schemas
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  timetable: Array,
  notes: Array,
  performance: Object,
  username: String,
  friends: [String],
  requests: [String],
});
const messageSchema = new mongoose.Schema({
  from: String,
  to: String,
  content: String,
  timestamp: { type: Date, default: Date.now }
});
const User = mongoose.model("User", userSchema);
const Message = mongoose.model("Message", messageSchema);

// JWT Auth Middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Missing token" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.email = decoded.email;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

// Auth routes
app.post("/api/register", async (req, res) => {
  const { email, password } = req.body;
  const existingUser = await User.findOne({ email });
  if (existingUser) return res.status(409).json({ message: "User already exists" });

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({ email, password: hashedPassword });
  await newUser.save();

  res.status(201).json({ message: "User registered successfully" });
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "2h" });
  res.status(200).json({ message: "Login successful", token });
});

app.get("/api/user-data", authenticate, async (req, res) => {
  const user = await User.findOne({ email: req.email });
  if (!user) return res.status(404).json({ error: "User not found" });

  res.json({
    timetable: user.timetable || [],
    notes: user.notes || [],
    performance: user.performance || {},
  });
});

// Proxy to Flask backend
app.post("/api/plan", async (req, res) => {
  try {
    const response = await axios.post("http://localhost:5001/generate", req.body);
    res.json(response.data);
  } catch (err) {
    console.error("Error in backend:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Chat login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  let user = await User.findOne({ username });
  if (!user) {
    user = new User({ username, password, friends: [], requests: [] });
    await user.save();
  }
  req.session.username = username;
  res.redirect("/chat.html");
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

app.get("/user", async (req, res) => {
  if (!req.session.username) return res.status(401).json({ error: "Not logged in" });
  const user = await User.findOne({ username: req.session.username });
  res.json(user);
});

// Friend requests
app.post("/send-request", async (req, res) => {
  const to = req.body.to;
  const from = req.session.username;

  if (to === from) return res.status(400).json({ error: "Cannot add yourself" });

  const targetUser = await User.findOne({ username: to });
  if (!targetUser) return res.status(404).json({ error: "User not found" });

  if (targetUser.requests.includes(from) || targetUser.friends.includes(from)) {
    return res.status(400).json({ error: "Already sent or already friends" });
  }

  targetUser.requests.push(from);
  await targetUser.save();

  if (onlineUsers[to]) {
    onlineUsers[to].emit("newRequest", from);
  }

  res.json({ success: true });
});

app.post("/accept-request", async (req, res) => {
  const from = req.body.from;
  const to = req.session.username;

  const user = await User.findOne({ username: to });
  const sender = await User.findOne({ username: from });
  if (!user || !sender) return res.status(404).json({ error: "User not found" });

  user.friends.push(from);
  sender.friends.push(to);
  user.requests = user.requests.filter((r) => r !== from);

  await user.save();
  await sender.save();

  res.json({ success: true });
});

app.post("/send-message", async (req, res) => {
  const from = req.session.username;
  const { to, content } = req.body;

  const message = new Message({ from, to, content });
  await message.save();
  res.json({ success: true });
});

app.get("/messages/:friend", async (req, res) => {
  const user = req.session.username;
  const friend = req.params.friend;

  const messages = await Message.find({
    $or: [
      { from: user, to: friend },
      { from: friend, to: user }
    ]
  }).sort({ timestamp: 1 });

  res.json(messages);
});

server.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));