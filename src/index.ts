import Analytics = require("analytics-node");
import {
    app,
    BrowserWindow,
    clipboard,
    ipcMain,
    IpcMessageEvent,
    Menu,
    nativeImage,
    Notification,
    systemPreferences,
    Tray
} from "electron";
import * as log from "electron-log";
import { autoUpdater, UpdateInfo } from "electron-updater";
import fs = require("fs");
import { userInfo } from "os";
import * as path from "path";
import { ExplorookStore } from "./explorook-store";
const uuidv4 = require("uuid/v4");
import AutoLaunch = require("auto-launch");
import _ = require("lodash");
import { initExceptionManager, notify } from "./exceptionManager";

autoUpdater.logger = log;
log.transports.console.level = "warn";

const ICONS_DIR = "../assets/icons/";
const APP_ICON = path.join(__dirname, ICONS_DIR, getAppIcon());
const TRAY_ICON = path.join(__dirname, ICONS_DIR, getTrayIcon());
const ROOKOUT_LOGO = path.join(__dirname, ICONS_DIR, "logo.png");
const CLOSE_ICON_BLACK = path.join(__dirname, ICONS_DIR, "baseline_close_black_18dp.png");
const SETTINGS_ICON_BLACK = path.join(__dirname, ICONS_DIR, "baseline_settings_black_18dp.png");
const COPY_ICON_BLACK = path.join(__dirname, ICONS_DIR, "baseline_file_copy_black_18dp.png");
const CLOSE_ICON_WHITE = path.join(__dirname, ICONS_DIR, "baseline_close_white_18dp.png");
const SETTINGS_ICON_WHITE = path.join(__dirname, ICONS_DIR, "baseline_settings_white_18dp.png");
const COPY_ICON_WHITE = path.join(__dirname, ICONS_DIR, "baseline_file_copy_white_18dp.png");
const TEN_MINUTES = 1000 * 60 * 10;

let mainWindow: Electron.BrowserWindow;
let indexWorker: Electron.BrowserWindow;
let tray: Tray;
let firstTimeLaunch = false;
let al: AutoLaunch;
let token: string;
let store: ExplorookStore;
let willUpdateOnClose: boolean = false;
let dataCollectionEnabled: boolean;
const icon = nativeImage.createFromPath(APP_ICON);
let analytics: Analytics;
let userId: string;

// getAppIcon resolves the right icon for the running platform
function getAppIcon() {
    if (process.platform.match("win32")) {
        return "/win/icon.ico";
    } else if (process.platform.match("darwin")) {
        return "logo.png";
    } else {
        return "/logo.png";
    }
}

function getTrayIcon() {
    if (process.platform.match("darwin")) {
        return systemPreferences.isDarkMode() ? "mac/explorook_white_tray@21x21.png" : "mac/explorook_tray@21x21.png";
    }
    return getAppIcon();
}

async function linuxAutoLaunchPatch() {
    if (process.platform !== "linux" || !store.get("linux-start-with-os", false)) {
        return;
    }
    // AppImage filename changes after every update so we need to make sure we disable
    // autolaunch before update is installed and re-enable it on the next startup - which is now
    await enableAutoLaunch();
}

async function firstTimeAutoLaunch() {
    if (!firstTimeLaunch) return;
    if (await isReadonlyVolume()) return;
    await enableAutoLaunch();
}

async function enableAutoLaunch() {
    try {
        const isEnabled = await al.isEnabled();
        if (!isEnabled) {
            await al.enable();
        }
    } catch (error) {
        notify(error);
    }
}

