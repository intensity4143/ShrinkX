const express = require("express")
const router = express.Router()

const { getAnalytics, getOverview, getClicksOverTime, getTopUrls, getRecentActivity, getUrlOverview } = require("../controllers/analyticsControllers")

router.get("/api/analytics/overview", getOverview);
router.get("/api/analytics/clicks-over-time", getClicksOverTime);
router.get("/api/analytics/top-urls", getTopUrls);
router.get("/api/analytics/recent-activity", getRecentActivity);
router.get("/api/analytics/url-overview/:shortCode", getUrlOverview);

// to get analytics about shortcode
router.get("/api/analytics/:shortCode", getAnalytics);

module.exports = router;