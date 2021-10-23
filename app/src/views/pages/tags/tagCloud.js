import React from 'react'
import { TagCloud } from 'react-tagcloud'

export default () => {
  return (
    <TagCloud
      minSize={12}
      maxSize={30}
      tags={this.props.tags}
      onClick={(tag) => this.props.fetchTopic(tag.value)}
    />
  )
}
