const { Pool } = require("pg");

const poolConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: Number(process.env.DB_PORT)
    };

const pool = new Pool({
    ...poolConfig,
    max: 20
});

const connectDatabase = async () => {
    await pool.query("SELECT 1");
    console.log("Database connected");
};

module.exports = { 
    pool, 
    connectDatabase
};