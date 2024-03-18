import User from "../models/userModel.js";

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
export const searchUser = async(req,res) => {
  try {
    const {name} = req.query;
    res.status(200).json({
      success:true,
      message:name
    })
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}
