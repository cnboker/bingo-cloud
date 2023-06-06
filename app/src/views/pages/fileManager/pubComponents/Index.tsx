import { Paper, Tabs, Tab, Theme, AppBar } from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles'
import { FileArray, FileData } from 'chonky'
import React, { useRef, useImperativeHandle, Dispatch, SetStateAction } from 'react'
import { CheckBoxList, ListItemData } from './CheckBoxList'
import ImageList from './ImageList'
import { Settings } from './Settings'
import R from '../locale'
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
    <Tabs
      value={value}
      indicatorColor="primary"
      textColor="primary"
      onChange={handleChange}
      aria-label="pub information"
      variant="fullWidth"
    >
      <Tab label={R.selectedItems} />
      <Tab label={R.parameterSetting} />
      <Tab label={R.deviceList} />
    </Tabs>
  )
}

export type PubFormProps = {
  selectedFiles: FileArray
  deviceList: ListItemData[]
  removeAction: (index: number) => void
  onMovedown: (item: FileData, index: number) => void
}

export type PubFormResultProps = {
  //选择图片列表
  selectedFiles: FileArray
  //选择设备
  deviceList: ListItemData[]
  settings: SettingProps
}

type ImperativeHandleProps = {
  formData(): PubFormResultProps
  validate(): boolean
}
type SettingProps = {
  duration: number
  effect: 'vanish' | 'buff' | 'drop' | 'rotate' | 'bounce' | 'zoom' | 'slider' | 'opacity'
}

const getVisibilityStyle = (hiddenCondition: boolean): any => {
  if (hiddenCondition) {
    return {
      visibility: 'hidden',
      height: 0,
    }
  }
  return {
    visibility: 'visible',
    height: 'inherit',
  }
}

//ImperativeHandleProps定义useImperativeHandle接口， PubFormProps表示属性
export const PubForms = React.forwardRef<ImperativeHandleProps, PubFormProps>(
  ({ selectedFiles, deviceList, removeAction, onMovedown }, ref) => {
    const classes = useStyles()
    const [value, setValue] = React.useState(0)
    const settingsRef = useRef(null)
    const devicelistRef = useRef(null)
    const valueChange = (value: number) => {
      setValue(value)
    }

    useImperativeHandle(ref, () => ({
      formData() {
        return {
          selectedFiles,
          deviceList: devicelistRef.current?.formData(),
          settings: settingsRef.current?.formData() || { duration: 5, effect: 'vanish' },
        }
      },
      validate(): boolean {
        if (!devicelistRef.current || devicelistRef.current?.formData().length === 0) {
          setValue(2)
          return false
        }
        if (selectedFiles.length === 0) {
          setValue(0)
          return false
        }
        return true
      },
    }))
    //https://stackoverflow.com/questions/61097440/reactjs-material-ui-prevent-re-render-tabs-on-enter
    return (
      <div className={classes.root}>
        <Paper>
          <Header value={value} valueChange={valueChange} />
          <div style={getVisibilityStyle(value !== 0)}>
            <ImageList
              selectedFiles={selectedFiles}
              removeAction={removeAction}
              onMovedown={onMovedown}
            />
          </div>
          <div style={getVisibilityStyle(value !== 1)}>
            <Settings ref={settingsRef} />
          </div>
          <div style={getVisibilityStyle(value !== 2)}>
            <CheckBoxList data={deviceList} ref={devicelistRef} />
          </div>
        </Paper>
      </div>
    )
  },
)
