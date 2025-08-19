const mongoose = require("mongoose");

async function connectDB(uri) {
 try {
   mongoose.set("strictQuery", true);
   await mongoose.connect(uri);
   console.log("MongoDB connected");
 } catch (error) {
  console.log("an error occured",error.message)
 }
}

module.exports = connectDB;
