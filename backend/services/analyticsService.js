const analyticsRepository = require("../repository/analyticsRepository")

const getAnalytics = async(shortCode) => {
    const data = await analyticsRepository.getVisitCount(shortCode);

    return {
        shortCode,
        totalVisits : data.total_visits
    }
}

const getOverview = async() => {
    const data = await analyticsRepository.getOverview();
    
    return {
        totalUrls: Number(data.total_urls),
        totalClicks: Number(data.total_clicks),
        clicksToday: Number(data.today_clicks),
        clicksLast7Days: Number(data.last_7_days_clicks)
    };
};

const getClicksOverTime = async () => {
    const data = await analyticsRepository.getClicksOverTime();

    return data.map((item) => ({
        date: item.date,
        clicks: Number(item.clicks)
    }));
};

const getTopUrls = async (limit = 10) => {
    const data = await analyticsRepository.getTopUrls(limit);

    return data.map((item) => ({
        shortCode: item.short_code,
        originalUrl: item.original_url,
        clicks: Number(item.clicks),
        lastClickedAt: item.last_clicked_at
    }));
};

const getRecentActivity = async (limit = 10) =>{
    const data = await analyticsRepository.getRecentActivity(limit);

    return data.map((item) => ({
        shortCode: item.short_code,
        originalUrl: item.original_url,
        visitedAt: item.visited_at
    }));
};

const getUrlOverview = async (shortCode) => {
    const data = await analyticsRepository.getUrlOverview(shortCode);

    if(!data){
        return null;
    }

    return {
        shortCode: data.short_code,
        originalUrl: data.original_url,
        totalClicks: Number(data.total_clicks),
        todayClicks: Number(data.today_clicks),
        last7DaysClicks: Number(data.last_7_days_clicks),
        last30DaysClicks: Number(data.last_30_days_clicks),
        lastClickedAt: data.last_clicked_at
    };
};

module.exports = {
    getAnalytics,
    getOverview,
    getClicksOverTime,
    getTopUrls,
    getRecentActivity,
    getUrlOverview
}