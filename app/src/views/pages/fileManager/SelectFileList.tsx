import React from 'react'
import { DialogTitle, Dialog, DialogActions, DialogContent, Button } from '@material-ui/core'
import { Box } from '@material-ui/core'
import R from './locale'

type SelectFileInfo = {
  selectFileCount: number
  children: React.ReactNode
  onSubmit: () => Promise<string>
}

export const SelectFileList: React.FC<SelectFileInfo> = ({
  selectFileCount,
  onSubmit,
  children,
}) => {
  const [open, setOpen] = React.useState(false)
  const handleClose = () => {
    setOpen(false)
  }
  const handleClickOpen = () => {
    setOpen(true)
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row-reverse',
        bgcolor: 'background.paper',
      }}
    >
      <Button variant="contained" onClick={handleClickOpen}>
        {R.pendingItems}({selectFileCount})
      </Button>
      <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth={true} disableEnforceFocus>
        <DialogTitle>{R.pendingList}</DialogTitle>
        <DialogContent>{children}</DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>{R.cancel}</Button>
          <Button
            onClick={() => {
              onSubmit().then((result) => {
                if (result) {
                  handleClose()
                }
              })
            }}
          >
            {R.pub}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
