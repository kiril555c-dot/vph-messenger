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
exports.getChats = exports.createChat = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const createChat = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { partnerId, isGroup, name } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        if (isGroup) {
            // Create group chat logic here (simplified for now)
            const chat = yield prisma_1.default.chat.create({
                data: {
                    isGroup: true,
                    name: name || 'New Group',
                    chatMembers: {
                        create: [
                            { userId: userId, role: 'ADMIN' },
                            // Add other members if provided
                        ]
                    }
                }
            });
            res.status(201).json(chat);
        }
        else {
            // Private chat
            // Check if chat already exists
            const existingChat = yield prisma_1.default.chat.findFirst({
                where: {
                    isGroup: false,
                    AND: [
                        { chatMembers: { some: { userId: userId } } },
                        { chatMembers: { some: { userId: partnerId } } }
                    ]
                },
                include: {
                    chatMembers: {
                        include: {
                            user: {
                                select: { id: true, username: true, avatar: true, isOnline: true, lastSeen: true }
                            }
                        }
                    }
                }
            });
            if (existingChat) {
                res.json(existingChat);
                return;
            }
            const chat = yield prisma_1.default.chat.create({
                data: {
                    isGroup: false,
                    chatMembers: {
                        create: [
                            { userId: userId },
                            { userId: partnerId }
                        ]
                    }
                },
                include: {
                    chatMembers: {
                        include: {
                            user: {
                                select: { id: true, username: true, avatar: true, isOnline: true, lastSeen: true }
                            }
                        }
                    }
                }
            });
            res.status(201).json(chat);
        }
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.createChat = createChat;
const getChats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const chats = yield prisma_1.default.chat.findMany({
            where: {
                chatMembers: {
                    some: { userId }
                }
            },
            include: {
                chatMembers: {
                    include: {
                        user: {
                            select: { id: true, username: true, avatar: true, isOnline: true, lastSeen: true }
                        }
                    }
                },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: { updatedAt: 'desc' }
        });
        // Calculate unread messages for each chat
        const chatsWithUnread = yield Promise.all(chats.map((chat) => __awaiter(void 0, void 0, void 0, function* () {
            const unreadCount = yield prisma_1.default.message.count({
                where: {
                    chatId: chat.id,
                    senderId: { not: userId },
                    statuses: {
                        none: {
                            userId: userId,
                            status: 'READ'
                        }
                    }
                }
            });
            return Object.assign(Object.assign({}, chat), { unreadCount });
        })));
        res.json(chatsWithUnread);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.getChats = getChats;
