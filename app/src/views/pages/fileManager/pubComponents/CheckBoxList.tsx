import React, { forwardRef, memo, useImperativeHandle } from 'react'
import { ListItem, ListItemText } from '@mui/material'
import { ListItemIcon } from '@mui/material'
import { Checkbox } from '@mui/material'
import styled from 'styled-components'

import {
  compose,
  spacing,
  palette,
  styleFunctionSx,
  SpacingProps,
  PaletteProps,
} from '@mui/system'
import { CSSProperties } from '@mui/styles'

const styleFunction = styleFunctionSx(compose(spacing, palette))

type StyleFunctionProps = SpacingProps & PaletteProps & CSSProperties

type ComponentProps = StyleFunctionProps & {
  sx?: StyleFunctionProps
  // TODO: this should be removed once the css prop is dropped
  css?: StyleFunctionProps
}

const List = styled.ul<ComponentProps>(styleFunction)

export type ListItemData = {
  name: string
  value: string
}

type CheckboxListProps = {
  data: ListItemData[]
}

export const CheckBoxList = memo(
  forwardRef((props: CheckboxListProps, ref) => {
    const { data } = props
    const [checked, setChecked] = React.useState<string[]>([])

    useImperativeHandle(ref, () => ({
      formData() {
        return checked
      },
    }))

    const handleToggle = (value: string) => () => {
      const currentIndex = checked.indexOf(value)
      const newChecked = [...checked]

      if (currentIndex === -1) {
        newChecked.push(value)
      } else {
        newChecked.splice(currentIndex, 1)
      }
      setChecked(newChecked)
    }

    return (
      <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
        {data.map((item) => {
          const labelId = item.value
          return (
            <ListItem key={item.value} dense button onClick={handleToggle(item.value)}>
              <Checkbox
                edge="start"
                checked={checked.indexOf(item.value) !== -1}
                tabIndex={-1}
                disableRipple
                inputProps={{ 'aria-labelledby': labelId }}
              />
              <ListItemText id={labelId} primary={item.name} />
            </ListItem>
          )
        })}
      </List>
    )
  }),
)
