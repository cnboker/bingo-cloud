import React, { forwardRef, useState } from 'react'
import Dialog from '@material-ui/core/Dialog'
import { AppBar, IconButton, makeStyles, Slide, Toolbar, Typography, Button, Grid } from '@material-ui/core'
import { Close } from '@material-ui/icons'
import { TransitionProps } from '@material-ui/core/transitions';
import ImageList  from './ImageList';
import SelectedImageList from './SelectedImageLIst'

const useStyles = makeStyles((theme) => ({
  appBar: {
    position: 'relative',
  },
  title: {
    marginLeft: theme.spacing(2),
    flex: 1,
  },
  root: {
    flexGrow: 1,
  }
}));


const Transition = forwardRef<unknown, TransitionProps & {
  children?: React.ReactElement
}>((props, ref) => {
  return <Slide direction="up" ref={ref} {...props} />
});


export const ImageSelector = ({ show }) => {
  const classes = useStyles();
  return <div className={classes.root}>
    <DialogApp show={show}>
      <Grid container spacing={3}>
        <Grid item xs={8}>
          <ImageList />
        </Grid>
        <Grid item xs={4}>
          <SelectedImageList />
        </Grid>
      </Grid>
    </DialogApp>
  </div>
}


const DialogApp = ({ show, children }) => {
  const [open, setOpen] = useState(show)
  const classes = useStyles()
  const handleClose = () => {
    setOpen(false)
  }

  return <Dialog fullScreen open={open} onClose={handleClose} TransitionComponent={Transition}>
    <AppBar className={classes.appBar}>
      <Toolbar>
        <IconButton edge="start" color="inherit" onClick={handleClose} aria-label="close">
          <Close />
        </IconButton>
        <Typography>
          Image Select
        </Typography>
        <Button autoFocus color="inherit" onClick={handleClose}>
          Save
        </Button>
      </Toolbar>
    </AppBar>
    {children}
  </Dialog>
}