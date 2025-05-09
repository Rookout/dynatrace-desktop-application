import React, { useState } from "react";
import { Close } from "@material-ui/icons";
import { ipcRenderer } from "electron";
import { app } from "@electron/remote";
import { Menu, MenuItem } from "@material-ui/core";
import { closeWindow } from "../utils";
import * as Store from "electron-store";

const DYNATRACE_DESKTOP_APPLICATION_VERSION = app.getVersion();

export const Header = () => {
    const [anchorEl, setAnchorEl] = useState(null);
    const [open, setOpen] = useState(false);

    const onCloseRightClick = e => {
        e.preventDefault();
        setOpen(true);
        setAnchorEl(e.currentTarget);
    };

    const startDebug = e => {
        ipcRenderer.send("inspect-all");
        setOpen(false);
    };

    const store = new Store({ name: "explorook" });
    const isLogLevelDebug = store.get("logLevel", "debug") === "debug";
    const setLogLever = isDebug => {
        ipcRenderer.sendTo(window.indexWorkerId, "set-log-level", isDebug ? "debug" : "error")
        setOpen(false);
    }
    const clearAllRepos = () => {
        ipcRenderer.sendTo(window.indexWorkerId, "clear-all-repos");
        setOpen(false);
    }

    return (
        <div>
            <div id="close-window-wrapper" onContextMenu={onCloseRightClick}>
                <Close id="close-window-btn" onClick={closeWindow}/>
                <Menu anchorEl={anchorEl} open={open}>
                    <MenuItem key="debug" onClick={startDebug}>Debug</MenuItem>
                    <MenuItem key="log-level" onClick={() => setLogLever(!isLogLevelDebug)}>{isLogLevelDebug ? "Error Logs" : "Debug Logs"}</MenuItem>
                    <MenuItem key="remove-all-repos" onClick={clearAllRepos}>Clear data</MenuItem>
                    <MenuItem key="close" onClick={() => setOpen(false)}>Close</MenuItem>
                </Menu>
            </div>
            <div className="Header flex">
                <img src="logo.png" className="Header-logo" />
                <p className="Header-title" title={DYNATRACE_DESKTOP_APPLICATION_VERSION}>Dynatrace Desktop App</p>
                <p className="gray-shaded" id="version-title">{DYNATRACE_DESKTOP_APPLICATION_VERSION}</p>
            </div>
        </div>
    );
};
