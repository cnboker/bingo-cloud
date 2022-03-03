import { Paper, Tabs, Tab, Theme, AppBar } from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles'
import { FileArray, FileData } from 'chonky'
import React, { useRef, useImperativeHandle } from 'react'
import { CheckBoxList, ListItemData } from './CheckBoxList'
import ImageList from './ImageList'
import { Settings } from './Settings'

// type TabPanelProps = {
//   children?: React.ReactNode
//   index: unknown
//   value: unknown
//   dir: unknown
// }

// const TabPanel = (props: TabPanelProps) => {
//   const { children, index, value } = props
//   return (
//     <div role="tabpanel" hidden={value !== index} id={`tabpanel_${index}`}>
//       {value === index && (
//         <Box p={3}>
//           <Typography component={'span'} variant={'body2'}>
//             {children}
//           </Typography>
//         </Box>
//       )}
//     </div>
//   )
// }

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
  onRemove: (index: number) => void
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

export const PubForms = React.forwardRef<dataHandle, PubFormProps>(
  ({ fileList, onRemove, deviceList }, ref) => {
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
        if (fileList.length === 0) {
          setValue(0)
          return false
        }
        return true
      },
    }))
    //https://stackoverflow.com/questions/61097440/reactjs-material-ui-prevent-re-render-tabs-on-enter
    return (
      <div className={classes.root}>
        <AppBar position="static" color="default">
          <Header value={value} valueChange={valueChange} />
          <div style={getVisibilityStyle(value !== 0)}>
            <ImageList fileList={fileList} onRemove={onRemove} />
          </div>
          <div style={getVisibilityStyle(value !== 1)}>
            <Settings ref={settingsRef} />
          </div>
          <div style={getVisibilityStyle(value !== 2)}>
            <CheckBoxList data={deviceList} ref={devicelistRef} />
          </div>
        </AppBar>
      </div>
    )
  },
)