// registerIpc listens to ipc requests\event
function registerIpc() {
    let alConfig = { name: "Explorook", isHidden: true };
    // When bundled inside Appimage the executable itself is run from a tmp dir.
    // we need to reference the parent executable which is the Appimage file.
    // The name of the executable is passes as this environment variable
    if (process.env.APPIMAGE) {
        alConfig = Object.assign(alConfig, { path: process.env.APPIMAGE });
    }
    al = new AutoLaunch(alConfig);
    linuxAutoLaunchPatch();
    firstTimeAutoLaunch();
    ipcMain.on("hidden", displayWindowHiddenNotification);
    ipcMain.on("start-server-error", (e: IpcMessageEvent, err: any) => {
        displayNotification("Explorook", `Explorook failed to start local server: ${err}`);
        track("start-server-error", { err });
    });
    ipcMain.on("track", (e: IpcMessageEvent, trackEvent: string, props: any) => {
        track(trackEvent, props);
    });
    ipcMain.on("get-user-id", (e: IpcMessageEvent) => e.returnValue = userId);
    ipcMain.on("get-platform", (e: IpcMessageEvent) => e.returnValue = process.platform.toString());
    ipcMain.on("token-request", (e: IpcMessageEvent) => e.returnValue = token);
    ipcMain.on("force-exit", (e: IpcMessageEvent) => app.quit());
    ipcMain.on("inspect-all", () => {
        mainWindow.webContents.openDevTools();
        indexWorker.webContents.openDevTools();
    });
    ipcMain.on("auto-launch-is-enabled-req", async (e: IpcMessageEvent) => {
      // inspecting al.isEnabled prompts permissions dialog on macOS
      // so we prevent it from happening on readonly volume
      const enabled = !(await isReadonlyVolume()) && await al.isEnabled();
      e.sender.send("auto-launch-is-enabled-changed", enabled);
    });
    ipcMain.on("exception-manager-is-enabled-req", (e: IpcMessageEvent) => {
        e.sender.send("exception-manager-enabled-changed", dataCollectionEnabled);
    });
    ipcMain.on("exception-manager-enabled-set", (e: IpcMessageEvent, enable: boolean) => {
        store.set("sentry-enabled", enable);
        e.sender.send("exception-manager-enabled-changed", enable);
    });
    ipcMain.on("has-signed-eula", (e: IpcMessageEvent) => {
        e.returnValue = store.get("has-signed-eula", false);
    });
    ipcMain.on("signed-eula", (e: IpcMessageEvent) => {
        if (dataCollectionEnabled && !process.env.development) {
            initExceptionManager("production", app.getVersion());
            initAnalytics();
            track("signed-eula");
        }
        store.set("has-signed-eula", true);
    });
    ipcMain.on("auto-launch-set", (e: IpcMessageEvent, enable: boolean) => {
        if (enable) {
            store.set("linux-start-with-os", true);
            al.enable().then(() => e.sender.send("auto-launch-is-enabled-changed", true));
        } else {
            store.set("linux-start-with-os", false);
            al.disable().then(() => e.sender.send("auto-launch-is-enabled-changed", false));
        }
    });
}

function track(eventName: string, props: any = null) {
    if (!analytics) {
        return;
    }
    analytics.track({
        userId,
        event: eventName,
        properties: props
    });
}

function initAnalytics() {
    analytics = new Analytics("isfxG3NQsq3qDoNPZPvhIVlmYVGDOLdH");
    const { username } = userInfo();
    analytics.identify({ userId, traits: { username } });
    track("startup");
}

function main() {
    // check if another instance of this app is already open
    const shouldQuit = app.makeSingleInstance(() => {
        // this action is triggered in first instance when another instance is trying to load
        // e.g: Explorook runs on user's machine and the user opens Explorook again
        // maximize();
    });
    if (shouldQuit) { app.quit(); }

    // store helps us store data on local disk
    store = new ExplorookStore();
    // access token used to access this app's GraphQL api
    token = store.getOrCreate("token", uuidv4(), () => {
        firstTimeLaunch = true;
    });
    userId = store.getOrCreate("user-id", uuidv4());
    dataCollectionEnabled = store.get("sentry-enabled", true);
    const signedEula = store.get("has-signed-eula", false);
    if (signedEula && dataCollectionEnabled && !process.env.development) {
        initExceptionManager("production", app.getVersion());
        initAnalytics();
    }

    // listen to RPC's coming from windows
    registerIpc();
    // open windows (index worker and main config window)
    createWindows();
    // pop tray icon
    openTray();
    // update app
    update();
}

function isReadonlyVolume(): Promise<boolean> {
  return new Promise((resolve, reject) => {
  fs.access(app.getPath("exe"), fs.constants.W_OK, err => {
      if (err && err.code === "EROFS") {
        return resolve(true);
      }
      resolve(false);
    });
  });
}

async function update() {
  // don't try to update if app runs from readonly volume
  // https://github.com/electron/electron/issues/7357#issuecomment-249792476
  if (await isReadonlyVolume()) {
    console.log("detected read-only volume - auto update disabled");
    return;
  }
  console.log("will try to update");
  let updateInterval: NodeJS.Timer = null;
  autoUpdater.signals.updateDownloaded((info: UpdateInfo) => {
      willUpdateOnClose = true;
      if (updateInterval) {
          clearInterval(updateInterval);
      }
      displayNotification(`Update available (${info.version})`, "a new version of Explorook is available and will be installed on next exit");
  });
  const tryUpdate = async () => {
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      notify("Explorook failed to check for updates", { metaData: { error } });
    }
  };
  updateInterval = setInterval(() => tryUpdate(), TEN_MINUTES);
  tryUpdate();
}

