const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const User = require("./models/User");
const Location = require("./models/Location");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI;

async function seedDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    await User.deleteMany({});
    await Location.deleteMany({});
    console.log("Cleared old data");

    // Create users with UUIDs +  hashed passwords
const usersData = [
  { name: "Daljeet", email: "daljeet@example.com", password: "password123" },
  { name: "Ashish", email: "ashish@example.com", password: "password456" },
  { name: "Harman", email: "harman@example.com", password: "password789" }
];

const users = [];
for (const data of usersData) {
  const user = new User(data);
  await user.save(); // triggers pre-save
  users.push(user);
}

    // Create locations linked to users
    const locations = [
      { userId: users[0].userId, lat: 28.6139, lng: 77.2090 }, 
      { userId: users[0].userId, lat: 28.7041, lng: 77.1025 },
      { userId: users[1].userId, lat: 19.0760, lng: 72.8777 }, 
      { userId: users[1].userId, lat: 19.2183, lng: 72.9781 },
      { userId: users[2].userId, lat: 13.0827, lng: 80.2707 }  
    ];

    await Location.insertMany(locations);
    console.log("🌱 Seed data inserted");

    mongoose.connection.close();
    console.log("Connection closed");
  } catch (err) {
    console.error("Error seeding database:", err);
    mongoose.connection.close();
  }
}

seedDB();
