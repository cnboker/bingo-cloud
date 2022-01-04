import React, { useState, forwardRef, useImperativeHandle } from 'react'
import { TextField } from '@material-ui/core'
import { makeStyles, createStyles, Theme } from '@material-ui/core/styles'
import { MenuItem } from '@material-ui/core'

const effects = [
  {
    label: '',
    value: '',
  },
]

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      '& .MulTextField-root': {
        margin: theme.spacing(1),
        width: '25ch',
      },
    },
  }),
)

export default forwardRef((props, ref) => {
  const classes = useStyles()
  const [effect, setEffect] = useState<string>()
  const [duration, setDuration] = useState('5')

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEffect(event.target.value)
  }

  useImperativeHandle(ref, () => ({
    getData() {
      return {
        duration,
        effect,
      }
    },
  }))

  return (
    <form className={classes.root} noValidate autoComplete="off">
      <div>
        <TextField
          id="duration"
          label="单图片播放时长"
          type="number"
          defaultValue={duration}
          onChange={(e) => setDuration(e.target.value)}
          InputLabelProps={{ shrink: true }}
        ></TextField>
        <TextField
          id="effect"
          label="播放效果"
          value={effect}
          onChange={handleChange}
          helperText="请输入播放效果"
        >
          {effects.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </div>
    </form>
  )
})
