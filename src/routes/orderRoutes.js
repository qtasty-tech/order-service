const express = require('express');
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();

// Create order (protected route)
router.post('/', authMiddleware, orderController.createOrder);

// Get order by ID (protected route)
router.get('/:orderId', authMiddleware, orderController.getOrderById);

// Get all orders for a user (protected route)
router.get('/user/:userId', authMiddleware, orderController.getOrdersByUser);

// Get all orders for a restaurant (protected route)
router.get('/restaurant/:restaurantId', authMiddleware, orderController.getOrdersByRestaurant);

// Update order status (protected route)
router.put('/:orderId/status/:status', authMiddleware, orderController.updateOrderStatus);

module.exports = router;
