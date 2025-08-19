require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const connectDB = require("./config/db");
const Location = require("./models/Location");
const locationRoutes = require("./routes/locationRoutes");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/", locationRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, methods: ["GET", "POST"] }
});

io.on("connection", (socket) => {
  console.log("🔌 socket connected", socket.id);

  socket.on("send-location", async (data) => {
    try {
      const userId = data.userId || socket.id;
      if (typeof data.lat !== "number" || typeof data.lng !== "number") return;

      const doc = await Location.create({
        userId,
        lat: data.lat,
        lng: data.lng,
        accuracy: data.accuracy,
        speed: data.speed
      });

      io.emit("receive-location", {
        userId,
        lat: doc.lat,
        lng: doc.lng,
        timestamp: doc.timestamp
      });
    } catch (e) {
      console.error("save error:", e.message);
    }
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
