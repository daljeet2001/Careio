const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");


const UserSchema = new mongoose.Schema({
  userId: { type: String, default: uuidv4, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
});


module.exports = mongoose.model("User", UserSchema);
