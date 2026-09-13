const { createClient } = require("redis");

const redis = createClient({
    url: process.env.REDIS_URL
})

redis.on("error", (error)=>{
    console.log("Redis Client Error", error)
})  

const connectRedis = async() => {
    await redis.connect();
    console.log("Redis connected succesfully")
}

module.exports = {
    redis,
    connectRedis
};