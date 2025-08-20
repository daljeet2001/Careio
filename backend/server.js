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
  cors(
  )
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
    // console.log("got info");
    const userId = data.userId;
    // Save location
    // console.log('data',data, 'userId',userId);
    const loc = await Location.create({
      userId,
      lat: data.lat,
      lng: data.lng,
      speed: data.speed,
      timestamp: new Date(),  
    });

  });
 // Interval to send all users' latest location every 5 seconds
  // const intervalId = setInterval(async () => {
  //   try {
  //     const users = await Location.aggregate([
  //       { $sort: { timestamp: -1 } },
  //       { $group: { _id: "$userId", last: { $first: "$$ROOT" } } },
  //       {
  //         $lookup: {
  //           from: "users",
  //           localField: "_id",
  //           foreignField: "userId",
  //           as: "userInfo",
  //         },
  //       },
  //       { $unwind: "$userInfo" },
  //       {
  //         $project: {
  //           _id: 0,
  //           userId: "$_id",
  //           name: "$userInfo.name",
  //           email: "$userInfo.email",
  //           lastLat: "$last.lat",
  //           lastLng: "$last.lng",
  //           speed: "$last.speed",
  //           timestamp: "$last.timestamp",
  //         },
  //       },
  //     ]);

  //     socket.emit("receive-all-locations", users);
  //   } catch (err) {
  //     console.error("Error emitting locations:", err);
  //   }
  // }, 5000);



  socket.on("disconnect", () => {
    console.log("🔌 socket disconnected", socket.id);
  });
});

(async () => {
  await connectDB(process.env.MONGO_URI);
  const port = process.env.PORT || 5000;
  server.listen(port, () => console.log(`🚀 API on http://localhost:${port}`));
})();
