import sqlite3 from 'sqlite3';
import { Database } from 'sqlite3';

export interface IStorageService {
    getStop(userId: string): Promise<number | undefined>;
    saveStop(userId: string, stopNumber: number): Promise<void>;
}

export class SQLiteStorage implements IStorageService {
    private db: Database;
    private readonly tableName = 'user_stops';

    constructor(dbPath?: string) {
        const path = dbPath || process.env.DATABASE_PATH || 'storage.db';
        this.db = new sqlite3.Database(path, (err) => {
            if (err) {
                console.error('[SQLiteStorage] Could not connect to database', err);
            } else {
                console.log(`[SQLiteStorage] Connected to database at ${path}`);
                this.initialize();
            }
        });
    }

    private initialize() {
        this.db.run(`CREATE TABLE IF NOT EXISTS ${this.tableName} (
            userId TEXT PRIMARY KEY,
            stopNumber INTEGER
        )`);
    }

    public getStop(userId: string): Promise<number | undefined> {
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT stopNumber FROM ${this.tableName} WHERE userId = ?`, [userId], (err, row: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row ? row.stopNumber : undefined);
                }
            });
        });
    }

    public saveStop(userId: string, stopNumber: number): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(`INSERT OR REPLACE INTO ${this.tableName} (userId, stopNumber) VALUES (?, ?)`, [userId, stopNumber], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
}
