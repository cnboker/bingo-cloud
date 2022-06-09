import * as classNames from 'classnames'
import PropTypes from 'prop-types'
import If from 'src/lib/If'

export const CardHeader = (props) => {
  const { headerTitle, check, headerExtender } = props

  return (
    <If test={headerTitle !== undefined && headerTitle !== ''}>
      <div className="card-header">
        <If test={check}>
          <i className="fa fa-check"></i>
        </If>
        {headerTitle}
        {headerExtender}
      </div>
    </If>
  )
}

//specifies the default values for props
CardHeader.defaultProps = {
  check: false,
}

CardHeader.propTypes = {
  headerTitle: PropTypes.string,
  children: PropTypes.node,
  check: PropTypes.bool,
  showHeaderExtender: PropTypes.node,
}

export const SimpleCard = (props) => {
  return (
    <div className="card">
      <div className="card-block">
        <div className="card-header">
          <strong>{props.title}</strong>
        </div>
        {props.children}
      </div>
    </div>
  )
}

export const Card = (props) => {
  const { className, children, footerTitle, ...headerProps } = props

  const classes = {
    card: true,
  }
  return (
    <div className={classNames(className, classes)}>
      <CardHeader {...headerProps} />
      <div className="card-block-news rowpots">{children}</div>
      <If test={footerTitle !== undefined && footerTitle !== ''}>
        <div className="card-footer">{footerTitle}</div>
      </If>
    </div>
  )
}

Card.propTypes = {
  className: PropTypes.string,
  footerTitle: PropTypes.string,
  showFooter: PropTypes.bool,
}
