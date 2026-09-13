const { get } = require("mongoose");
const analyticsService = require("../services/analyticsService");

const getAnalytics = async (req, res) =>{
    const {shortCode} = req.params;

    try {
        const result = await analyticsService.getAnalytics(shortCode);
    
        return res.json({
            success: true,
            result
        })
    } 
    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"    
        })    
    }
}

const getOverview = async(req, res) => {
    try {
        const result = await analyticsService.getOverview();

        return res.json({
            success: true,
            result
        })
    } 
    catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
}

const getClicksOverTime = async(req, res) => {
    try {
        const result = await analyticsService.getClicksOverTime();

        return res.json({
            success: true,
            result
        })
    }
    catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
}

const getTopUrls = async (req, res) => {
    try {
        const limit = Number(req.query.limit) || 10;
        const result = await analyticsService.getTopUrls(limit);

        return res.status(200).json({
            success: true,
            result
        });

    } 
    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getRecentActivity = async (req, res) => {
    try {
        const limit = Number(req.query.limit) || 10;
        const result = await analyticsService.getRecentActivity(limit);
        
        return res.json({
            success: true,
            result
        });
    } 
    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

const getUrlOverview = async (req, res) =>{
    try {
        const {shortCode} = req.params;
        const result = await analyticsService.getUrlOverview(shortCode);

        return res.json({
            success: true,
            result
        })
    } 
    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

module.exports = {
    getAnalytics,
    getOverview,
    getClicksOverTime,
    getTopUrls,
    getRecentActivity,
    getUrlOverview
}