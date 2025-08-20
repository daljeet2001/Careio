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
      {
        name: "Daljeet",
        email: "daljeet@example.com",
        password: "password123",
      },
      { name: "Ashish", email: "ashish@example.com", password: "password456" },
      { name: "Harman", email: "harman@example.com", password: "password789" },
      {
        name: "newuser",
        email: "a1@gmail.com",
        password: "1234",
      },
    ];

    const users = [];
    for (const data of usersData) {
      const user = new User(data);
      await user.save(); // triggers pre-save
      users.push(user);
    }

    // Create locations linked to users
    const locations = [
      { userId: users[0].userId, lat: 28.6139, lng: 77.209 },
      { userId: users[0].userId, lat: 28.7041, lng: 77.1025 },
      { userId: users[1].userId, lat: 19.076, lng: 72.8777 },
      { userId: users[1].userId, lat: 19.2183, lng: 72.9781 },
      { userId: users[2].userId, lat: 13.0827, lng: 80.2707 },
      {
        userId: users[3].userId,
        lat: 23.0,
        lng: 89,
      },
    ];

    await Location.insertMany(locations);


    // Generate hourly locations for 1 month for a specific user
    const targetUserId = "eb824779-c07b-45b9-89df-cc63abca592e";
    const baseLat = 30.604968;
    const baseLng = 76.862943;
    const location = [];
    const now = new Date();

    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      for (let hour = 0; hour < 24; hour++) {
        const timestamp = new Date(now);
        timestamp.setDate(now.getDate() - dayOffset);
        timestamp.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

        // Slightly vary lat/lng to simulate movement
        const lat = baseLat + (Math.random() - 0.5) * 0.002;
        const lng = baseLng + (Math.random() - 0.5) * 0.002;

        location.push({
          userId: targetUserId,
          lat,
          lng,
          speed: Math.floor(Math.random() * 5),
          timestamp,
        });
      }
    }

    await Location.insertMany(location);
    console.log("🌱 Seeded hourly locations for 1 month");
    console.log("🌱 Seed data inserted");

    mongoose.connection.close();
    console.log("Connection closed");
  } catch (err) {
    console.error("Error seeding database:", err);
    mongoose.connection.close();
  }
}

seedDB();
