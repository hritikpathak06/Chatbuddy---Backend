import express from "express";
import { acceptFriendRequest, getMyFriends, getMyNotifications, getMyProfile, loginUser, logoutUser, newUser, searchUser, sendFriendRequest } from "../controllers/userController.js";
import { singleAvatar } from "../middlewares/multer.js";
import { isAuthenticated } from "../middlewares/auth.js";

const app = express.Router();

// Register
app.post("/new",singleAvatar, newUser);

// Login
app.post("/login",loginUser);

// Get My Profile
app.get("/me",isAuthenticated,getMyProfile);

// Logout 
app.get("/logout",isAuthenticated,logoutUser);

// Search
app.get("/search",isAuthenticated,searchUser);

// Send Friend Request
app.put("/sendrequest", isAuthenticated,sendFriendRequest);

// Accept Friend Request
app.put("/acceptrequest",isAuthenticated,acceptFriendRequest);


// Get My Notifications
app.get("/notifications",isAuthenticated,getMyNotifications);


// Get My Friends
app.get("/friends", isAuthenticated,getMyFriends);

export default app;