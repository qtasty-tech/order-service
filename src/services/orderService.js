// order-service/src/services/orderService.js
const orderRepository = require('../repositories/orderRepository');

// Create an order
const createOrder = async (orderData) => {
  const order = await orderRepository.createOrder(orderData);
  return order;
};

// Get an order by ID
const getOrderById = async (orderId) => {
  const order = await orderRepository.getOrderById(orderId);
  return order;
};

// Get all orders for a user
const getOrdersByUser = async (userId) => {
  const orders = await orderRepository.getOrdersByUser(userId);
  return orders;
};

// Update order status
const updateOrderStatus = async (orderId, status) => {
  const updatedOrder = await orderRepository.updateOrderStatus(orderId, status);
  return updatedOrder;
};

module.exports = {
  createOrder,
  getOrderById,
  getOrdersByUser,
  updateOrderStatus,
};
