import { Paper, Tabs, Tab, Box, Typography, Theme, AppBar } from '@material-ui/core'
import { makeStyles } from '@material-ui/styles'
import React from 'react'
import { useTheme } from 'styled-components'
import SwipeableViews from 'react-swipeable-views'
type TabPanelProps = {
  children?: React.ReactNode
  index: any
  value: any
}

const TabPanel = (props: TabPanelProps) => {
  const { children, index, value } = props
  return (
    <div role="tabpanel" hidden={value !== index} id={`tabpanel_${index}`}>
      {value === index && (
        <Box p={3}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  )
}

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    backgroundColor: theme.palette.background.paper,
  },
}))

const Header = () => {
  const [value, setValue] = React.useState(0)
  const handleChange = (evnet: React.ChangeEvent<{}>, newValue: number) => {
    setValue(newValue)
  }
  return (
    <Paper>
      <Tabs
        value={value}
        indicatorColor="primary"
        textColor="primary"
        onChange={handleChange}
        aria-label="pub information"
      >
        <Tab label="" />
        <Tab label="" />
        <Tab label="" />
      </Tabs>
    </Paper>
  )
}

export default () => {
  const classes = useStyles()
  const theme = useTheme()
  return <div className={classes.root}>
      <AppBar position="static" color="default">
          <Header/>
          <SwipeableViews
            axis={theme.direction==='rtl'?'x-reversse':'x'}
            index={value}
            onChangeIndex={handleChangeIndex}
          >

          </SwipeableViews>
      </AppBar>
  </div>
}
