import { Paper, Tabs, Tab, Box, Typography, Theme, AppBar } from '@material-ui/core'
import { makeStyles, useTheme } from '@material-ui/core/styles'
import { FileArray, FileData } from 'chonky'
import React from 'react'
import SwipeableViews from 'react-swipeable-views'
import { CheckBoxList, ListItemData } from './CheckBoxList'
import ImageList from './ImageList'
import Setting from './Settings'

type TabPanelProps = {
  children?: React.ReactNode
  index: unknown
  value: unknown
  dir: unknown
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

type HeaderProps = {
  value: number
  valueChange: (value: number) => void
}
const Header = (props: HeaderProps) => {
  const { value, valueChange } = props
  // eslint-disable-next-line @typescript-eslint/ban-types
  const handleChange = (evnet: React.ChangeEvent<{}>, newValue: number) => {
    valueChange(newValue)
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
        <Tab label="选中项目" />
        <Tab label="参数设置" />
        <Tab label="设备列表" />
      </Tabs>
    </Paper>
  )
}

export type PubFormProps = {
  fileList: FileArray
  deviceList: ListItemData[]
  onRemove: (file: FileData) => void
}

export const PubForms: React.FC<PubFormProps> = ({ fileList, onRemove, deviceList }) => {
  const classes = useStyles()
  const theme = useTheme()
  const [value, setValue] = React.useState(0)
  const valueChange = (value: number) => {
    setValue(value)
  }
  return (
    <div className={classes.root}>
      <AppBar position="static" color="default">
        <Header value={value} valueChange={valueChange} />
        <SwipeableViews index={value} onChangeIndex={valueChange}>
          <TabPanel value={value} index={0} dir={theme.direction}>
            <ImageList fileList={fileList} onRemove={onRemove} />
          </TabPanel>
          <TabPanel value={value} index={1} dir={theme.direction}>
            <Setting />
          </TabPanel>
          <TabPanel value={value} index={2} dir={theme.direction}>
            <CheckBoxList data={deviceList} />
          </TabPanel>
        </SwipeableViews>
      </AppBar>
    </div>
  )
}
