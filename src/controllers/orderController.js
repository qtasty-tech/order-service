const { produceOrderReadyEvent} = require('../kafka/producer');
const orderService = require('../services/orderService');
const { getMenuAvailability } = require('../utils/restaurantClient'); // Utility to call Restaurant Service
const axios = require('axios');
const Order = require('../models/Order'); // Assuming you have an Order model
const mongoose = require('mongoose');


/**
 * Create an order.
 * Before creating the order, check the Restaurant Service for menu availability.
 */
const createOrder = async (req, res) => {
  try {
    const {
      user,
      restaurant,
      customer,
      phone,
      items,
      totalAmount,
      deliveryAddress,
      deliverylocation, // Changed to match schema
      paymentMethod,
      paymentTransaction
    } = req.body;

    // Validate required fields
    if (!restaurant) {
      return res.status(400).json({ message: 'Restaurant ID is required' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Valid items array required' });
    }

    // Validate geolocation data
    if (!deliverylocation) {
      return res.status(400).json({ message: 'Delivery location is required' });
    }

    if (deliverylocation.type !== 'Point') {
      return res.status(400).json({ message: 'Invalid location type' });
    }

    if (!Array.isArray(deliverylocation.coordinates) || 
    deliverylocation.coordinates.length !== 2) {
      return res.status(400).json({ message: 'Invalid coordinates format' });
    }

    const [longitude, latitude] = deliverylocation.coordinates;
    if (typeof longitude !== 'number' || typeof latitude !== 'number') {
      return res.status(400).json({ message: 'Invalid coordinate values' });
    }

    // Validate item structure
    for (const item of items) {
      if (!item.name || !item.quantity || !item.price) {
        return res.status(400).json({ 
          message: 'Each item requires name, quantity, and price'
        });
      }
    }

    // Create new order with geolocation
    const order = new Order({
      user,
      restaurant,
      customer,
      phone,
      items: items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      totalAmount,
      deliveryAddress,
      deliverylocation: { // Add geolocation data
        type: 'Point',
        coordinates: deliverylocation.coordinates
      },
      paymentMethod: paymentMethod || 'payhere',
      paymentTransaction,
      status: 'pending'
    });

    const savedOrder = await order.save();

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        _id: savedOrder._id,
        restaurant: savedOrder.restaurant,
        totalAmount: savedOrder.totalAmount,
        status: savedOrder.status,
        items: savedOrder.items,
        deliveryLocation: savedOrder.deliverylocation // Return location in response
      }
    });

  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({
      message: 'Error creating order',
      error: error.message
    });
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
