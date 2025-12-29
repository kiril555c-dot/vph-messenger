import dotenv from 'dotenv';
import { httpServer } from './app';

dotenv.config();

const PORT = process.env.PORT || 3000;

// Добавили '0.0.0.0' — это говорит серверу принимать запросы из интернета
httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});