// order-service/src/kafka/producer.js
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'order-service',
  brokers: ['kafka:9092'],
});

const producer = kafka.producer();

const produceOrderReadyEvent = async (order) => {
  await producer.send({
    topic: 'order-ready',
    messages: [
      { value: JSON.stringify(order) },
    ],
  });
};

module.exports = { produceOrderReadyEvent };
