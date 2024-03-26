import User from "../models/userModel.js";
import Chat from "../models/chatModel.js";
import { NEW_REQUEST, REFETCH_CHAT } from "../constants/events.js";
import { emitEvent } from "../utils/features.js";
import Request from "../models/requestModel.js";
import { getOtherMember } from "../lib/helper.js";

// Create New User Controller
export const newUser = async (req, res) => {
  try {
    const { name, username, password, bio } = req.body;
    if (!name || !username || !password || !bio) {
      return res.status(404).json({
        success: false,
        message: "Please Fill Out All The Fields",
      });
    }
    const avatar = {
      public_id: "abcd",
      url: "test sample case",
    };

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(404).json({
        success: false,
        message: "User Already Exist.Please Login to continue",
      });
    }
    const user = await User.create({
      name,
      username,
      password,
      bio,
      avatar,
    });
    const token = await user.generateToken();
    res.cookie("token", token, {
      maxAge: 15 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });
    res.status(201).json({
      success: true,
      message: "User Created Successfully",
      user,
      token,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// Login User Controller
export const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(404).json({
        success: false,
        message: "Please Fill Out All The Fields",
      });
    }
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User Not Found",
      });
    }
    const isPasswordMatched = await user.comparePassword(password);
    if (!isPasswordMatched) {
      return res.status(404).json({
        success: false,
        message: "Invalid Credentials",
      });
    }
    const token = await user.generateToken();
    res.cookie("token", token, {
      maxAge: 15 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });
    res.status(200).json({
      success: true,
      message: "User Logged In Successfully",
      user,
      token,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// My Profile Controller
export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user);
    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// Logout Controller
export const logoutUser = async (req, res) => {
  res.status(200).cookie("token", null, {
    maxAge: 0,
    httpOnly: true,
    sameSite: "None",
    secure: true,
  });
  return res.status(200).json({
    success: true,
    message: "User Logged Out Successfully",
  });
};

// Search User Controller
export const searchUser = async (req, res) => {
  try {
    const { name = "" } = req.query;

    // Finding All my chats
    const myChats = await Chat.find({ groupChat: false, members: req.user });

    //  extracting All Users from my chats means friends or people I have chatted with
    const allUsersFromMyChats = myChats.flatMap((chat) => chat.members);

    // // Finding all users except me and my friends
    const allUsersExceptMeAndFriends = await User.find({
      _id: { $nin: allUsersFromMyChats },
      name: { $regex: name, $options: "i" },
    });

    // Modifying the response
    const users = allUsersExceptMeAndFriends.map(({ _id, name, avatar }) => ({
      _id,
      name,
      avatar: avatar.url,
    }));

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// Send Friend Request
export const sendFriendRequest = async (req, res) => {
  try {
    const { userId } = req.body;

    const request = await Request.findOne({
      $or: [
        { sender: req.user, reciever: userId },
        { sender: userId, reciever: req.user },
      ],
    });
    if (request)
      return res.status(400).json({
        success: false,
        message: "Request Already Sent",
      });

    await Request.create({
      sender: req.user,
      reciever: userId,
    });

    emitEvent(req, NEW_REQUEST, [userId]);

    return res.status(200).json({
      success: true,
      message: "Friend Request Sent",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// Accept Friend Request
export const acceptFriendRequest = async (req, res) => {
  try {
    const { requestId, accept = false } = req.body;

    const request = await Request.findById(requestId)
      .populate("sender", "name")
      .populate("reciever", "name");
    console.log(request);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request Not Found",
      });
    }
    if (request.reciever._id.toString() !== req.user.toString())
      return res.status(401).json({
        success: true,
        message: "You are not authorized to accept this request",
      });

    if (!accept) {
      await request.deleteOne();
      return res.status(200).json({
        success: true,
        message: "Friend Request Rejected",
      });
    }

    const members = [request.sender._id, request.reciever._id];

    await Promise.all([
      Chat.create({
        members,
        name: `${request.sender.name}-${request.reciever.name}`,
      }),
      request.deleteOne(),
    ]);

    emitEvent(req, REFETCH_CHAT, members);

    return res.status(200).json({
      success: true,
      message: "Friend Request Accepted",
      senderId: request.sender._id,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// Get My Notifications
export const getMyNotifications = async (req, res) => {
  try {
    const requests = await Request.find({ reciever: req.user }).populate(
      "sender",
      "name avatar"
    );

    const allRequests = requests.map(({ _id, sender }) => ({
      _id,
      sender: {
        _id: sender._id,
        name: sender.name,
        avatar: sender.avatar.url,
      },
    }));

    return res.status(200).json({
      success: true,
      allRequests,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// Get My Friends Controller
export const getMyFriends = async (req, res) => {
  try {
    const chatId = req.query.chatId;
    const chats = await Chat.find({
      members: req.user,
      groupChat: false,
    }).populate("members", "name avatar");

    const friends = chats.map(({ members }) => {
      const otherUser = getOtherMember(members, req.user);
      return {
        _id: otherUser._id,
        name: otherUser.name,
        avatar: otherUser.avatar.url,
      };
    });

    if (chatId) {
      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({
          success: false,
          message: "Chat not found",
        });
      }
      const availableFriends = [];
      for (const friend of friends) {
        if (chat.members.includes(friend._id)) {
          availableFriends.push(friend);
        }
      }
      return res.status(200).json({
        success: true,
        friends: availableFriends,
      });
    } else {
      return res.status(200).json({
        success: true,
        friends,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
