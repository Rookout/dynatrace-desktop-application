import {dialog} from "electron";

const path = require("path");

const PROTOCOLS = ["dynatrace", "rookout"];

export const initDeeplinks = (app: Electron.App) => {
    PROTOCOLS.forEach(protocol => {
        if (process.defaultApp) {
            if (process.argv.length >= 2) {
                app.setAsDefaultProtocolClient(protocol, process.execPath, [path.resolve(process.argv[1])]);
            }
        } else {
            app.setAsDefaultProtocolClient(protocol);
        }
    });

    app.on("open-url", deeplinkHandler);
};

export const deeplinkHandler = () => {
   dialog.showMessageBoxSync({title: "Dynatrace Desktop App", message: "Dynatrace Desktop App is now running"});
};