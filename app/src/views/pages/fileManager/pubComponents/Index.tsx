import { Paper, Tabs, Tab, Box, Typography, Theme, AppBar } from '@material-ui/core'
import { makeStyles, useTheme } from '@material-ui/core/styles'
import { FileArray, FileData } from 'chonky'
import React, { useRef, forwardRef, useImperativeHandle, Ref, ReactElement } from 'react'
import SwipeableViews from 'react-swipeable-views'
import { CheckBoxList, ListItemData } from './CheckBoxList'
import ImageList from './ImageList'
import { Settings } from './Settings'

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
          <Typography component={'span'} variant={'body2'}>
            {children}
          </Typography>
        </Box>
      )}
    </div>
  )
}

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    backgroundColor: theme.palette.background.paper,
    minHeight: '320px',
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

export type PubFormResultProps = {
  //选择图片列表
  fileList: FileArray
  //选择设备
  deviceList: ListItemData[]
  settings: SettingProps
}

type dataHandle = {
  formData(): PubFormResultProps
}
type SettingProps = {
  duration: number
  effect: 'vanish' | 'buff' | 'drop' | 'rotate' | 'bounce' | 'zoom' | 'slider' | 'opacity'
}
export const PubForms = React.forwardRef<dataHandle, PubFormProps>(
  ({ fileList, onRemove, deviceList }, ref) => {
    const classes = useStyles()
    const theme = useTheme()
    const [value, setValue] = React.useState(0)
    const settingsRef = useRef(null)
    const devicelistRef = useRef(null)
    const valueChange = (value: number) => {
      setValue(value)
    }

    useImperativeHandle(ref, () => ({
      formData() {
        return {
          fileList,
          deviceList: devicelistRef.current?.formData(),
          settings: settingsRef.current?.formData() || { duration: 5, effect: 'vanish' },
        }
      },
      dataValidate(): boolean {
        if (!devicelistRef.current || devicelistRef.current?.formData().length === 0) {
          setValue(2)
          return false
        }
        if (fileList.length == 0) {
          setValue(0)
          return false
        }
        return true
      },
    }))

    return (
      <div className={classes.root}>
        <AppBar position="static" color="default">
          <Header value={value} valueChange={valueChange} />
          <TabPanel value={value} index={0} dir={theme.direction}>
            <ImageList fileList={fileList} onRemove={onRemove} />
          </TabPanel>
          <TabPanel value={value} index={1} dir={theme.direction}>
            <Settings ref={settingsRef} />
          </TabPanel>
          <TabPanel value={value} index={2} dir={theme.direction}>
            <CheckBoxList data={deviceList} ref={devicelistRef} />
          </TabPanel>
        </AppBar>
      </div>
    )
  },
)
