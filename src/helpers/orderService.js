// orderService.js
const axios = require('axios');
const Order = require('../models/Order'); // Order model

// Fetch the current order status from the Order model
const getOrderStatus = async (orderId) => {
  const order = await Order.findById(orderId);
  return order ? order.status : null;
};

module.exports = { getOrderStatus };
