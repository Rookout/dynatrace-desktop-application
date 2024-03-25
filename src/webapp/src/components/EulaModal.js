import React, { useState } from 'react'
import Modal from '@material-ui/core/Modal'
import Button from '@material-ui/core/Button'
import { withStyles } from '@material-ui/core/styles'
import Checkbox from '@material-ui/core/Checkbox'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import { ipcRenderer } from 'electron'
import { closeWindow, exitApplication } from '../utils'

const styles = {
  disagreeButton: {
    border: '1px solid #A9AAF2',
    borderRadius: '17.5px',
    color: '#A9AAF2',
    height: 'inherit',
    width: '9em'
  },
  agreeButton: {
    backgroundColor: '#A9AAF2',
    borderRadius: '17.5px',
    color: '#fff',
    '&:hover': {
      backgroundColor: '#AE83FF',
    },
    height: 'inherit',
    width: '9em'
  },
  agreeButtonDisabled: {
    backgroundColor: '#CAB4F3',
  },
  checkboxDefault: {},
  checkboxChecked: {},
  root: {
    color: '#A9AAF2 !important',
    '&$checked': {
      color: '#A9AAF2 !important',
    },
  },
  label: {
    color: 'white',
    fontSize: '15px',
  },
}

const EulaModalComponent = ({ setSignedEula, ...props }) => {
  const [isConfirmChecked, setIsConfirmChecked] = useState(false)

  const toggleConfirm = () => {
    setIsConfirmChecked(!isConfirmChecked)
  }

  const handleUserConfirmation = () => {
    ipcRenderer.send('signed-eula')
    setSignedEula(true)
    closeWindow()
  }

  return (
    <Modal
      aria-labelledby='simple-modal-title'
      aria-describedby='simple-modal-description'
      open
      onClose={() => { }}
    >
      <div className='eula-modal'>
        <h1 className='headline'>Software-as-a-Service Agreement</h1>

        <iframe className='eula-box' src='eula.v2.html' />

        <FormControlLabel
          className='confirmation-checkbox'
          classes={{ label: props.classes.label }}
          control={
            <Checkbox
              classes={{
                root: props.classes.root,
                checked: props.classes.checkboxChecked,
              }}
              checked={isConfirmChecked}
              onChange={toggleConfirm}
              value='confirm'
            />
          }
          label='I confirm that I have read and agree to the User Agreement and Privacy policy.'
        />
        <div className='actions'>
          <Button
            classes={{
              root: props.classes.disagreeButton,
            }}
            variant='outlined'
            className='button disagree'
            onClick={() => exitApplication()}
          >
            Disagree
          </Button>

          <Button
            classes={{
              root: props.classes.agreeButton,
              disabled: props.classes.agreeButtonDisabled,
            }}
            variant='contained'
            className='button agree'
            onClick={handleUserConfirmation}
            disabled={!isConfirmChecked}
          >
            Agree
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export const EulaModal = withStyles(styles)(EulaModalComponent)
