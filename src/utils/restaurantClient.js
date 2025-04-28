const axios = require('axios');

/**
 * Get menu availability from the Restaurant Service.
 * @param {String} restaurantId - The ID of the restaurant.
 * @param {String} token - The JWT token to authorize the request.
 * @returns {Object} - The response containing menu data.
 */
const getMenuAvailability = async (restaurantId, token) => {
  try {
    // const response = await axios.get(`http://restaurant-service:3000/api/restaurants/menu`, {
    //   headers: { Authorization: `Bearer ${token}` },
    //   params: { restaurantId }  // Pass restaurantId as a query parameter
    // });

    const response = await axios.get(`http://localhost:5001/api/restaurants/${restaurantId}/menu`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { restaurantId }  
    });
    const menuItems = response.data.categories?.flatMap(category => category.items) || [];
    return { menu: menuItems };
  } catch (error) {
    console.error('Error checking menu availability:', error.message);
    throw error;
  }
};

module.exports = { getMenuAvailability };
