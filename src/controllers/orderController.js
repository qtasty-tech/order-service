const { produceOrderReadyEvent} = require('../kafka/producer');
const orderService = require('../services/orderService');
const { getMenuAvailability } = require('../utils/restaurantClient'); // Utility to call Restaurant Service
const axios = require('axios');

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
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const order = await orderService.getOrderById(orderId);  
    // Fetch user details
    const userResponse = await axios.get(`http://user-service:5000/api/users/${order.user}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => ({ data: { _id: order.user, name: 'Unknown Customer' } }));

    // Fetch restaurant details
    const restaurantResponse = await axios.get(`http://restaurant-service:5001/api/restaurants/${order.restaurant}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => ({ data: { _id: order.restaurant, name: 'Unknown Restaurant' } }));

    res.status(200).json({
      order: {
        ...order.toJSON(),
        user: userResponse.data,
        restaurant: restaurantResponse.data,
      },
    });
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
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const orders = await orderService.getOrdersByUser(userId);
    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const userResponse = await axios.get(`http://user-service:5000/api/users/${order.user}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ data: { _id: order.user, name: 'Unknown Customer' } }));

        const restaurantResponse = await axios.get(`http://restaurant-service:5001/api/restaurants/${order.restaurant}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ data: { _id: order.restaurant, name: 'Unknown Restaurant' } }));

        return {
          ...order.toJSON(),
          user: userResponse.data,
          restaurant: restaurantResponse.data,
        };
      })
    );

    res.status(200).json({ orders: ordersWithDetails });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * Get all orders for a specific restaurant.
 */
const getOrdersByRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const orders = await orderService.getOrdersByRestaurant(restaurantId);

    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const userResponse = await axios.get(`http://user-service:5000/api/auth/${order.user}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ data: { _id: order.user, name: 'Unknown Customer' } }));

        const restaurantResponse = await axios.get(`http://restaurant-service:5001/api/restaurants/${order.restaurant}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ data: { _id: order.restaurant, name: 'Unknown Restaurant' } }));

        return {
          ...order.toJSON(),
          user: userResponse.data,
          restaurant: restaurantResponse.data,
        };
      })
    );

    res.status(200).json({ orders: ordersWithDetails });
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

    const validStatuses = ['pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const updatedOrder = await orderService.updateOrderStatus(orderId, status);

    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (status === 'ready') {
      try {
        const token = req.headers.authorization?.split(' ')[1];
        await produceOrderReadyEvent(updatedOrder,token);
      } catch (kafkaError) {
        console.error('Kafka error in updateOrderStatus:', kafkaError);
        return res.status(500).json({ message: 'Order updated but failed to notify delivery service' });
      }
    }

    res.status(200).json({ message: 'Order status updated', updatedOrder });
  } catch (error) {
    console.error('Error in updateOrderStatus:', error);
    res.status(400).json({ message: error.message });
  }
};
module.exports = {
  createOrder,
  getOrderById,
  getOrdersByUser,
  updateOrderStatus,
  getOrdersByRestaurant
};
