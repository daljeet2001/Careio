const express = require("express");
const {
  getHistory, getUsers, getLatest, deleteHistory,signup,signin,logout,createZone,getZones,deleteZone
} = require("../controllers/locationController");
const auth = require("../middleware/auth");

const router = express.Router();

router.post("/signup", signup);
router.post("/signin", signin);
router.post("/logout", logout);
router.get("/history/:userId", auth, getHistory);
router.get("/users",auth, getUsers);
router.get("/users/:userId/latest",auth, getLatest);
router.delete("/history/:userId",auth, deleteHistory);
router.post("/safezone/create", auth, createZone);    
router.get("/safezone", auth, getZones);        
router.delete("/:safezoneId", auth, deleteZone);

module.exports = router;
