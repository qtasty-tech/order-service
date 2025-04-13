const axios = require('axios');

/**
 * Get menu availability from the Restaurant Service.
 * @param {String} restaurantId - The ID of the restaurant.
 * @param {String} token - The JWT token to authorize the request.
 * @returns {Object} - The response containing menu data.
 */
const getMenuAvailability = async (restaurantId, token) => {
  try {
    const response = await axios.get(`http://restaurant-service:3000/api/restaurants/menu`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { restaurantId }  // Pass restaurantId as a query parameter
    });
    return response.data;  // Should return an object with a 'menu' property
  } catch (error) {
    console.error('Error checking menu availability:', error.message);
    throw error;
  }
};

module.exports = { getMenuAvailability };
