// order-service/src/index.js
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const cors = require('cors');
const orderRoutes = require('./routes/orderRoutes');
const authMiddleware = require('./middleware/authMiddleware');
const { connectProducer } = require('./kafka/producer');

const app = express();
const PORT = process.env.PORT || 7000;

app.use(express.json());
app.use(cors())
// Use order routes
app.use('/api/orders', orderRoutes);

mongoose.connect(process.env.MONGO_URL)
  .then(async () => {
    console.log('MongoDB connected');

    await connectProducer();

    app.listen(PORT, () => {
      console.log(`Order Service running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });
