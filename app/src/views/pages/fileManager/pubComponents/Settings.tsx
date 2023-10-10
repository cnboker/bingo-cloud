import React, { useState, forwardRef, useImperativeHandle, useRef, memo } from 'react'
import { FormControl, Box, InputLabel, Select, TextField } from '@mui/material'
import { makeStyles, createStyles, Theme } from '@mui/material/styles'
import { MenuItem } from '@mui/material'
import R from '../locale'
const effects = [
  {
    label: 'random',
    value: 'random',
  },
  {
    label: 'opacity',
    value: 'opacity',
  },
  {
    label: 'slider',
    value: 'slider',
  },
  {
    label: 'zoom',
    value: 'zoom',
  },
  {
    label: 'bounce',
    value: 'bounce',
  },
  {
    label: 'rotate',
    value: 'rotate',
  },
  {
    label: 'drop',
    value: 'drop',
  },
  {
    label: 'puff',
    value: 'puff',
  },
  {
    label: 'vanish',
    value: 'vanish',
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
    formControl: {
      margin: theme.spacing(1),
      padding: theme.spacing(1),
      minWidth: 120,
    },
  }),
)

export const Settings = memo(
  forwardRef((props, ref) => {
    const classes = useStyles()
    const [effect, setEffect] = useState<string>('random')
    const [duration, setDuration] = useState<number>(5)
    const durationRef = useRef(null)
    const handleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
      setEffect(event.target.value as string)
    }

    const durationChange = (event: React.ChangeEvent<{ value: unknown }>) => {
      setDuration(+(event.target.value as string))
    }

    useImperativeHandle(ref, () => ({
      formData() {
        console.log('Settings formdata:', duration, effect)
        return { duration, effect }
      },
    }))

    return (
      <Box m={2}>
        <FormControl className={classes.formControl}>
          <TextField
            inputRef={durationRef}
            label={R.duration}
            type="number"
            value={duration}
            onChange={durationChange}
            InputLabelProps={{ shrink: true }}
          ></TextField>
        </FormControl>
        <FormControl className={classes.formControl}>
          <InputLabel>{R.playEffect}</InputLabel>
          <Select id="effect" value={effect} onChange={handleChange}>
            {effects.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    )
  }),
)
