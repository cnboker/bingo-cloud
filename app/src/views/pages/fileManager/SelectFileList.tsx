import React from 'react'
import { DialogTitle, Dialog, DialogActions, DialogContent, Button } from '@material-ui/core'
import { Box } from '@material-ui/core'

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
        待发布项{selectFileCount}
      </Button>
      <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth={true} disableEnforceFocus>
        <DialogTitle>待发布素材列表</DialogTitle>
        <DialogContent>{children}</DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>取消</Button>
          <Button
            onClick={() => {
              onSubmit().then((result) => {
                if (result) {
                  handleClose()
                }
              })
            }}
          >
            发布
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
