const { Kafka } = require("kafkajs");
const fs = require("fs");

const kafkaConfig = {
    clientId: "url-shortner",
    brokers: [process.env.KAFKA_BROKER]
};

if (process.env.KAFKA_USERNAME && process.env.KAFKA_PASSWORD) {
    const caPath =
        process.env.KAFKA_CA_PATH || "./certs/aiven-ca.pem";

    if (!fs.existsSync(caPath)) {
        throw new Error(`Kafka CA certificate not found at: ${caPath}`);
    }

    kafkaConfig.ssl = {
        ca: [fs.readFileSync(caPath, "utf-8")]
    };

    kafkaConfig.sasl = {
        mechanism: "scram-sha-256",
        username: process.env.KAFKA_USERNAME,
        password: process.env.KAFKA_PASSWORD
    };
}

const kafka = new Kafka(kafkaConfig);

const producer = kafka.producer();

const connectProducer = async () => {
    await producer.connect();
    console.log("connected to kafka");
};

module.exports = {
    producer,
    connectProducer
};