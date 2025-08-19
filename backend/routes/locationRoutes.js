const express = require("express");
const {
  getHistory, getUsers, getLatest, deleteHistory,signup,signin,logout
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

module.exports = router;
