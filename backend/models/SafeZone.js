const mongoose = require("mongoose");

const SafeZoneSchema = new mongoose.Schema({
  parentId: { type: String, required: true },
  name: { type: String, required: true },       // e.g., "Home", "School"
  center: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  radius: { type: Number, required: true },     // in meters
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("SafeZone", SafeZoneSchema);

