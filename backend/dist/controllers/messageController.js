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
exports.markMessagesAsRead = exports.getMessages = exports.sendMessage = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const app_1 = require("../app");
const sendMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { chatId, content, type } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const message = yield prisma_1.default.message.create({
            data: {
                chatId,
                senderId: userId,
                content,
                type: type || 'TEXT',
                statuses: {
                    create: {
                        userId: userId,
                        status: 'SENT'
                    }
                }
            },
            include: {
                sender: {
                    select: { id: true, username: true, avatar: true }
                },
                statuses: true
            }
        });
        // Update chat updatedAt
        yield prisma_1.default.chat.update({
            where: { id: chatId },
            data: { updatedAt: new Date() }
        });
        // Emit socket event
        app_1.io.to(chatId).emit('new_message', message);
        res.status(201).json(message);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.sendMessage = sendMessage;
const getMessages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { chatId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        // Verify user is member of chat
        const isMember = yield prisma_1.default.chatMember.findUnique({
            where: {
                chatId_userId: {
                    chatId,
                    userId
                }
            }
        });
        if (!isMember) {
            res.status(403).json({ message: 'Not a member of this chat' });
            return;
        }
        const messages = yield prisma_1.default.message.findMany({
            where: { chatId },
            include: {
                sender: {
                    select: { id: true, username: true, avatar: true }
                },
                statuses: true
            },
            orderBy: { createdAt: 'asc' }
        });
        res.json(messages);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.getMessages = getMessages;
const markMessagesAsRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { chatId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        // Find messages in this chat that are not sent by the current user
        // and don't have a READ status for the current user
        const messagesToUpdate = yield prisma_1.default.message.findMany({
            where: {
                chatId,
                senderId: { not: userId },
                statuses: {
                    none: {
                        userId: userId,
                        status: 'READ'
                    }
                }
            }
        });
        yield Promise.all(messagesToUpdate.map((msg) => __awaiter(void 0, void 0, void 0, function* () {
            // Check if status exists
            const existingStatus = yield prisma_1.default.messageStatus.findUnique({
                where: {
                    messageId_userId: {
                        messageId: msg.id,
                        userId: userId
                    }
                }
            });
            if (existingStatus) {
                yield prisma_1.default.messageStatus.update({
                    where: { id: existingStatus.id },
                    data: { status: 'READ' }
                });
            }
            else {
                yield prisma_1.default.messageStatus.create({
                    data: {
                        messageId: msg.id,
                        userId: userId,
                        status: 'READ'
                    }
                });
            }
        })));
        // Emit socket event to notify sender that messages are read
        app_1.io.to(chatId).emit('messages_read', { chatId, userId });
        res.json({ message: 'Messages marked as read' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.markMessagesAsRead = markMessagesAsRead;
