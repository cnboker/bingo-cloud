import React, { useState } from 'react'
import resources from '../locale'
import { useSelector } from 'react-redux'
import { TagCatelog } from '../../tags/contants'
import { CButton } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilApplications } from '@coreui/icons'
import Offcanvas from '~/views/components/dialog/Offcanvas'
import TagCreate from '../../tags/create'

export default ({ groupSelect }) => {
  const tagReducer = useSelector((state) => state.tagReducer)
  const [visible, setVisible] = useState(false)

  const getData = () => {
    if (!tagReducer[TagCatelog.deviceGroup]) return []
    //console.log('tagReducer', tagReducer)
    var data = tagReducer[TagCatelog.deviceGroup].map((val) => {
      return { key: val, value: val }
    })

    data.splice(0, 0, {
      value: '',
      key: resources.all,
    })
    return data
  }

  let data = getData()

  return (
    <React.Fragment>
      {visible && (
        <Offcanvas visible={visible} placement="start" onHide={() => setVisible(false)}>
          <TagCreate catelog={TagCatelog.deviceGroup} />
        </Offcanvas>
      )}
      {data.map((x) => {
        return (
          <CButton
            color="light"
            shape="rounded-pill"
            key={x.key}
            onClick={() => groupSelect(x.value)}
          >
            {x.key}
          </CButton>
        )
      })}
      <button className="btn btn-link btn-sm" onClick={() => setVisible(true)}>
        <CIcon icon={cilApplications} size="xl" title="group create" />
      </button>
    </React.Fragment>
  )
}
