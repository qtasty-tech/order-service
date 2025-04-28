// order-service/src/repositories/orderRepository.js
const Order = require('../models/Order');

// Create a new order
const createOrder = async (orderData) => {
  const order = new Order(orderData);
  await order.save();
  return order;
};

// Get order by ID
const getOrderById = async (orderId) => {
  return await Order.findById(orderId);
};

// Get all orders for a user
const getOrdersByUser = async (userId) => {
  return await Order.find({ user: userId });
};

// Get all orders for a restaurant
const getOrdersByRestaurant = async (restaurantId) => {
  return await Order.find({ restaurant: restaurantId }).sort({ createdAt: -1 });
};

// Update order status
const updateOrderStatus = async (orderId, status) => {
  return await Order.findByIdAndUpdate(orderId, { status }, { new: true });
};

module.exports = {
  createOrder,
  getOrderById,
  getOrdersByUser,
  updateOrderStatus,
  getOrdersByRestaurant
};
