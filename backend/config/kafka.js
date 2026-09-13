const {Kafka} = require("kafkajs");
const KAFKA_BROKER = process.env.KAFKA_BROKER;

const kafka = new Kafka({
  clientId: 'url-shortner',
  brokers: [KAFKA_BROKER],
})

const producer = kafka.producer();

const connectProducer = async() => {
    await producer.connect();
    console.log("connected to kafka");
}

module.exports = {
    producer,
    connectProducer,
};