import React, { useState, useEffect } from 'react';
import blueGrey from '@material-ui/core/colors/blueGrey';
import { withStyles } from '@material-ui/core/styles';
import { Checkbox, FormGroup } from "@material-ui/core";
import { ipcRenderer } from 'electron';

import {IpcChannel} from "../../../typings";

const AUTO_LAUNCH_EXPLANATION = "Run Dynatrace Live Debugging Desktop App on machine startup";

const styles = {
    root: {
        color: '#A9AAF2 !important',
        '&$checked': {
            color: '#A9AAF2 !important',
        },
    },
    checked: {},
}

export const Footer = ({ classes }) => {
    const [autoLaunchEnabled, setAutoLaunchEnabled] = useState(false);

    useEffect(() => {
        ipcRenderer.on(IpcChannel.AUTO_LAUNCH_IS_ENABLED_CHANGED, (event, isEnabled) => {
            setAutoLaunchEnabled(isEnabled);
        });
        ipcRenderer.send(IpcChannel.AUTO_LAUNCH_IS_ENABLED_REQ);
    }, []);

    const onAutoLaunchChecked = event => {
        ipcRenderer.send(IpcChannel.AUTO_LAUNCH_SET, event.target.checked);
    };


    const getPlatformCheckboxText = () => {
        const dic = {
            'linux': 'Linux',
            'darwin': 'MacOS',
            'win32': 'Windows'
        };
        const pcName = dic[ipcRenderer.sendSync(IpcChannel.GET_PLATFORM)] || "PC";
        return `Start with ${pcName}`;
    };

    return (
        <div id="footer-container">
            <FormGroup row id="checkboxes-group">
                <Checkbox
                    checked={autoLaunchEnabled}
                    onChange={onAutoLaunchChecked}
                    classes={{
                        root: classes.root,
                        checked: classes.checked,
                    }}
                />
                <p title={AUTO_LAUNCH_EXPLANATION}>{getPlatformCheckboxText()}</p>
            </ FormGroup>
        </div>
    )
}

export default withStyles(styles)(Footer);
