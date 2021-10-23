import React from 'react'
import resources from './locale'
import { connect } from 'react-redux'

class MqttMonitor extends React.Component {
  constructor() {
    super()
    this.state = {
      deviceDownloadProgressInfo: {},
    }
  }

  componentDidUpdate(nextProps, nextState) {
    if (nextProps.downloadProgress !== this.props.downloadProgress) {
      const { deviceInfo } = this.props
      var deviceDownloadProgressInfo = nextProps.downloadProgress[deviceInfo.deviceId]
      console.log(
        'MqttMonitor-componentDidUpdate',
        nextProps.downloadProgress,
        deviceDownloadProgressInfo,
      )
      if (deviceDownloadProgressInfo) {
        this.setState({ deviceDownloadProgressInfo })
      }
    }
  }

  downloadProgressDataFormat() {
    const downloadProgressData = this.state.deviceDownloadProgressInfo

    if (!downloadProgressData.fileName) {
      return (
        <div className="row">
          <label className="col-sm-4 col-form-label">{resources.downloadProgress}</label>
          <div className="col-sm-8">
            <input
              type="text"
              readOnly
              className="form-control-plaintext"
              value={resources.noData}
            ></input>
          </div>
        </div>
      )
    } else {
      return (
        <div className="row">
          <label className="col-sm-4 col-form-label">{resources.downloadProgress}</label>
          <div className="col-sm-8">
            <input
              type="text"
              readOnly
              className="form-control-plaintext"
              value={downloadProgressData.fileName}
            ></input>
            <small className="form-text">
              {`${resources.downloaded} : ${downloadProgressData.downloaded}`}
              <br /> {`${resources.downloadSpeed} : ${downloadProgressData.downloadSpeed}`}
              <br /> {`${resources.remainingTime} : ${downloadProgressData.remainingTime}`}
            </small>
          </div>
        </div>
      )
    }
  }

  render() {
    const { deviceInfo } = this.props
    return (
      <form>
        <div className="row">
          <label className="col-sm-4 col-form-label">{resources.device_name}</label>
          <div className="col-sm-8">
            <input
              type="text"
              readOnly
              className="form-control-plaintext"
              value={deviceInfo.name}
            ></input>
          </div>
        </div>
        <div className="row">
          <label className="col-sm-4 col-form-label">{'MAC'}</label>
          <div className="col-sm-8">
            <input
              type="text"
              readOnly
              className="form-control-plaintext"
              value={deviceInfo.mac}
            ></input>
          </div>
        </div>
        <div className="row">
          <label className="col-sm-4 col-form-label">{resources.device_status}</label>
          <div className="col-sm-8">
            <input
              type="text"
              readOnly
              className="form-control-plaintext"
              value={deviceInfo.status}
            ></input>
          </div>
        </div>
        {this.downloadProgressDataFormat()}
      </form>
    )
  }
}

const mapStateToProps = (state, ownProps) => {
  return { downloadProgress: state.downloadProgressReducer }
}

export default connect(mapStateToProps)(MqttMonitor)
