import { ipcRenderer } from "electron";
import { app, getCurrentWindow } from "@electron/remote";

import {IpcChannel} from "../../typings";

export const closeWindow = () => {
    const w = getCurrentWindow();
    if (window.process.platform.match("darwin")) {
        app.dock.hide();
    }
    w.hide();
    ipcRenderer.send(IpcChannel.HIDDEN);
};

export const exitApplication = () => {
  ipcRenderer.send(IpcChannel.FORCE_EXIT);
};
