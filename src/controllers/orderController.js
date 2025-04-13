// order-service/src/controllers/orderController.js
const orderService = require('../services/orderService');

// Create an order
const createOrder = async (req, res) => {
  try {
    const orderData = req.body;
    const order = await orderService.createOrder(orderData);
    res.status(201).json({ message: 'Order created successfully', order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get an order by ID
const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await orderService.getOrderById(orderId);
    res.status(200).json({ order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all orders for a user
const getOrdersByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await orderService.getOrdersByUser(userId);
    res.status(200).json({ orders });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.params;
    const updatedOrder = await orderService.updateOrderStatus(orderId, status);
    res.status(200).json({ message: 'Order status updated', updatedOrder });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  createOrder,
  getOrderById,
  getOrdersByUser,
  updateOrderStatus,
};