function displayWindowHiddenNotification() {
    displayNotification("I'm still here!", "Files are still served in the background");
}

function displayNotification(title: string, body: string, onClick?: (event: Electron.Event) => void) {
    if (onClick == null) {
        onClick = (e) => maximize();
    }
    if (!process.platform.match("win32")) {
        const notif = new Notification({
            title,
            silent: true,
            body,
            icon: process.platform.match("darwin") ? undefined : APP_ICON,
        });
        notif.on("click", onClick);
        notif.show();
    } else if (tray != null) {
        tray.displayBalloon({
            title,
            content: body,
            icon: ROOKOUT_LOGO,
        });
    }
}

function createWindows() {
    // legacy code to choose whether to open Explorok window or start hidden
    // we don't want to open a window on machine startup (only tray pops)
    // const startOptions = app.getLoginItemSettings();
    // const hidden = startOptions.wasOpenedAsHidden || _.includes(process.argv, "--hidden");
    const hidden = !_.includes(process.argv, "--window");
    indexWorker = new BrowserWindow({ width: 400, height: 400, show: !!process.env.development });
    ipcMain.on("index-worker-up", (e: IpcMessageEvent) => {
        createMainWindow(indexWorker, hidden);
    });
    indexWorker.loadFile(path.join(__dirname, "../index-worker.html"));
    if (process.env.development || process.env.ELECTRON_ENV === "debug") {
        indexWorker.webContents.openDevTools();
    }
}

function createMainWindow(indexWorkerWindow: BrowserWindow, hidden: boolean = false) {
    mainWindow = new BrowserWindow({
        height: 550,
        width: 650,
        minWidth: 600,
        minHeight: 500,
        frame: false,
        icon,
        show: !hidden,
    });
    indexWorkerWindow.webContents.send("main-window-id", token, mainWindow.webContents.id);
    ipcMain.on("app-window-up", (ev: IpcMessageEvent) => {
        ev.sender.send("indexer-worker-id", indexWorker.id);
        if (hidden && process.platform === "darwin") {
            app.dock.hide();
        }
        if (firstTimeLaunch) {
          displayNotification("Explorook is running in the background", "You can access Explorook via the tray icon");
        }
    });

    // and load the index.html of the app.
    if (process.env.development) {
        mainWindow.loadURL("http://localhost:3000");
    } else {
        mainWindow.loadFile(path.join(__dirname, "index.html"));
    }

    // Open the DevTools.
    if (process.env.development || process.env.ELECTRON_ENV === "debug") {
        mainWindow.webContents.openDevTools();
    }

    // Emitted when the window is closed.
    mainWindow.on("closed", () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });
}

function maximize() {
    if (!mainWindow) {
        createMainWindow(indexWorker);
        return;
    }
    if (mainWindow.isMinimized()) {
        mainWindow.restore();
        return;
    }
    if (process.platform.match("darwin")) {
        app.dock.show();
    }
    mainWindow.show();
    mainWindow.focus();
}

function openTray() {
    let darkMode = false;
    if (process.platform === "darwin") {
        darkMode = systemPreferences.isDarkMode();
    }
    tray = new Tray(TRAY_ICON);
    const contextMenu = Menu.buildFromTemplate([
        { label: "Copy Token", icon: darkMode ? COPY_ICON_WHITE : COPY_ICON_BLACK, click: () => clipboard.writeText(token) },
        { label: "Config...", icon: darkMode ? SETTINGS_ICON_WHITE : SETTINGS_ICON_BLACK, click: maximize },
        { label: "Close", icon: darkMode ? CLOSE_ICON_WHITE : CLOSE_ICON_BLACK, click: app.quit },
    ]);
    tray.setToolTip("Rookout");
    tray.setContextMenu(contextMenu);
    if (process.platform.match("darwin")) {
        tray.on("right-click", (e) => tray.popUpContextMenu());
    }
}

// trying to workaround this bug: https://github.com/electron-userland/electron-builder/issues/2451
process.on("uncaughtException", (err: Error) => {
    notify(err);
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
    main();
});

// Quit when all windows are closed.
app.on("window-all-closed", () => {
    displayWindowHiddenNotification();
});

app.on("activate", () => {
    if (app.isReady()) {
        maximize();
    }
});

app.on("quit", async () => {
    // on linux: AppImage filename changes after every update so we need to make sure we disable
    // autolaunch before update is installed and re-enable it on the next startup
    // so this is where we disable it
    if (al && process.platform === "linux" && willUpdateOnClose) {
        try {
            await al.disable();
        } catch (error) {
            // bummer
            notify(error);
        }
    }
});
