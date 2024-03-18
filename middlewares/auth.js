import User from "../models/userModel.js";
import jwt from "jsonwebtoken";

export const isAuthenticated = async (req, res, next) => {
  const { token } = req.cookies;
  if (!token) {
    return res.status(404).json({
      success: false,
      message: "Please Login to access this resource",
    });
  }
  const decoded = jwt.verify(token, process.env.JWT_TOKEN_SECRET);
  // req.user = await User.findById(decoded._id);
  req.user = decoded._id;

  next();
};
