import PropTyps from 'prop-types'

export const RowContainer = (props) => {
  const { label, children } = props
  var mylabel = label === undefined || label === '' || label === ' ' ? ' ' : label + ':'
  return (
    <div className="form-group row">
      <label className="col-md-3 col-sm-3 from-control-label col-xs-6">{mylabel}</label>
      <div className="col-md-9 col-sm-9 col-xs-6">{children}</div>
    </div>
  )
}

RowContainer.PropTyps = {
  label: PropTyps.string,
}
