"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.httpServer = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
const path_1 = __importDefault(require("path"));
const prisma_1 = __importDefault(require("./utils/prisma"));
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
exports.httpServer = httpServer;
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "http://localhost:5173", // Vite default port
        methods: ["GET", "POST"]
    }
});
exports.io = io;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/auth', authRoutes_1.default);
app.use('/api/chats', chatRoutes_1.default);
app.use('/api/upload', uploadRoutes_1.default);
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
app.use('/api/users', userRoutes_1.default);
app.get('/', (req, res) => {
    res.send('Flick Messenger API is running');
});
// Socket.io connection handler
const onlineUsers = new Map(); // socketId -> userId
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    socket.on('setup', (userId) => __awaiter(void 0, void 0, void 0, function* () {
        socket.join(userId);
        onlineUsers.set(socket.id, userId);
        try {
            yield prisma_1.default.user.update({
                where: { id: userId },
                data: { isOnline: true }
            });
            socket.broadcast.emit('user_online', userId);
        }
        catch (error) {
            console.error('Error updating user status:', error);
        }
    }));
    socket.on('join_chat', (chatId) => {
        socket.join(chatId);
        console.log(`User ${socket.id} joined chat ${chatId}`);
    });
    // WebRTC Signaling
    socket.on('call_user', ({ userToCall, signalData, from, name }) => {
        var _a;
        const callerSocketId = socket.id;
        // Find socket ID of userToCall
        const userSocketId = (_a = [...onlineUsers.entries()].find(([key, val]) => val === userToCall)) === null || _a === void 0 ? void 0 : _a[0];
        if (userSocketId) {
            io.to(userSocketId).emit('call_user', { signal: signalData, from, name, callerSocketId });
        }
    });
    socket.on('answer_call', (data) => {
        io.to(data.to).emit('call_accepted', data.signal);
    });
    socket.on('end_call', ({ to }) => {
        var _a;
        const userSocketId = (_a = [...onlineUsers.entries()].find(([key, val]) => val === to)) === null || _a === void 0 ? void 0 : _a[0];
        if (userSocketId) {
            io.to(userSocketId).emit('call_ended');
        }
    });
    socket.on('disconnect', () => __awaiter(void 0, void 0, void 0, function* () {
        const userId = onlineUsers.get(socket.id);
        if (userId) {
            try {
                yield prisma_1.default.user.update({
                    where: { id: userId },
                    data: { isOnline: false, lastSeen: new Date() }
                });
                socket.broadcast.emit('user_offline', userId);
                onlineUsers.delete(socket.id);
            }
            catch (error) {
                console.error('Error updating user status:', error);
            }
        }
        console.log('User disconnected:', socket.id);
    }));
});
