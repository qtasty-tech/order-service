const Order = require("../models/Order");
const mongoose = require("mongoose");
const axios = require("axios");

/**
 * Get aggregated metrics and paginated orders for a restaurant.
 */
const getRestaurantMetrics = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { startDate, endDate, page = 1, limit = 50, status } = req.query;
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: "Invalid restaurant ID" });
    }

    // Parse query parameters
    const baseQuery = { restaurant: new mongoose.Types.ObjectId(restaurantId) };
    if (startDate && endDate) {
      baseQuery.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Query for orders (apply status filter if provided)
    const ordersQuery = { ...baseQuery };
    if (status) {
      ordersQuery.status = status;
    }

    // MongoDB aggregation for metrics
    const metricsPipeline = [
      { $match: baseQuery },
      {
        $facet: {
          // Main metrics (revenue, orders, customers)
          metrics: [
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: "$totalAmount" },
                totalOrders: { $sum: 1 },
                avgOrderValue: { $avg: "$totalAmount" },
                customerCount: { $addToSet: "$user" },
              },
            },
            {
              $project: {
                totalRevenue: 1,
                totalOrders: 1,
                avgOrderValue: 1,
                customerCount: { $size: "$customerCount" },
              },
            },
          ],
          // Pending orders count
          pendingOrders: [
            { $match: { status: "pending" } },
            {
              $group: {
                _id: null,
                pendingOrdersCount: { $sum: 1 },
              },
            },
          ],
          // Daily breakdown for the week or month
          dailyBreakdown: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$createdAt",
                    timezone: "UTC",
                  },
                },
                revenue: { $sum: "$totalAmount" },
                orders: { $sum: 1 },
                customers: { $addToSet: "$user" },
              },
            },
            {
              $project: {
                _id: 0,
                date: "$_id",
                revenue: 1,
                orders: 1,
                customerCount: { $size: "$customers" },
              },
            },
            { $sort: { date: 1 } },
          ],
          // Hourly breakdown for peak hours
          hourlyBreakdown: [
            {
              $group: {
                _id: { $hour: { date: "$createdAt", timezone: "UTC" } },
                orders: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                hour: "$_id",
                orders: 1,
              },
            },
            { $sort: { hour: 1 } },
          ],
          // Category breakdown (item quantities)
          categoryBreakdown: [
            { $unwind: "$items" },
            {
              $group: {
                _id: "$items.name",
                value: { $sum: "$items.quantity" },
              },
            },
            {
              $project: {
                _id: 0,
                name: "$_id",
                value: 1,
              },
            },
            { $sort: { value: -1 } },
          ],
        },
      },
      {
        $project: {
          metrics: { $arrayElemAt: ["$metrics", 0] },
          pendingOrdersCount: {
            $arrayElemAt: ["$pendingOrders.pendingOrdersCount", 0],
          },
          dailyBreakdown: 1,
          hourlyBreakdown: 1,
          categoryBreakdown: 1,
        },
      },
    ];

    const [metricsResult] = await Order.aggregate(metricsPipeline).exec();
    console.log("Aggregation result:", JSON.stringify(metricsResult, null, 2));

    // Fetch paginated orders
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const orders = await Order.find(ordersQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean()
      .exec();

    console.log(
      "Fetched orders:",
      orders.length,
      "Query:",
      JSON.stringify(ordersQuery, null, 2)
    );

    // Fetch user and restaurant details for orders
    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const userResponse = await axios
          .get(`http://user-service:5000/api/auth/${order.user}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .catch(() => ({
            data: { _id: order.user, name: "Unknown Customer" },
          }));

        const restaurantResponse = await axios
          .get(
            `http://restaurant-service:5001/api/restaurants/${order.restaurant}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          )
          .catch(() => ({
            data: { _id: order.restaurant, name: "Unknown Restaurant" },
          }));

        return {
          ...order,
          user: userResponse.data,
          restaurant: restaurantResponse.data,
        };
      })
    );

    // Prepare response
    const response = {
      metrics: {
        totalRevenue: metricsResult?.metrics?.totalRevenue || 0,
        totalOrders: metricsResult?.metrics?.totalOrders || 0,
        avgOrderValue: metricsResult?.metrics?.avgOrderValue || 0,
        customerCount: metricsResult?.metrics?.customerCount || 0,
        pendingOrdersCount: metricsResult?.pendingOrdersCount || 0,
        categoryBreakdown: metricsResult?.categoryBreakdown || [],
        dailyBreakdown: metricsResult?.dailyBreakdown || [],
        hourlyBreakdown: metricsResult?.hourlyBreakdown || [],
      },
      orders: ordersWithDetails,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalOrders: metricsResult?.pendingOrdersCount || orders.length,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching restaurant metrics:", error);
    res
      .status(500)
      .json({ message: "Error fetching metrics", error: error.message });
  }
};

module.exports = { getRestaurantMetrics };
