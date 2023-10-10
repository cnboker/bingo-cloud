import React, { forwardRef, useState } from 'react'
import Dialog from '@mui/material/Dialog'
import { AppBar, IconButton, Slide, Toolbar, Typography, Button, Grid } from '@mui/material'
import { Close } from '@mui/icons-material'
import { TransitionProps } from '@mui/material/transitions';
import ImageList from './ImageList';
import SelectedImageList from './SelectedImageLIst'
import { createTheme } from '@mui/material/styles';
import { makeStyles } from '@mui/styles';
const theme = createTheme();
const useStyles = makeStyles(() => ({
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
  return <Slide direction="up" appear={false} in={true} ref={ref}  >{props.children}</Slide>
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