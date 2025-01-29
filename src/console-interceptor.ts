import fs from 'node:fs';
import path from 'node:path';
import util from 'node:util';

const LOG_DIR = 'logs';
const APP_LOG = path.join(LOG_DIR, 'combined.log');
const ERROR_LOG = path.join(LOG_DIR, 'error.log');

// Создаем директорию для логов если её нет
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Создаем потоки для записи
const appLogStream = fs.createWriteStream(APP_LOG, { flags: 'a' });
const errorLogStream = fs.createWriteStream(ERROR_LOG, { flags: 'a' });

// Сохраняем оригинальные методы консоли
const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug
};

// Функция для форматирования сообщений
function formatMessage(type: string, args: any[]): string {
    const timestamp = new Date().toISOString();
    const message = args.map(arg =>
        typeof arg === 'object' ? util.inspect(arg, { depth: null }) : String(arg)
    ).join(' ');

    return `[${timestamp}] [${type}] ${message}\n`;
}

// Переопределяем методы консоли
console.log = function(...args) {
    const logMessage = formatMessage('LOG', args);
    appLogStream.write(logMessage);
    originalConsole.log.apply(console, args);
};

console.error = function(...args) {
    const logMessage = formatMessage('ERROR', args);
    appLogStream.write(logMessage);
    errorLogStream.write(logMessage);
    originalConsole.error.apply(console, args);
};

console.warn = function(...args) {
    const logMessage = formatMessage('WARN', args);
    appLogStream.write(logMessage);
    errorLogStream.write(logMessage);
    originalConsole.warn.apply(console, args);
};

console.info = function(...args) {
    const logMessage = formatMessage('INFO', args);
    appLogStream.write(logMessage);
    originalConsole.info.apply(console, args);
};

console.debug = function(...args) {
    const logMessage = formatMessage('DEBUG', args);
    appLogStream.write(logMessage);
    originalConsole.debug.apply(console, args);
};

// Обработка необработанных ошибок
process.on('uncaughtException', (err) => {
    const logMessage = formatMessage('UNCAUGHT_EXCEPTION', [err.stack || err]);
    appLogStream.write(logMessage);
    errorLogStream.write(logMessage);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    const logMessage = formatMessage('UNHANDLED_REJECTION', [{
        reason,
        promise: promise.toString()
    }]);
    appLogStream.write(logMessage);
    errorLogStream.write(logMessage);
});

// Корректное закрытие потоков при выходе
process.on('exit', () => {
    appLogStream.end();
    errorLogStream.end();
});

process.on('SIGTERM', () => {
    const logMessage = formatMessage('SIGTERM', ['Process terminated']);
    appLogStream.write(logMessage);
    errorLogStream.write(logMessage);
    process.exit(0);
});

process.on('SIGINT', () => {
    const logMessage = formatMessage('SIGINT', ['Process interrupted']);
    appLogStream.write(logMessage);
    errorLogStream.write(logMessage);
    process.exit(0);
});
