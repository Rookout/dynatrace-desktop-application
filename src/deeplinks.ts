import {dialog} from "electron";
import path from "path";

const PROTOCOLS = ["rookout", "dynatrace"];

export const initDeeplinks = (app: Electron.App) => {
    PROTOCOLS.forEach(protocol => {
        if (!process.defaultApp) {
            app.setAsDefaultProtocolClient(protocol);
            return;
        }
        if (process.argv.length >= 2) {
            app.setAsDefaultProtocolClient(protocol, process.execPath, [path.resolve(process.argv[1])]);
        }
    });

    app.on("open-url", deeplinkHandler);
    deeplinkHandler();
};

export const deeplinkHandler = () => {
   dialog.showMessageBoxSync({title: "Dynatrace Desktop App", message: "Dynatrace Desktop App is now running"});
};
