const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const authRoutes        = require('./routes/auth');
const userRoutes        = require('./routes/users');
const fileRoutes        = require('./routes/files');
const submissionRoutes  = require('./routes/submissions');
const adminRoutes       = require('./routes/admin');
const communityRoutes   = require('./routes/community');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: 'http://192.168.1.4:3000', credentials: true }));
app.use(express.json());

app.use('/api/auth',        authRoutes);
app.use('/api/users',       userRoutes);
app.use('/api/files',       fileRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/admin',       adminRoutes);
app.use('/api',             communityRoutes); // expose /api/faculties, /api/levels, /api/community/*

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Serveur académique opérationnel' });
});

app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));
