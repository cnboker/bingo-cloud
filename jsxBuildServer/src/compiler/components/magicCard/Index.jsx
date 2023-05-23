import React from 'react'
import './default.css'

export default ({ children }) => {
    return (<div className="card">
        {children}
    </div>)
}