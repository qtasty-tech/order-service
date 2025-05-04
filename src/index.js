const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const cors = require('cors');
const orderRoutes = require('./routes/orderRoutes');
const authMiddleware = require('./middleware/authMiddleware');
const { connectProducer } = require('./kafka/producer');

const { streamOrderStatus } = require('./helpers/orderService'); 

// Create Express app
const app = express();
const PORT = process.env.PORT || 7000;

app.use(express.json());
app.use(cors({
  origin: '*'  
}));

// SSE endpoints
app.get('/api/order-status/:orderId', streamOrderStatus);
app.use(authMiddleware);
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

