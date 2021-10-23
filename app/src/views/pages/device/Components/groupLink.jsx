import React, { useEffect, useState } from 'react'
import resources from '../locale'
import Dropdown from '~/views/components/forms/Dropdown'
import { useSelector } from 'react-redux'
import { TagCatelog } from '../../tags/contants'

export default ({ name, groupSelect }) => {
  const tagReducer = useSelector((state) => state.tagReducer)
  const [data, setData] = useState([])
  const onTag = (e) => {
    e.preventDefault()
    this.props.history.push({
      pathname: '/tags/create',
      state: {
        catelog: TagCatelog.deviceGroup,
      },
    })
  }

  const getData = () => {
    var data = tagReducer[TagCatelog.deviceGroup].map((val) => {
      return { key: val, value: val }
    })

    data.splice(0, 0, {
      value: 'notset',
      key: resources.notset,
    })
    data.splice(0, 0, {
      value: '__all',
      key: resources.all,
    })
    return data
  }

  useEffect(() => {
    setData(getData())
  }, [tagReducer])

  return (
    <React.Fragment>
      <Dropdown
        title={resources.groupFilter}
        color="primary"
        data={data}
        onSelect={(val) => groupSelect(val)}
      />{' '}
      <button className="btn btn-link btn-sm" onClick={onTag}>
        {name || resources.group}
      </button>
    </React.Fragment>
  )
}
