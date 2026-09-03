import sqlite3 from 'sqlite3';
import { Database } from 'sqlite3';

/** A device that has the widget installed, joined with the stop its owner saved. */
export interface WidgetDevice {
    deviceId: string;
    userId: string;
    stopNumber?: number;
    /** Hash of the payload last pushed to this device, so unchanged data is not pushed again. */
    lastPushHash?: string;
}

export interface IStorageService {
    getStop(userId: string): Promise<number | undefined>;
    saveStop(userId: string, stopNumber: number): Promise<void>;
    addWidgetDevice(deviceId: string, userId: string, packageId: string): Promise<void>;
    removeWidgetDevice(deviceId: string, packageId: string): Promise<void>;
    getWidgetDevices(): Promise<WidgetDevice[]>;
    setWidgetPushHash(deviceId: string, hash: string): Promise<void>;
}

export class SQLiteStorage implements IStorageService {
    private db: Database;
    private readonly tableName = 'user_stops';
    private readonly widgetTableName = 'widget_devices';

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
        this.db.run(`CREATE TABLE IF NOT EXISTS ${this.widgetTableName} (
            deviceId TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            packageId TEXT NOT NULL,
            installedAt TEXT NOT NULL,
            lastPushHash TEXT
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

    // -----------------------------------------------------------------------
    // Widget devices
    //
    // A widget reads from the device data store, it never calls the skill, so the only way to
    // keep it current is for the server to push. That means remembering which devices installed
    // it (Alexa.DataStore.PackageManager.UsagesInstalled) and which removed it.
    // -----------------------------------------------------------------------

    public addWidgetDevice(deviceId: string, userId: string, packageId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            // Re-installing clears lastPushHash so the next tick pushes a full payload.
            this.db.run(
                `INSERT OR REPLACE INTO ${this.widgetTableName} (deviceId, userId, packageId, installedAt, lastPushHash)
                 VALUES (?, ?, ?, ?, NULL)`,
                [deviceId, userId, packageId, new Date().toISOString()],
                (err) => err ? reject(err) : resolve()
            );
        });
    }

    public removeWidgetDevice(deviceId: string, packageId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(
                `DELETE FROM ${this.widgetTableName} WHERE deviceId = ? AND packageId = ?`,
                [deviceId, packageId],
                (err) => err ? reject(err) : resolve()
            );
        });
    }

    /** Every installed device with the stop its owner saved (undefined when they saved none). */
    public getWidgetDevices(): Promise<WidgetDevice[]> {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT w.deviceId, w.userId, w.lastPushHash, s.stopNumber
                 FROM ${this.widgetTableName} w
                 LEFT JOIN ${this.tableName} s ON s.userId = w.userId`,
                [],
                (err, rows: any[]) => {
                    if (err) return reject(err);
                    resolve(rows.map(r => ({
                        deviceId: r.deviceId,
                        userId: r.userId,
                        stopNumber: r.stopNumber ?? undefined,
                        lastPushHash: r.lastPushHash ?? undefined,
                    })));
                }
            );
        });
    }

    public setWidgetPushHash(deviceId: string, hash: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(
                `UPDATE ${this.widgetTableName} SET lastPushHash = ? WHERE deviceId = ?`,
                [hash, deviceId],
                (err) => err ? reject(err) : resolve()
            );
        });
    }
}
