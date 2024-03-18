import express from "express";
import { getMyProfile, loginUser, logoutUser, newUser, searchUser } from "../controllers/userController.js";
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

export default app;