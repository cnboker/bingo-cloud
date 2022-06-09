import { useState } from 'react'

export default (props) => {
  const [value, setValue] = useState(props.value)
  const { inputchange } = props

  return (
    <div className="row">
      <div className="col-sm-12">
        <div className="form-group">
          <label htmlFor="equalGreater1">{props.label}</label>
          <input
            type="text"
            className="form-control"
            placeholder={props.placeholder}
            value={value}
            onChange={(evt) => {
              setValue(evt.target.value)
              inputchange(evt.target.value)
            }}
          />
        </div>
      </div>
    </div>
  )
}
