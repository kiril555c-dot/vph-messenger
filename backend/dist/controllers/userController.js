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
exports.updateProfile = exports.getProfile = exports.searchUsers = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const searchUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { query } = req.query;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!query || typeof query !== 'string') {
            res.status(400).json({ message: 'Search query is required' });
            return;
        }
        const users = yield prisma_1.default.user.findMany({
            where: {
                username: {
                    contains: query
                },
                NOT: {
                    id: userId
                }
            },
            select: {
                id: true,
                username: true,
                avatar: true,
                bio: true,
                relationshipStatus: true,
                isOnline: true,
                lastSeen: true
            },
            take: 10
        });
        res.json(users);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.searchUsers = searchUsers;
const getProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const user = yield prisma_1.default.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                email: true,
                avatar: true,
                bio: true,
                relationshipStatus: true,
                isOnline: true,
                lastSeen: true,
                notificationsEnabled: true,
                createdAt: true
            }
        });
        res.json(user);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.getProfile = getProfile;
const updateProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { username, avatar, bio, relationshipStatus, notificationsEnabled } = req.body;
        const user = yield prisma_1.default.user.update({
            where: { id: userId },
            data: {
                username,
                avatar,
                bio,
                relationshipStatus,
                notificationsEnabled
            },
            select: {
                id: true,
                username: true,
                email: true,
                avatar: true,
                bio: true,
                relationshipStatus: true,
                isOnline: true,
                lastSeen: true,
                notificationsEnabled: true
            }
        });
        res.json(user);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.updateProfile = updateProfile;
