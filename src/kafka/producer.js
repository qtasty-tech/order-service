const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "order-service",
  brokers: ["kafka:9092"],
  retry: {
    initialRetryTime: 100,
    retries: 8,
  },
});

const producer = kafka.producer();

const connectProducer = async () => {
  try {
    await producer.connect();
    console.log("Kafka producer connected");
  } catch (error) {
    console.error("Error connecting Kafka producer:", error);
  }
};

const produceOrderReadyEvent = async (order,token) => {
  try {
    const userData = {
      _id: order.user._id || order.user, // Handle both ObjectId and populated user
      name: order.user.name || 'Unknown Customer',
      phone: order.user.phone || 'Unknown',
    };

    const orderData = {
      _id: order._id,
      user: userData,
      restaurant: order.restaurant._id || order.restaurant,
      items: order.items,
      totalAmount: order.totalAmount,
      status: order.status,
      deliveryAddress: order.deliveryAddress,
      customerLocation: order.customerLocation || { type: 'Point', coordinates: [0, 0] }, 
      specialInstructions: order.specialInstructions || '',
      paymentMethod: order.paymentMethod || 'unknown',
      deliveryTime: order.deliveryTime,
      deliveryType: order.deliveryType,
      token: token || '', 
      createdAt: order.createdAt,
    };
    await producer.send({
      topic: "order-ready",
      messages: [{ value: JSON.stringify(orderData) }],
    });
    console.log("Order-ready event sent to Kafka:", orderData._id);
  } catch (error) {
    console.error("Error sending message to Kafka:", error);
    throw new Error("Failed to send order-ready event to Kafka");
  }
};

// Connect producer at startup
connectProducer().catch((error) => {
  console.error("Failed to initialize Kafka producer:", error);
});

module.exports = { connectProducer, produceOrderReadyEvent, producer };