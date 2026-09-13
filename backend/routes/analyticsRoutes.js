const express = require("express")
const router = express.Router()

const { getAnalytics, getOverview, getClicksOverTime, getTopUrls, getRecentActivity, getUrlOverview } = require("../controllers/analyticsControllers")

router.get("/overview", getOverview);
router.get("/clicks-over-time", getClicksOverTime);
router.get("/top-urls", getTopUrls);
router.get("/recent-activity", getRecentActivity);
router.get("/url-overview/:shortCode", getUrlOverview);

// to get analytics about shortcode
router.get("/api/analytics/:shortCode", getAnalytics);

module.exports = router;