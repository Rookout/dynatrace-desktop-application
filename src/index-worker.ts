import { ipcRenderer, IpcRendererEvent } from "electron";
import _ = require("lodash");
import net = require("net");
import { basename } from "path";
import { Repository } from "./common/repository";
import { notify } from "./exceptionManager";
import {setLogLevel} from "./logger";
import { repStore } from "./repoStore";
import * as graphQlServer from "./server";
import {IpcChannel} from "./typings";

let mainWindowId = -1;

const getRepos = () => repStore.getRepositories().map((r) => r.toModel());

const isPortInUse = (port: number): Promise<boolean> => new Promise<boolean>((resolve, reject) => {
    const testServer = net.createServer()
    .on("error", (err: any) => {
        err.code === "EADDRINUSE" ? resolve(true) : reject(err);
    })
    .on("listening", () => {
        testServer.once("close", () => resolve(false));
        testServer.close();
    })
    .listen({ port, host: "localhost" });
});

const onAddRepoRequest = async (fullpath: string, id?: string) => {
    ipcRenderer.send(IpcChannel.TRACK, "repo-add-request", { fullpath });
    if (!fullpath) {
        // will pop the menu for the user to choose repository
        ipcRenderer.send(IpcChannel.POP_CHOOSE_REPOSITORY_MAIN);
        ipcRenderer.send(IpcChannel.TRACK, "repo-add-pop-choose-repo");
        return true;
    }
    const repoName = basename(fullpath);
    // add repository
    const repoId = await repStore.add({ fullpath, repoName, id });
    // tell webview to refresh repos view
    ipcRenderer.send(IpcChannel.REPOS_REQUEST_MAIN, getRepos());
    ipcRenderer.send(IpcChannel.TRACK, "repo-add", { repoName, repoId });
    return true;
};

const onRemoveRepoRequest = async (repId: string) => {
  repStore.remove(repId);
  ipcRenderer.send(IpcChannel.REPOS_REQUEST_MAIN, getRepos());
  return true;
};

ipcRenderer.on(IpcChannel.MAIN_WINDOW_ID, async (e: IpcRendererEvent, firstTimeLaunch: boolean, id: number) => {
    mainWindowId = id;
    const port = 44512;
    try {
        const portInUse = await isPortInUse(port);
        if (portInUse) {
            throw new Error(`port ${port} in use`);
        }
        const userId: string = ipcRenderer.sendSync(IpcChannel.GET_USER_ID);
        await graphQlServer.start({
            userId,
            port,
            firstTimeLaunch,
            onAddRepoRequest,
            onRemoveRepoRequest
        });
    } catch (err) {
        console.error(err);
        notify("Failed to start local server", { metaData: { err }});
        ipcRenderer.send(IpcChannel.START_SERVER_ERROR, _.toString(err));
    }
});

ipcRenderer.on(IpcChannel.APP_REPO, (e: IpcRendererEvent, repo: Repository) => {
    repStore.add(repo).then(repoId => {
        ipcRenderer.send(IpcChannel.REPOS_REQUEST_MAIN, getRepos());
        ipcRenderer.send(IpcChannel.TRACK, "repo-add", { repoName: repo.repoName, repoId });
    });
});
ipcRenderer.on(IpcChannel.DELETE_REPO, (e: IpcRendererEvent, repId: string) => {
    repStore.remove(repId);
    ipcRenderer.send(IpcChannel.REPOS_REQUEST_MAIN, getRepos());
});
ipcRenderer.on(IpcChannel.EDIT_REPO, (e: IpcRendererEvent, args: { id: string, repoName: string }) => {
    const { id, repoName } = args;
    repStore.update(id, repoName);
    ipcRenderer.send(IpcChannel.REPOS_REQUEST_MAIN, getRepos());
});
ipcRenderer.on(IpcChannel.CLEAR_ALL_REPOS, (e: IpcRendererEvent) => {
    const allRepos = _.map(repStore.getRepositories(), "id");
    _.forEach(allRepos, repo => {
        repStore.remove(repo);
    });
    ipcRenderer.send(IpcChannel.REPOS_REQUEST_MAIN, getRepos());
});

ipcRenderer.on(IpcChannel.REPOS_REQUEST, (e: IpcRendererEvent) => ipcRenderer.send(IpcChannel.REPOS_REQUEST_MAIN, getRepos()));

ipcRenderer.on(IpcChannel.SET_LOG_LEVEL, (e: IpcRendererEvent, newLogLevel: string) => {
    setLogLevel(newLogLevel);
});

ipcRenderer.send(IpcChannel.INDEX_WORKER_UP);
ipcRenderer.send(IpcChannel.EXCEPTION_MANAGER_IS_ENABLED_REQ);
