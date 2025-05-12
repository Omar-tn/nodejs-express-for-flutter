const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const notifRoutes = require('./routes/notifications');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/api/auth', authRoutes);
app.use('/api/notify', notifRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));


// Basic route
app.get('/', (req, res) => {
  res.send('edulink Backend is running! sss ');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on `);
});

