import dotenv from 'dotenv';
import { httpServer } from './app';

dotenv.config();

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});