import express from "express";
import {
  NewGroupChat,
  addMembers,
  deleteChat,
  getChatDetails,
  getMessages,
  getMyChats,
  getMyGroups,
  leaveGroup,
  removeMembers,
  renameGroup,
  sendAttachmentController,
} from "../controllers/chatController.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { sendAttachment } from "../middlewares/multer.js";

const app = express.Router();

app.post("/new", isAuthenticated, NewGroupChat);

app.get("/my", isAuthenticated, getMyChats);

app.get("/my/groups", isAuthenticated, getMyGroups);

app.put("/add-members", isAuthenticated, addMembers);

app.put("/remove-member", isAuthenticated, removeMembers);

app.delete("/leave/:id", isAuthenticated, leaveGroup);

// Send Attachements
app.post("/message", isAuthenticated, sendAttachment, sendAttachmentController);

// Get Messages
app.get("/message/:id",isAuthenticated,getMessages);

// GET Chat Details,Rename,Delete
app.route("/:id")
.get(isAuthenticated,getChatDetails)
.put(isAuthenticated,renameGroup)
.delete(isAuthenticated,deleteChat)

export default app;
