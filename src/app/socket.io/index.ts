import { Server } from "socket.io";
import http from "http";
import config from "../config";
import app from "../../app";
import { chatHandler } from "./chatHandler";
import { likeDislikeHandler } from "./likeDislikeHandler";
import { commentHandler } from "./commentHandler";

// const app: Application = express();
const server = http.createServer(app);

// app.use(cors({ origin: [config.client_url as string], credentials: true }));

const io = new Server(server, {
  cors: {
    origin: config.client_url,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

export const getSocketId = (userId: string) => {
  return users[userId];
};

const users: Record<string, string> = {};

io.on("connection", (socket) => {
  console.log("a user connected", socket.id);
  const userId = socket.handshake.query.userId as string;
  if (userId) {
    users[userId] = socket.id;
    console.log("Hello ", users);
  }
  io.emit("getOnlineUsers", Object.keys(users));

  // Handle typing events in the separate module
  chatHandler(io, socket);
  likeDislikeHandler(io, socket);
  commentHandler(io, socket);

  socket.on("disconnect", () => {
    console.log("a user disconnected", socket.id);
    delete users[userId];
    io.emit("getOnlineUsers", Object.keys(users));
  });
});

export { app, io, server };
