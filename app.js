import express from "express";
import dotenv from "dotenv";
import connectDB from "./db/connection.js";
import bodyParser from "body-parser";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import cors from "cors";
import userRoutes from "./routes/user.js";
import chatRoutes from "./routes/chat.js";
import { createUser } from "./seeders/user.js";
const app = express();

// Config
dotenv.config();
connectDB();

// createUser(10)

const port = process.env.PORT || 8000;

// Middlewares
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan("common"));
app.use(cookieParser());
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

// Routes
app.use("/user", userRoutes);
app.use("/chat",chatRoutes);

app.get("/", (req, res) => {
  res.send("Server Is Running Perfectly");
});

app.listen(port, () => {
  console.log(`Server is running on the port:${port}`);
});
