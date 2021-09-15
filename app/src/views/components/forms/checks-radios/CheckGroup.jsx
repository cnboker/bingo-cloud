import React from 'react'
import { CButtonGroup, CFormCheck } from '@coreui/react'

export default ({ name, data, onChecked, defaultSelect }) => {
  return (
    <CButtonGroup role="group" className="mb-3">
      {data.map((x, index) => {
        if (defaultSelect && x.value === defaultSelect.value) {
          return (
            <CFormCheck
              type="radio"
              button={{ color: 'primary', variant: 'outline' }}
              name={name}
              key={index}
              id={`${name}${index}`}
              autoComplete="off"
              label={x.label}
              defaultChecked
              value={x.value}
              onClick={() => {
                onChecked(x)
              }}
            />
          )
        } else {
          return (
            <CFormCheck
              type="radio"
              button={{ color: 'primary', variant: 'outline' }}
              name={`period`}
              key={index}
              id={`period${index}`}
              autoComplete="off"
              label={x.label}
              value={x.value}
              onClick={() => {
                onChecked(x)
              }}
            />
          )
        }
      })}
    </CButtonGroup>
  )
}
