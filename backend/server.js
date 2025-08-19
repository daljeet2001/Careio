require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const connectDB = require("./config/db");
const Location = require("./models/Location");
const locationRoutes = require("./routes/locationRoutes");

const app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use("/", locationRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  console.log("🔌 socket connected", socket.id);

  socket.on("send-location", async (data) => {
    console.log("got info");
    const userId = data.id;
    // Save location
    const loc = await Location.create({
      userId,
      lat: data.lat,
      lng: data.lng,
      speed: data.speed,
      timestamp: new Date(),
    });
    // Speed alert check
    const SPEED_LIMIT = 60; // km/h
    if (data.speed && data.speed > SPEED_LIMIT) {
      io.to(socket.id).emit("speed-alert", {
        userId,
        speed: data.speed,
        message: `Speed limit exceeded! ${data.speed} km/h`,
      });
    }

    io.emit("receive-location", {
      userId,
      lat: data.lat,
      lng: data.lng,
      speed: data.speed,
    });
  });

  socket.on("disconnect", () => {
    console.log("🔌 socket disconnected", socket.id);
  });
});

(async () => {
  await connectDB(process.env.MONGO_URI);
  const port = process.env.PORT || 5000;
  server.listen(port, () => console.log(`🚀 API on http://localhost:${port}`));
})();
