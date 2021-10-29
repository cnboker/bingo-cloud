import React from 'react'
import { CButtonGroup, CFormCheck } from '@coreui/react'

export default ({ name, data, onChecked, defaultChecked }) => {
  return (
    <CButtonGroup role="group" className="mb-3">
      {data.map((x, index) => {
        return (
          <CFormCheck
            type="radio"
            button={{ color: 'primary', variant: 'outline' }}
            name={name}
            key={index}
            id={`${name}${index}`}
            label={x.label}
            defaultChecked={defaultChecked && x === defaultChecked}
            value={x.value}
            onClick={() => {
              onChecked(x)
            }}
          />
        )
      })}
    </CButtonGroup>
  )
}
