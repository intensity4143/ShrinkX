const {pool} = require("../config/database");

const createUrl = async (id, originalUrl, shortCode) => {
    const result = await pool.query(
        `INSERT INTO urls (id, original_url, short_code)
         OVERRIDING SYSTEM VALUE
         VALUES ($1, $2, $3)
         RETURNING id, original_url, short_code, created_at`,
        [id, originalUrl, shortCode]
    );

    return result.rows[0];
};


const getByShortCode = async (shortCode) => {
    const result = await pool.query(
        `SELECT original_url
         FROM urls
         WHERE short_code = $1`,
        [shortCode]
    );

    return result.rows[0] || null;
};


const getByLongUrl = async (originalUrl) => {
    const result = await pool.query(
        `SELECT short_code
         FROM urls
         WHERE original_url = $1`,
        [originalUrl]
    );

    return result.rows[0] || null;
};


const getNextId = async () => {
    const result = await pool.query(
        `SELECT nextval('urls_id_seq') AS id`
    );

    return result.rows[0].id;
};

const insertAnalyticsEvent = async (shortCode, timestamp) =>{

    const dbInfo = await pool.query(`
    SELECT
        current_database(),
        current_user,
        inet_server_addr(),
        inet_server_port()
`);

console.log("CONSUMER DB:", dbInfo.rows[0]);

    console.log("inserting into db..")
    const result = await pool.query(
        `INSERT into analytics_events (short_code, visited_at)
        VALUES ($1, $2)
        RETURNING id, short_code, visited_at`,
        [shortCode, timestamp]
    );

    console.log("inserted successfully....")
    return result.rows[0];
}


module.exports = {
    createUrl,
    getByShortCode,
    getByLongUrl,
    getNextId,
    insertAnalyticsEvent
};