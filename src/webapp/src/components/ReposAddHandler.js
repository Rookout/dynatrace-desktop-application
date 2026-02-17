import { useEffect } from 'react'
import { ipcRenderer } from 'electron'
import path from 'path'
import { app, dialog, getCurrentWindow } from '@electron/remote'

import {IpcChannel} from "../../../typings";





export const ReposAddHandler = () => {


    useEffect(() => {
        ipcRenderer.on(IpcChannel.POP_CHOOSE_REPOSITORY, () => {
            onPopDialogRequested()
        })
        ipcRenderer.send(IpcChannel.SPECIFIC_WORKER_INDEX_ID, {targetId: window.indexWorkerId, ipcChannel: IpcChannel.REPOS_REQUEST})
    }, [])

    const onPopDialogRequested = async () => {
        const win = getCurrentWindow()
        let reHide = false
        if (!win.isVisible()) {
            win.show()
            reHide = true
        }
        await onAddClicked()
        if (!reHide) return
        if (window.process.platform.match('darwin')) {
            app.dock.hide()
        }
        win.hide()
    }


    const onAddClicked = async () => {
        const win = getCurrentWindow()
        const { filePaths } = await dialog.showOpenDialog(win, {
            properties: ['openDirectory', 'multiSelections'],
        })

        if (!filePaths) return // user closed dialog without choosing

        for (let i = 0; i < filePaths.length; i++) {
            const folder = filePaths[i]
            const repoName = path.basename(folder)
            const newRepo = { repoName, fullpath: folder }
            ipcRenderer.send(IpcChannel.SPECIFIC_WORKER_INDEX_ID, {targetId: window.indexWorkerId, ipcChannel: IpcChannel.APP_REPO, payload: [newRepo]})
        }
    }

    return null;
}
