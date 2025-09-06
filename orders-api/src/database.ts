import mysql from 'mysql2/promise';
import 'dotenv/config';

export class Database {
  private connection: mysql.Connection | null = null;

  async connect() {
    if (!this.connection) {
      this.connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'user',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'backend_test',
        port: parseInt(process.env.DB_PORT || '3306'),
      });
    }
    return this.connection;
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }

  async query(sql: string, params: any[] = []) {
    const conn = await this.connect();
    const [rows] = await conn.execute(sql, params);
    return rows;
  }
}
