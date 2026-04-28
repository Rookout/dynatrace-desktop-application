import _ from "lodash";
import log4js, {Logger} from "log4js";
import path from "path";
import {getStoreSafe} from "./explorook-store";
import configure from "./logsContainerAppender";
import {getLibraryFolder} from "./utils";

const LOG_LEVEL_KEY = "logLevel";

const loggers: { [key: string]: Logger } = {};

const store = getStoreSafe();
let logLevel = store.get(LOG_LEVEL_KEY, null);
if (!logLevel) {
    store.set(LOG_LEVEL_KEY, "debug");
    logLevel = "debug";
}

const getLogFileLocation = () => path.join(getLibraryFolder(), "dynatrace.log");

log4js.configure({
    appenders: {
        "file": {type: "file", filename: getLogFileLocation()},
        "logs-container": {
            type: { configure },
        }
    },
    categories: {
        default: {appenders: ["file", "logs-container"], level: logLevel},
    }
});

export const setLogLevel = (newLogLevel: string) => {
    store.set(LOG_LEVEL_KEY, newLogLevel);
    _.forEach(loggers, (logger: Logger) => {
        logger.level = newLogLevel;
    });
};

export const getLogger = (loggerName: string): Logger => {
    if (!loggers[loggerName]) {
        loggers[loggerName] = log4js.getLogger(loggerName);
    }

    return loggers[loggerName];
};
