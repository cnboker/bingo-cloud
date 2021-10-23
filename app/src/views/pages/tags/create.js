import { Tags } from '../Components/tagify/Tagify.react.js'
import React from 'react'
import { connect } from 'react-redux'
import { fetchTags, tagUpdate } from './actions'

// setup some basic Tagify settings object
var tagifySettings = {
  blacklist: [],
}

// Demo "App" component that is using the Tagify React component (<Tags/>)
class TagCreate extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      catelog: props.catelog || props.location.state.catelog,
    }

    tagifySettings.callbacks = {
      add: this.onTagifyAdd,
      remove: this.onTagifyRemove,
      input: this.onTagifyInput,
      invalid: this.onTagifyInvalid,
    }
  }

  componentDidMount() {
    this.props.fetchTags(this.state.catelog)
  }

  // callbacks for all of Tagify's events:
  onTagifyAdd = (e) => {
    console.log('added:', e.detail.data)
  }

  onTagifyRemove = (e) => {
    console.log('remove:', e.detail)
  }

  onTagifyInput = (e) => {
    console.log('input:', e.detail)
  }

  onTagifyInvalid = (e) => {
    console.log('invalid:', e.detail)
  }

  get tagify() {
    // eslint-disable-next-line react/no-string-refs
    return this.refs.tag.tagify
  }

  //初始化tag数据
  componentDidUpdate(preProps) {
    if (preProps.tags !== this.props.tags) {
      const catelog = this.state.catelog
      this.tagify.removeAllTags()
      this.tagify.addTags(this.props.tags[catelog])
    }
  }

  render() {
    return (
      <React.Fragment>
        <Tags
          // eslint-disable-next-line react/no-string-refs
          ref="tag"
          mode="textarea"
          autofocus={true}
          className="tagify"
          name="tags"
          settings={tagifySettings}
        />
        <div className="mt-3">
          <button
            className="btn btn-primary"
            onClick={() =>
              this.props.tagUpdate({
                catelog: this.state.catelog,
                content: this.tagify.value.map((x) => x.value).join(),
              })
            }
          >
            保存
          </button>
        </div>
      </React.Fragment>
    )
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mapStateToProps = (state, ownProps) => {
  return { tags: state.tagReducer }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    fetchTags: (catelog) => {
      dispatch(fetchTags(catelog))
    },
    tagUpdate: (data) => {
      dispatch(tagUpdate(data))
    },
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(TagCreate)
