const { pool } = require("../config/database");

const getVisitCount = async(shortCode) =>{
    const result = await pool.query(
        `SELECT count(*) As total_visits
         FROM analytics_events
         WHERE short_code = $1`,
        [shortCode]
    );

    return result.rows[0];
}

const getUrlOverview = async (shortCode) => {
    const result = await pool.query(`
        SELECT
            u.short_code,
            u.original_url,
            COUNT(a.id) AS total_clicks,
            COUNT(*) FILTER (
                WHERE a.visited_at >= CURRENT_DATE
            ) AS today_clicks,
            COUNT(*) FILTER (
                WHERE a.visited_at >= CURRENT_DATE - INTERVAL '6 days'
            ) AS last_7_days_clicks,
            COUNT(*) FILTER (
                WHERE a.visited_at >= CURRENT_DATE - INTERVAL '29 days'
            ) AS last_30_days_clicks,
        MAX(a.visited_at) AS last_clicked_at

        FROM urls u
        LEFT JOIN analytics_events a
            ON u.short_code = a.short_code
        WHERE u.short_code = $1
        GROUP BY u.short_code, u.original_url;
    `, [shortCode]);

    return result.rows[0] || null;
};

const getOverview = async () => {
    const result = await pool.query(`
        SELECT
            (SELECT COUNT(*) FROM urls) AS total_urls,
            (SELECT COUNT(*) FROM analytics_events) AS total_clicks,
            (SELECT COUNT(*)
             FROM analytics_events
             WHERE visited_at >= CURRENT_DATE) AS today_clicks,
            (SELECT COUNT(*)
             FROM analytics_events
             WHERE visited_at >= CURRENT_DATE - INTERVAL '6 days') AS last_7_days_clicks
    `);

    return result.rows[0];
};

const getClicksOverTime = async () => {
    const result = await pool.query(`
        SELECT
            TO_CHAR(days.date, 'YYYY-MM-DD') AS date,
            COALESCE(COUNT(a.id), 0) AS clicks
        FROM generate_series(
            CURRENT_DATE - INTERVAL '6 days',
            CURRENT_DATE,
            INTERVAL '1 day'
        ) AS days(date)

        LEFT JOIN analytics_events a
            ON (a.visited_at AT TIME ZONE 'Asia/Kolkata')::date = days.date::date

        GROUP BY days.date
        ORDER BY days.date;
    `);

    return result.rows;
};

const getTopUrls = async (limit = 10) => {
    const result = await pool.query(`
        SELECT
            u.short_code,
            u.original_url,
            COUNT(a.id) AS clicks,
            MAX(a.visited_at) AS last_clicked_at
        FROM urls u
        LEFT JOIN analytics_events a
            ON u.short_code = a.short_code
        GROUP BY
            u.short_code,
            u.original_url
        ORDER BY clicks DESC
        LIMIT $1`, 
        [limit]);

    return result.rows;
};

const getRecentActivity = async(limit = 10) => {
    const result = await pool.query(
        `SELECT a.short_code, u.original_url, a.visited_at
        FROM analytics_events a
        JOIN urls u ON a.short_code = u.short_code
        ORDER BY a.visited_at DESC
        LIMIT $1`,
        [limit]
    )

    return result.rows;
};

module.exports = {
    getVisitCount,
    getOverview,
    getClicksOverTime,
    getTopUrls,
    getRecentActivity,
    getUrlOverview
}