require("dotenv").config();
const express = require("express");
const app = express();
const {connectDatabase} = require("./config/database");
const urlRoutes = require("./routes/urlRoutes")
const analyticsRoutes = require("./routes/analyticsRoutes")
const {connectRedis } = require("./config/redis")
const {connectProducer} = require("./config/kafka");

const PORT = process.env.PORT || 3000;
app.use(express.json());


app.use('/', urlRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get("/", (req,res)=>{
    res.json({
        message: "welcome to backend server"
    });
})

const startServer = async () => {
    try {
        await connectDatabase();
        await connectRedis();
        await connectProducer();
        
        app.listen(PORT, ()=>{
        console.log(`server started at port ${PORT}`)
        })  
    } 
    catch (error) {
        console.log("Failed to start server!", error) 
    }
}

startServer();