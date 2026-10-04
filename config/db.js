import mysql from "mysql2/promise";

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "1234",
  database: "today_what",
  timezone: "+09:00",
});

export default db;