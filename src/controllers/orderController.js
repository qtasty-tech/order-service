const orderService = require('../services/orderService');
const { getMenuAvailability } = require('../utils/restaurantClient'); // Utility to call Restaurant Service

/**
 * Create an order.
 * Before creating the order, check the Restaurant Service for menu availability.
 */
const createOrder = async (req, res) => {
  try {
    const orderData = req.body;
    // Extract token to pass along to the Restaurant Service (if needed)
    const token = req.header('Authorization')?.replace('Bearer ', '');

    // Check menu availability from Restaurant Service.
    // Here, orderData.restaurant should contain the restaurant ID.
    const menuAvailability = await getMenuAvailability(orderData.restaurant, token);

    if (!menuAvailability || !menuAvailability.menu || menuAvailability.menu.length === 0) {
      return res.status(400).json({ message: 'Menu not available for the selected restaurant' });
    }

    // Proceed to create the order.
    const order = await orderService.createOrder(orderData);
    res.status(201).json({ message: 'Order created successfully', order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * Get an order by ID.
 */
const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await orderService.getOrderById(orderId);
    res.status(200).json({ order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * Get all orders for a specific user.
 */
const getOrdersByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await orderService.getOrdersByUser(userId);
    res.status(200).json({ orders });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * Update order status.
 */
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
