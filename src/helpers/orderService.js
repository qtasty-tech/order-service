const axios = require('axios');
const Order = require('../models/Order');

const getOrderStatus = async (orderId) => {
  try {
    const order = await Order.findById(orderId);
    return order ? order.status : null;
  } catch (error) {
    console.error('Error fetching order status:', error);
    throw error;
  }
};

const streamOrderStatus = async (req, res) => {
  const { orderId } = req.params;

  // Set SSE headers and immediately flush
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let isConnectionAlive = true;

  // Handle client disconnect
  req.on('close', () => {
    isConnectionAlive = false;
    res.end();
  });

  const sendUpdate = async () => {
    if (!isConnectionAlive) return;

    try {
      const orderStatus = await getOrderStatus(orderId);
      const data = { orderStatus };

      // If order is completed, get delivery status
      if (orderStatus === 'completed') {
        try {
          const response = await axios.get(
            `http://delivery-service:8000/api/deliveries/status/${orderId}`,
            { timeout: 3000 }
          );
          data.deliveryStatus = response.data.status;
        } catch (error) {
          console.error('Error fetching delivery status:', error.message);
          data.deliveryStatus = 'pending';
        }
      }

      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error('Error in status update:', error);
      res.write(`data: ${JSON.stringify({ error: 'Status update failed' })}\n\n`);
    }
  };

  // Initial update
  await sendUpdate();

  // Periodic updates (every 3 seconds)
  const interval = setInterval(() => {
    if (isConnectionAlive) {
      sendUpdate();
    } else {
      clearInterval(interval);
    }
  }, 3000);
};

module.exports = { getOrderStatus, streamOrderStatus };