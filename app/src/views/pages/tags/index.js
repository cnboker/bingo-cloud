import React, { useState } from 'react'

export default ({ catelog, tags, tagSelect }) => {
  const [selected, setSelected] = useState()

  const tagRender = () => {
    return tags.map((x, index) => {
      return (
        <span
          key={index}
          onClick={() => {
            var tag = selected === x ? '' : x
            tagSelect({ catelog: catelog, tag })
            setSelected(tag)
          }}
          className={`badge badge-pill ${selected === x ? 'badge-warning' : 'badge-primary'}`}
        >
          {x}
        </span>
      )
    })
  }

  return <React.Fragment>{tagRender()}</React.Fragment>
}
