import {
  ALERT,
  NEW_ATTACHEMENT,
  NEW_MESSAGE_ALERT,
  REFETCH_CHAT,
} from "../constants/events.js";
import { getOtherMember } from "../lib/helper.js";
import Chat from "../models/chatModel.js";
import Message from "../models/messageModel.js";
import User from "../models/userModel.js";
import { deleteFilesFromCloudinary, emitEvent } from "../utils/features.js";

// Create Group Chat Controller
export const NewGroupChat = async (req, res) => {
  try {
    const { name, members } = req.body;
    if (members.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Group Chat Must Contain Atleast 2 members",
      });
    }
    const allMembers = [...members, req.user];
    await Chat.create({
      name,
      groupChat: true,
      creator: req.user,
      members: allMembers,
      creator: req.user,
    });
    emitEvent(req, ALERT, allMembers, `Welcome To ${name} group`);
    emitEvent(req, REFETCH_CHAT, members);
    return res.status(201).json({
      success: true,
      message: "Group Created",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// Get MY Chat Controller
export const getMyChats = async (req, res) => {
  try {
    const chats = await Chat.find({ members: req.user }).populate(
      "members",
      "name avatar"
    );
    const transformedChats = chats.map(({ _id, name, groupChat, members }) => {
      const otherMember = getOtherMember(members, req.user);
      return {
        _id,
        groupChat,
        name: groupChat ? name : otherMember.name,
        members: members.reduce((prev, curr) => {
          if (curr._id.toString() !== req.user.toString()) {
            prev.push(curr._id);
          }
          return prev;
        }, []),
        avatar: groupChat
          ? members.slice(0, 3).map(({ avatar }) => avatar.url)
          : [otherMember.avatar.url],
      };
    });
    return res.status(200).json({
      success: true,
      chats: transformedChats,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// Get My Groups Controller
export const getMyGroups = async (req, res) => {
  try {
    const chats = await Chat.find({
      members: req.user,
      groupChat: true,
      creator: req.user,
    }).populate("members", "name avatar");

    const groups = chats.map(({ _id, members, groupChat, name }) => ({
      _id,
      groupChat,
      name,
      avatar: members.slice(0, 3).map(({ avatar }) => avatar.url),
    }));

    return res.status(200).json({
      success: true,
      groups,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// Add Members Controller
export const addMembers = async (req, res) => {
  try {
    const { chatId, members } = req.body;

    if (!members || members.length < 1) {
      return res.status(404).json({
        success: false,
        message: "Please Provide Members",
      });
    }
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat Not Found",
      });
    }
    if (!chat.groupChat) {
      return res.status(400).json({
        success: false,
        message: "This is not a group chat",
      });
    }
    if (chat.creator._id.toString() !== req.user.toString()) {
      return res.status(403).json({
        success: false,
        message: "You Are Not Allowed To Add Members",
      });
    }
    const allNewMembersPromise = members.map((i) => User.findById(i, "name"));

    const allMembers = await Promise.all(allNewMembersPromise);

    const uniqueMembers = allMembers
      .filter((i) => !chat.members.includes(i._id.toString()))
      .map((i) => i._id);

    chat.members.push(...uniqueMembers);
    if (chat.members.length > 100) {
      return res.status(403).json({
        success: false,
        message: "Group Members Limit Exceeds",
      });
    }
    await chat.save();

    const allUsersName = allMembers.map((i) => i.name).join(",");
    emitEvent(
      req,
      ALERT,
      chat.members,
      `${allUsersName} has been added to the group `
    );

    emitEvent(req, REFETCH_CHAT, chat.members);
    return res.status(200).json({
      success: true,
      message: "Members Added Successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// Remove Members Controller
export const removeMembers = async (req, res) => {
  try {
    const { userId, chatId } = req.body;

    const [chat, userThatWillBeRemoved] = await Promise.all([
      Chat.findById(chatId),
      User.findById(userId, "name"),
    ]);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat Not Found",
      });
    }
    if (!chat.groupChat) {
      return res.status(400).json({
        success: false,
        message: "This is not a group chat",
      });
    }

    if (chat.members <= 3) {
      return res.status(400).json({
        success: false,
        message: "Group Must Have Atleast 3 Members",
      });
    }

    chat.members = chat.members.filter(
      (member) => member.toString() !== userId.toString()
    );

    await chat.save();

    emitEvent(
      req,
      ALERT,
      chat.members,
      `${userThatWillBeRemoved} has been removed from the group`
    );

    emitEvent(req, REFETCH_CHAT, chat.members);
    return res.status(200).json({
      success: true,
      message: "Member Removed Successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// Leave Group
export const leaveGroup = async (req, res) => {
  try {
    const chatId = req.params.id;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat Not Found",
      });
    }

    if (!chat.groupChat) {
      return res.status(400).json({
        success: false,
        message: "This is not a group chat",
      });
    }

    const remainingMembers = chat.members.find(
      (member) => member.toString() !== req.user.toString()
    );

    if (remainingMembers.length < 3) {
      return res.status(400).json({
        success: true,
        message: "You Cant Leave The Group",
      });
    }

    if (chat.creator.toString() === req.user.toString()) {
      const newCreator = remainingMembers[0];
      chat.creator = newCreator;
    }

    chat.members = remainingMembers;

    const [user] = await Promise.all([
      User.findById(req.user, "name"),
      chat.save(),
    ]);

    emitEvent(req, ALERT, chat.members, `User ${user.name} has left the group`);

    return res.status(200).json({
      success: true,
      message: `${user.name} leaved the group`,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// Send Attachment Controller
export const sendAttachmentController = async (req, res) => {
  try {
    const { chatId } = req.body;

    const [chat, me] = await Promise.all([
      Chat.findById(chatId),
      User.findById(req.user, "name"),
    ]);

    if (!chat) {
      return res.status(400).json({
        success: false,
        message: "Chat not found",
      });
    }

    const files = req.files || [];

    if (files.length < 1) {
      return res.status(400).json({
        success: false,
        message: "Please provide the attachements",
      });
    }

    // Upload Files Here
    const attachements = [];

    const messageForDB = {
      content: "",
      attachements,
      sender: me._id,
      chat: chatId,
    };

    const messageForRealTime = {
      ...messageForDB,
      sender: {
        _id: me._id,
        name: me.name,
      },
    };

    const message = await Message.create(messageForDB);

    emitEvent(req, NEW_ATTACHEMENT, chat.members, {
      message: messageForRealTime,
      chatId,
    });
    emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId });

    return res.status(200).json({
      success: true,
      message,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// Get Chat Details Controller
export const getChatDetails = async (req, res) => {
  try {
    if (req.query.populate === "true") {
      console.log("populate");
      const chat = await Chat.findById(req.params.id)
        .populate("members", "name avatar")
        .lean();

      chat.members = chat.members.map(({ _id, name, avatar }) => ({
        _id,
        name,
        avatar: avatar.url,
      }));

      return res.status(200).json({
        success: true,
        chat,
      });
    } else {
      console.log("Not");
      const chat = await Chat.findById(req.params.id);
      if (!chat) {
        return res.status(404).json({
          success: false,
          message: "Chat Not Found",
        });
      }
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// Rename Group Controller
export const renameGroup = async (req, res) => {
  try {
    const chatId = req.params.id;
    const { name } = req.body;
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat Not Found",
      });
    }
    if (!chat.groupChat) {
      return res.status(404).json({
        success: false,
        message: "You are not allowed to rename the group",
      });
    }

    if (chat.creator.toString() !== req.user.toString()) {
      return res.status(400).json({
        success: false,
        message: "You are not allowed to rename the group",
      });
    }
    chat.name = name;
    await chat.save();

    emitEvent(req, REFETCH_CHAT, chat.members);

    return res.status(200).json({
      success: true,
      message: "Group Name Updated Successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// Delete Group Controller
export const deleteChat = async (req, res) => {
  try {
    const chatId = req.params.id;
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat Not Found",
      });
    }

    chat.members = chat.members;

    if (chat.groupChat && chat.creator.toString() !== req.user.toString()) {
      return res.status(400).json({
        success: false,
        message: "You are not allowed to delete the group",
      });
    }

    if (!chat.groupChat && chat.members.includes(req.user.toString())) {
      return res.status(400).json({
        success: false,
        message: "You are not allowed to delete the group",
      });
    }

    // Here we have to delete all messages as well as attachments or files from cloudinary
    const messagesWithAttachements = await Message.find({
      chat: chatId,
      attachements: { $exists: true, $ne: [] },
    });
    const public_ids = [];

    messagesWithAttachements.forEach(({ attachements }) => {
      attachements.forEach(({ public_id }) => {
        public_ids.push(public_id);
      });
    });

    await Promise.all([
      // Delete files from cloudinary
      deleteFilesFromCloudinary(public_ids),
      chat.deleteOne(),
      Message.deleteMany({ chat: chatId }),
    ]);
    emitEvent(req, REFETCH_CHAT, chat.members);

    return res.status(200).json({
      success: true,
      message: "Chat Deleted Successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// Get Messages Controller
export const getMessages = async (req, res) => {
  try {
    const chatId = req.params.id;
    const { page = 1 } = req.query;
    const resultPerPage = 20;
    const skip = (page - 1) * resultPerPage;
    const [messages, totalMessagesCount] = await Promise.all([
      Message.find({
        chat: chatId,
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(resultPerPage)
        .populate("sender", "name")
        .lean(),
      Message.countDocuments({ chat: chatId }),
    ]);
    const totalPages = Math.ceil(totalMessagesCount / resultPerPage);
    return res.status(200).json({
      success: true,
      messages: messages.reverse(),
      totalPages,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
