import React from 'react'
import Tagify from '@yaireo/tagify'
import './tagify.css'

export class Tags extends React.Component {
  constructor(props) {
    super(props)
    this.state = {}
    this._handleRef = this._handleRef.bind(this)
  }

  componentDidMount() {
    this.tagify = new Tagify(this.component, this.props.settings || {})
  }

  componentDidUpdate(prevProps) {
    if (prevProps.children !== this.props.children) {
      this.$el.trigger('chosen:updated')
    }
  }

  componentWillUnmount() {
    this.tagify.destroy()
  }

  shouldComponentUpdate() {
    // do not allow react to re-render since the component is modifying its own HTML
    return false
  }

  _handleRef(component) {
    this.component = component
  }

  render() {
    const attrs = {
      ref: this._handleRef,
      name: this.props.name,
      className: this.props.className,
      placeholder: this.props.class,
      autoFocus: this.props.autofocus,
    }

    return this.props.mode === 'textarea' ? <textarea {...attrs}>{this.props.initialValue}</textarea> : <input {...attrs} value={this.props.initialValue} />
  }
}
