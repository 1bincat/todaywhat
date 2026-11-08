import mysql from "mysql2/promise";

// 배포 환경에서는 환경변수(DB_*, 또는 Railway가 주는 MYSQL*)를 쓰고, 없으면 내 컴퓨터 설정을 써요.
const env = process.env;
const db = mysql.createPool({
  host: env.DB_HOST || env.MYSQLHOST || "localhost",
  port: Number(env.DB_PORT || env.MYSQLPORT || 3306),
  user: env.DB_USER || env.MYSQLUSER || "root",
  password: env.DB_PASSWORD || env.MYSQLPASSWORD || "",
  database: env.DB_NAME || env.MYSQLDATABASE || "today_what",
  timezone: "+09:00",
});

export default db;
