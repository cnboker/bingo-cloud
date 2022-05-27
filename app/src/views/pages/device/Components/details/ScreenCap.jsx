import React, { useEffect } from 'react'
import { useParams } from 'react-router-dom'
//redux hook
import { useDispatch, useSelector } from 'react-redux'
import { getDeviceSnapshot } from '../../actions'
import { Card } from '~/views/components/widgets/Card'
import GR from '~/locale'

export default (props) => {
  const { deviceInfo } = props
  const { client } = useSelector((state) => state)

  //same as mapDispatchToProps
  const dispatch = useDispatch()
  let { id } = useParams()

  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(getDeviceSnapshot(id))
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  if (!deviceInfo.SpanshotImageUrlObject) {
    return <div>{GR.waitLoading}</div>
  }
  if ((deviceInfo.value || 2) !== 1) {
    return <div>{GR.offline}</div>
  }
  if (!deviceInfo.SpanshotImageUrlObject) {
    return <>no data</>
  }
  return (
    <>
      <Card headerTitle={deviceInfo.SpanshotImageUrlObject.title}>
        <img
          style={{ width: '780px' }}
          alt="screen scrap"
          src={`${deviceInfo.SpanshotImageUrlObject.imageUrl}`}
        />
      </Card>
    </>
  )
}
