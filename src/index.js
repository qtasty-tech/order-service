const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const cors = require('cors');
const orderRoutes = require('./routes/orderRoutes');
const authMiddleware = require('./middleware/authMiddleware');
const { connectProducer } = require('./kafka/producer');
const { getOrderStatus, getDeliveryStatus } = require('./helpers/orderService'); 

// Create Express app
const app = express();
const PORT = process.env.PORT || 7000;

app.use(express.json());
app.use(cors());
app.use('/api/orders', orderRoutes);

// SSE route to stream order and delivery status

app.get('/api/delivery-progress/:orderId', async (req, res) => {
  const { orderId } = req.params;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendOrderStatusUpdate = async () => {
    try {
      // Fetch order status
      const orderStatus = await getOrderStatus(orderId);

      // If order status is completed, fetch delivery status
      if (orderStatus === 'completed') {
        const deliveryStatus = await axios.get(`http://delivery-service:8000/api/delivery-progress/${orderId}`);
        res.write(`data: ${JSON.stringify({ orderStatus, deliveryStatus: deliveryStatus.data })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify({ orderStatus })}\n\n`);
      }
    } catch (error) {
      console.error('Error fetching status:', error);
      res.write(`data: ${JSON.stringify({ orderStatus: "error" })}\n\n`);
    }
  };

  // Call sendOrderStatusUpdate every 5 seconds
  const intervalId = setInterval(sendOrderStatusUpdate, 5000);

  // Close SSE connection when the client disconnects
  req.on('close', () => {
    clearInterval(intervalId);
    res.end();
  });
});


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

