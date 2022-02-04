import React from 'react'

export default ({ message }) => {
  if (!message) {
    return null
  }
  return <p className="error">{message}</p>
}
