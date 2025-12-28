# Flick Messenger

A modern, 8-bit styled messenger application with liquid glass effects.

## Features

- **Real-time Messaging**: Powered by Socket.io for instant communication.
- **Secure Authentication**: JWT-based auth with refresh tokens.
- **Modern UI**: Unique 8-bit + Liquid Glass design system.
- **Group & Private Chats**: Create and manage conversations easily.
- **Responsive Design**: Works seamlessly on desktop and mobile.

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, Prisma, SQLite (Dev), Socket.io
- **Frontend**: React, Vite, TypeScript, Tailwind CSS
- **Design**: Custom 8-bit + Liquid Glass theme

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd flick-messenger
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   npx prisma migrate dev --name init
   npm run dev
   ```

3. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the App**
   Open `http://localhost:5173` in your browser.

## Project Structure

```
flick-messenger/
├── backend/          # Express + Prisma API
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── utils/
│   └── prisma/       # Database schema
└── frontend/         # React + Vite App
    ├── src/
    │   ├── pages/
    │   └── assets/
    └── public/
```

## License

MIT