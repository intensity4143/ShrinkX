require("dotenv").config();
const express = require("express");
const app = express();
const {connectDatabase} = require("./config/database");
const urlRoutes = require("./routes/urlRoutes")
const analyticsRoutes = require("./routes/analyticsRoutes")
const {connectRedis } = require("./config/redis")
const {connectProducer} = require("./config/kafka");
const cors = require("cors");

app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173"
}));

const PORT = process.env.PORT || 3000;
app.use(express.json());


app.use('/', urlRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get("/", (req,res)=>{
    res.json({
        message: "welcome to backend server"
    });
})
app.get("/api/health", (req,res)=>{
    res.json({
        message: "server is healthy..."
    });
})

const startServer = async () => {
    try {
        await connectDatabase();
        await connectRedis();
        await connectProducer();
        
        app.listen(PORT, "0.0.0.0", () => {
            console.log(`server started at port ${PORT}`);
        }); 
    } 
    catch (error) {
        console.log("Failed to start server!", error) 
    }
}

startServer();