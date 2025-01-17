import express from 'express';
import cors from 'cors';
import path from 'path';
import videoRoutes from './routes/videoRoutes';

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for the React frontend
app.use(cors({
  origin: 'http://localhost:5173', // Vite's default port
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));

// Parse JSON bodies
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Use video routes
app.use('/api', videoRoutes);

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 