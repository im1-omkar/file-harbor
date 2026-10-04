import express from "express";
import http from "node:http";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";

//register-hander is imported
import { registerHandlers } from "./socket/handlers";

import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "./types";

dotenv.config();

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const app = express();

app.use(
  cors({
    origin: CLIENT_URL,
  }),
);

//health type endpoint
app.get("/", (_req, res) => {
  res.json({
    name: "File Harbor Signaling Server",
    status: "running",
  });
});

const httpServer = http.createServer(app);

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
  },
  maxHttpBufferSize: 1e6,
  pingInterval: 25000,
  pingTimeout: 20000,
});

io.on("connection", (socket) => {
  socket.data.currentRoom = null;

  console.log("Connected:", socket.id);

  registerHandlers(io, socket);
});

const PORT = Number(process.env.PORT) || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
