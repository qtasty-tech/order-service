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

const produceOrderReadyEvent = async (order, token) => {
  try {

    const orderData = {
      data: order,
      token: token,
    };
    
    await producer.send({
      topic: "order-ready",
      messages: [{ value: JSON.stringify(orderData) }],
    });
    console.log("Order-ready event sent to Kafka:", orderData.data._id);
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
