const mongoose = require("mongoose");

const LocationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model("Location", LocationSchema);
