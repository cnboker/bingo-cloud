import React from 'react'

export default ({ message }) => {
  if (!message) {
    return null
  }
  if (Array.isArray(message)) {
    return (
      <React.Fragment>
        {message.map((x, index) => {
          return (
            <p className="error" key={index}>
              {x}
            </p>
          )
        })}
      </React.Fragment>
    )
  }
  return <p className="error">{message}</p>
}
