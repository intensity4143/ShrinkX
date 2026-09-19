const { Kafka } = require("kafkajs");
const { insertAnalyticsEvent } = require("../repository/urlRepository");
const fs = require("fs");

const kafkaConfig = {
    clientId: "analytics-consumer",
    brokers: [process.env.KAFKA_BROKER]
};

if (process.env.KAFKA_USERNAME && process.env.KAFKA_PASSWORD) {
    kafkaConfig.ssl = {
        ca: [
            fs.readFileSync(
                process.env.KAFKA_CA_PATH || "./certs/aiven-ca.pem",
                "utf-8"
            )
        ]
    };

    kafkaConfig.sasl = {
        mechanism: "scram-sha-256",
        username: process.env.KAFKA_USERNAME,
        password: process.env.KAFKA_PASSWORD
    };
}

const kafka = new Kafka(kafkaConfig);

const consumer = kafka.consumer({ groupId: 'analytics-group' })

const startConsumer = async() =>{
    await consumer.connect()
    
    await consumer.subscribe({
        topic: 'analytics-events', 
        fromBeginning: false 
    })

    console.log("consumer connected to kafka")

    await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
        const event = JSON.parse(message.value.toString());
        await insertAnalyticsEvent(event.shortCode, event.timestamp);

        console.log("Analytics event consumed", event)
    },
    })
}

module.exports = {
    startConsumer
}   