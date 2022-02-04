import React, { useState } from 'react'
import { CDropdown, CDropdownToggle, CDropdownMenu } from '@coreui/react'

export default ({ title, data, color, onSelect }) => {
  const [text, setText] = useState(title)
  const getChildren = () => {
    return data.map((item, index) => {
      return (
        <CDropdownMenu
          key={index}
          onClick={() => {
            setText(item.key)
            if (onSelect) {
              onSelect(item)
            }
          }}
        >
          {item.key}
        </CDropdownMenu>
      )
    })
  }

  const select = (target) => {
    setText(target.key)

    if (onSelect) {
      onSelect(target.value)
    }
  }
  return (
    <CDropdown title={text} onSelect={select}>
      <CDropdownToggle color={color}>text</CDropdownToggle>
      {getChildren()}
    </CDropdown>
  )
}
