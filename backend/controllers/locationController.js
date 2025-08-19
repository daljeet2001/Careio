const Location = require("../models/Location");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const User = require("../models/User");
const SafeZone = require("../models/SafeZone");

// Signup
exports.signup = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ msg: "Email already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({ token, user: { id: user._id, name, email } });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// Signin
exports.signin = async (req, res) => {
  console.log("signin");
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ msg: "Invalid email or password" });

    const match = await bcrypt.compare(password, user.password);

    if (!match)
      return res.status(400).json({ msg: "Invalid email or password" });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({ token, user: { id: user._id, name: user.name, email } });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// Logout
exports.logout = (_req, res) => {
  res.json({ msg: "Logged out successfully" });
};

// Get location history for a user in the last 7 days
exports.getHistory = async (req, res) => {
  const { userId } = req.params;

  // Calculate date 7 days ago
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // Query: all locations for userId from last week
  const data = await Location.find({
    userId,
    timestamp: { $gte: oneWeekAgo },
  }).sort({ timestamp: 1 }); // oldest to newest

  res.json(data);
};

// Get all users with their latest location
exports.getUsers = async (_req, res) => {
  const agg = await Location.aggregate([
    { $sort: { timestamp: -1 } }, // newest first
    { $group: { _id: "$userId", last: { $first: "$$ROOT" } } },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "userId",
        as: "userInfo",
      },
    },
    { $unwind: "$userInfo" },
    {
      $project: {
        _id: 0,
        userId: "$_id",
        name: "$userInfo.name",
        email: "$userInfo.email",
        lastLat: "$last.lat",
        lastLng: "$last.lng",
        speed: "$last.speed",
        timestamp: "$last.timestamp",
      },
    },
  ]);

  res.json(agg);
};

// Get the latest location for a specific user
exports.getLatest = async (req, res) => {
  const { userId } = req.params;
  const latest = await Location.findOne({ userId }).sort({ timestamp: -1 });
  res.json(latest);
};

// Delete all location history for a user
exports.deleteHistory = async (req, res) => {
  const { userId } = req.params;
  const r = await Location.deleteMany({ userId });
  res.json({ deleted: r.deletedCount });
};

// Create a safe zone
exports.createZone = async (req, res) => {
  const { name, center, radius } = req.body;
  const zone = await SafeZone.create({
    parentId: req.user.userId,
    name,
    center,
    radius,
  });
  res.json(zone);
};

// Get all safe zones for the user
exports.getZones = async (req, res) => {
  const zones = await SafeZone.find({ parentId: req.user.userId });
  res.json(zones);
};

// Delete a safe zone
exports.deleteZone = async (req, res) => {
  try {
    const deleted = await SafeZone.findByIdAndDelete(req.params.zoneId);
    if (!deleted) return res.status(404).json({ msg: "Zone not found" });
    res.json({ msg: "Zone deleted", deleted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};
