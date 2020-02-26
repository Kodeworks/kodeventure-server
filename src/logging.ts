import chalk from 'chalk'

export enum LogLevel {
    DEBUG = 0,
    INFO = 10,
    WARNING = 20,
    ERROR = 30,
}

export class Log {
    public static level: LogLevel = LogLevel.DEBUG

    private static prefix(level: LogLevel, type?: string): string {
        const timestamp = chalk.gray(new Date().toISOString().slice(11, 23))
        let levelWrapper

        switch(level) {
            case LogLevel.DEBUG:
                levelWrapper = chalk.blueBright
                break
            case LogLevel.INFO:
                levelWrapper = chalk.white
                break
            case LogLevel.WARNING:
                levelWrapper = chalk.yellow
                break
            case LogLevel.ERROR:
                levelWrapper = chalk.red
                break
            default:
                levelWrapper = chalk.white
        }

        const levelToken = `${levelWrapper(LogLevel[level])}`.padEnd(7, ' ')

        if (type) type = ` [${levelWrapper(type)}]`
        else type = ''

        return `${timestamp} ${levelToken}${type}`
    }

    public static debug(msg: string, type?: string) {
        if (Log.level === LogLevel.DEBUG) {
            console.log(`${Log.prefix(LogLevel.DEBUG, type)} ${chalk.blueBright(msg)}`)
        }
    }

    public static info(msg: string, type?: string) {
        if (Log.level <= LogLevel.INFO) {
            console.log(`${Log.prefix(LogLevel.INFO, type)} ${msg}`)
        }
    }

    public static warning(msg: string, type?: string) {
        if (Log.level <= LogLevel.WARNING) {
            console.warn(`${Log.prefix(LogLevel.WARNING, type)} ${chalk.yellow(msg)}`)
        }
    }

    public static error(msg: string, type?: string) {
        if (Log.level <= LogLevel.ERROR) {
            console.error(`${Log.prefix(LogLevel.ERROR, type)} ${chalk.red(msg)}`)
        }
    }
}