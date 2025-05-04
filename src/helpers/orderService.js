const axios = require('axios');
const Order = require('../models/Order');

const getOrderStatus = async (orderId) => {
  try {
    const order = await Order.findById(orderId).lean();
    return order ? order.status : null;
  } catch (error) {
    console.error('Error fetching order status:', error);
    throw error;
  }
};

const streamOrderStatus = async (req, res) => {
  const { orderId } = req.params;

  // SSE setup
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Keep connection alive
  const keepAliveInterval = setInterval(() => {
    res.write(':ping\n\n');
  }, 30000);

  const sendUpdate = async () => {
    try {
      const orderStatus = await getOrderStatus(orderId);
      const data = { orderStatus };

      if (orderStatus === 'completed') {
        try {
          const response = await axios.get(
            `http://delivery-service:8000/api/deliveries/status/${orderId}`,
            { timeout: 2000 }
          );
          data.deliveryStatus = response.data.status;
        } catch (error) {
          console.error('Error fetching delivery status:', error.message);
          data.deliveryStatus = 'pending';
        }
      }

      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error('Order status update error:', error);
      res.write(`event: error\ndata: ${JSON.stringify({
        error: 'Failed to fetch order status'
      })}\n\n`);
    }
  };

  // Initial update
  await sendUpdate();

  // Set up polling
  const pollInterval = setInterval(sendUpdate, 3000);

  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(keepAliveInterval);
    clearInterval(pollInterval);
    res.end();
  });
};

module.exports = { getOrderStatus, streamOrderStatus };