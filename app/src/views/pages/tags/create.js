import { Tags } from '../../components/tagify/Tagify.react.js'
import React, { useEffect, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { fetchTags, tagUpdate } from './actions'
import G from '~/locale'
import { CAlert } from '@coreui/react'
// setup some basic Tagify settings object
var tagifySettings = {
  blacklist: [],
}

// Demo "App" component that is using the Tagify React component (<Tags/>)
export default ({ catelog }) => {
  //const catelog = catelog || location.state.catelog
  const tager = useRef()
  const tags = useSelector((state) => state.tagReducer)
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(fetchTags(catelog))
  }, [])

  // callbacks for all of Tagify's events:
  const onTagifyAdd = (e) => {
    console.log('added:', e.detail.data)
  }

  const onTagifyRemove = (e) => {
    console.log('remove:', e.detail)
  }

  const onTagifyInput = (e) => {
    console.log('input:', e.detail)
  }

  const onTagifyInvalid = (e) => {
    console.log('invalid:', e.detail)
  }

  tagifySettings.callbacks = {
    add: onTagifyAdd,
    remove: onTagifyRemove,
    input: onTagifyInput,
    invalid: onTagifyInvalid,
  }

  useEffect(() => {
    tager.current.tagify.removeAllTags()
    tager.current.tagify.addTags(tags[catelog])
  }, [tags])

  return (
    <React.Fragment>
      <CAlert color="secondary">{G.deviceAddGroupTips}</CAlert>
      <Tags
        // eslint-disable-next-line react/no-string-refs
        ref={tager}
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
            dispatch(
              tagUpdate({
                catelog: catelog,
                content: JSON.stringify(tager.current.tagify.value.map((x) => x.value)),
              }),
            )
          }
        >
          {G.save}
        </button>
      </div>
    </React.Fragment>
  )
}
