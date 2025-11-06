import * as fs from 'fs';
import * as path from 'path';

type Level = 'log' | 'debug' | 'warn' | 'error';

export class LogWriter {
    private static ensureDir(dir: string) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    private static getLogFilePath(): string {
        const now = new Date();
        const mm = now.getMonth() + 1; // 1-12
        const dd = now.getDate();
        const yy = now.getFullYear() % 100; // last two digits
        const fileName = `logs_${mm}_${dd}_${yy}`;
        const logsDir = path.resolve(process.cwd(), 'backend', 'logs');
        this.ensureDir(logsDir);
        return path.join(logsDir, fileName);
    }

    static append(level: Level, context: string, message: string) {
        try {
            const ts = new Date().toISOString();
            const line = `${ts} [${level.toUpperCase()}] [${context}] ${message}\n`;
            const file = this.getLogFilePath();
            fs.appendFile(file, line, (err) => {
                if (err) {
                    console.error('Failed to write log file:', err.message);
                }
            });
        } catch (e: any) {
            console.error('LogWriter error:', e?.message || e);
        }
    }
}


