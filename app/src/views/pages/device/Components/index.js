import React, { Component } from 'react'
import Dialog from '../../Components/Modals/Dialog'
import TableContainer from '../../Components/Tables/TableContainer'
import resources from '../locale'
import SensorCreate from './sensorCreate'
import Table from './Table'
import RowFliter from './rowFliter'
import Pager from '../../Components/Tables/Pager'
import { PAGE_SIZE } from '../../../config'
import DeviceGroup from './groupLink'
import { tagCatelog } from '../../Tags/contants'
import { DeviceGroupSelector } from './deviceGroupSelector'
import InputDialog from '~/views/Components/Modals/InputDialog'
import GR from '~/locale'
import Search from '~/views/Components/Forms/Search'
export default class Index extends Component {
  constructor(props) {
    super(props)
    const search = props.location.search
    const params = new URLSearchParams(search)

    this.deviceStatus = parseInt(params.get('status') || 0, 0)

    this.state = {
      pageCount: 0,
      tableData: [],
    }
    this.mqttSubscribled = false
    this.selectGroup = '__all'
  }

  componentDidMount() {
    const { deviceListAction, fetchTags, fetchSensorConfig, getUserSensorIds, client } = this.props
    deviceListAction(client.userName)
    getUserSensorIds(client.userName)
    fetchTags(tagCatelog.deviceGroup)
    fetchTags(tagCatelog.sensorModel)
    fetchSensorConfig(this.props.client.userName)
    this.timer = setInterval(() => {
      deviceListAction(this.props.client.userName)
    }, 60000)
  }

  componentWillUnmount() {
    if (this.timer) {
      clearInterval(this.timer)
    }
  }

  componentDidUpdate(preProps, nextState) {
    if (preProps.deviceList !== this.props.deviceList) {
      var data = this.getTableData()
      this.setState({
        ...data,
      })
      console.log('componentDidUpdate deviceList update....', data)
      if (!this.mqttSubscribled) {
        this.mqttSubscribled = true
        this.props.deviceMQTTSubscrible(preProps.deviceList.map((x) => x.deviceId))
      }
    } else if (preProps.authorize.payload !== this.props.authorize.payload) {
      console.log(
        'preProps.authorize.deviceId',
        preProps.authorize.payload,
        this.props.authorize.payload,
      )
      this.props.updateLicense(this.props.client.userName, this.props.authorize.payload.deviceId)
    }
  }

  userFilter(userName) {
    this.userName = userName
    var data = this.getTableData()
    this.setState({
      ...data,
    })
  }

  deviceStatusFliter(deviceStatus) {
    //console.log("deviceStatus", deviceStatus);
    this.deviceStatus = deviceStatus
    var data = this.getTableData()
    this.setState({
      ...data,
    })
  }

  groupFilter(group) {
    this.selectGroup = group
    var data = this.getTableData()
    this.setState({
      ...data,
    })
  }

  updateLicense(id) {
    const { authorizeAction, client } = this.props
    console.log('updatelicnese id=', id)
    this.refs.dialog.show({
      title: resources.info,
      body: resources.confirmInfo,
      actions: [
        Dialog.CancelAction(() => {
          console.log('dialog cancel')
        }),
        Dialog.OKAction(() => {
          authorizeAction({ id, client })
        }),
      ],
      onHide: (dialog) => {
        dialog.hide()
      },
    })
  }

  //set sensor code
  updateSensor(deviceId) {
    var fanModel = this.props.sensorConfig.fanModel.find((x) => x.deviceId === deviceId)
    var newObject = false
    if (!fanModel) {
      fanModel = {
        deviceId,
      }
      newObject = true
    }
    var fanClone = { ...fanModel }
    this.refs.dialog.show({
      title: resources.info,
      body: (
        <SensorCreate
          fanModel={fanClone}
          userSensorIds={this.props.userSensorIds}
          ref={(e) => (this.sensorCreate = e)}
          sensorModel={this.props.tagReducer[tagCatelog.sensorModel]}
        />
      ),
      actions: [
        Dialog.CancelAction(() => {
          //console.log("dialog cancel");
        }),
        Dialog.DefaultAction('Ok', (dialog) => {
          var sensorId = fanModel.sensorId
          var output = fanClone
          fanModel.name = output.name
          fanModel.model = output.model
          fanModel.sensorId = output.sensorId
          dialog.hide()
          this.props.deviceUpdateSensor(deviceId, output.name)
          // var data = this.props.sensorConfig.fanModel;
          // if (newObject) {
          //   data = [fanModel, ...data];
          // }
          // data = data.filter((x) => {
          //   return x.sensorId !== undefined && x.deviceId !== undefined && x.name !== undefined
          // });
          console.log('snesors=', fanModel)
          //this.props.updateFanModel(data);
          if (!output.sensorId) {
            this.props.fanModelRemove(sensorId)
          } else {
            this.props.updateFanModel(fanModel)
          }
        }),
      ],
      onHide: (dialog) => {
        dialog.hide()
      },
    })
  }

  //update device name
  updateName(deviceId, oldName) {
    console.log(`deviceId:${deviceId},oldName:${oldName}`)
    var newName = oldName

    this.refs.dialog.show({
      title: resources.info,
      body: (
        <InputDialog
          label={resources.device_name}
          value={oldName}
          inputchange={(val) => {
            newName = val
          }}
        />
      ),
      actions: [
        Dialog.CancelAction(() => {
          //console.log("dialog cancel");
        }),
        Dialog.OKAction(() => {
          if (newName === oldName) return
          this.props.deviceUpdateName(deviceId, newName)
          //dialog end
        }),
      ],
      onHide: (dialog) => {
        dialog.hide()
      },
    })
  }

  getTableData(page = 0) {
    let { deviceList } = this.props
    //console.log('gettabledata', deviceList)
    const { sensorConfig } = this.props
    if (this.keyword) {
      const fanModelMap = sensorConfig.fanModel.reduce((map, val) => {
        map[val.deviceId] = val
        return map
      }, {})

      deviceList = deviceList.filter((item) => {
        var sensorId = ''
        var model = fanModelMap[item.deviceId]
        if (model) {
          sensorId = model.sensorId
        }
        return (
          (item.sensorNo && item.sensorNo.indexOf(this.keyword) >= 0) ||
          sensorId.indexOf(this.keyword) >= 0
        )
      })
    }
    if (this.deviceStatus > 0) {
      deviceList = deviceList.filter((item) => {
        return item.value === this.deviceStatus
      })
    }
    deviceList = deviceList.filter((item) => {
      return item.tenantUserName === this.props.client.userName
    })

    if (this.selectGroup === 'notset') {
      deviceList = deviceList.filter((item) => {
        return !item.group
      })
    } else if (this.selectGroup !== '__all') {
      deviceList = deviceList.filter((item) => {
        return item.groupName === this.selectGroup
      })
    }

    var currentIndex = page * PAGE_SIZE
    return {
      pageCount: Math.ceil(deviceList.length / PAGE_SIZE),
      tableData: deviceList.slice(currentIndex, currentIndex + PAGE_SIZE),
    }
  }

  updateGroup(deviceId, oldName) {
    var selectGroup = ''
    this.refs.dialog.show({
      title: resources.groupSetting,
      body: (
        <DeviceGroupSelector
          groupName={oldName}
          groupList={this.props.tagReducer[tagCatelog.deviceGroup]}
          onSelect={(g) => (selectGroup = g.value)}
        />
      ),
      actions: [
        Dialog.CancelAction(() => {
          console.log('dialog cancel')
        }),
        Dialog.OKAction(() => {
          this.props.deviceGroupUpdate(deviceId, selectGroup)
        }),
      ],
    })
  }

  pagination(page) {
    var data = this.getTableData(page.selected)
    this.setState({
      ...data,
    })
  }

  createVM(e) {
    const { createVMRequest } = this.props
    var inputValue = 5
    this.refs.dialog.show({
      title: GR.info,
      body: (
        <InputDialog
          label={resources.inputDeviceQuantity}
          placeholder={'Please input device quantity.'}
          value={'0'}
          inputchange={(val) => {
            inputValue = val
          }}
        />
      ),
      actions: [
        Dialog.CancelAction(() => {
          //console.log("dialog cancel");
        }),
        Dialog.OKAction(() => {
          if (+inputValue <= 0) {
            return
          }
          createVMRequest(+inputValue)
        }),
      ],
      onHide: (dialog) => {
        dialog.hide()
      },
    })
  }

  vmDelete(id) {
    const { vmDelete, sensorConfig } = this.props
    var fanModel = sensorConfig.fanModel
    this.refs.dialog.show({
      title: resources.info,
      body: resources.confirmInfo,
      actions: [
        Dialog.CancelAction(() => {
          console.log('dialog cancel')
        }),
        Dialog.OKAction(() => {
          vmDelete(id)

          for (var i = 0; i < fanModel.length; i++) {
            if (fanModel[i].deviceId === id) {
              this.props.fanModelRemove(fanModel[i].sensorId)
              break
            }
          }
        }),
      ],
      onHide: (dialog) => {
        dialog.hide()
      },
    })
  }

  keywordFilter(keyword) {
    this.keyword = keyword
    var data = this.getTableData()
    this.setState({
      ...data,
    })
  }

  render() {
    return (
      <TableContainer title={resources.device_mgt}>
        <Dialog ref="dialog" />
        <div className="row">
          <div className="col-md-3">
            <DeviceGroup
              deviceList={this.props.deviceList}
              history={this.props.history}
              tagReducer={this.props.tagReducer}
              deviceGroupUpdate={this.props.deviceGroupUpdate}
              groupFilter={this.groupFilter.bind(this)}
            />
            <button className="btn btn-link btn-sm" onClick={this.createVM.bind(this)}>
              {resources.createVMDevice}
            </button>
          </div>
          <div className="col-md-3">
            <Search onKeywordChange={this.keywordFilter.bind(this)} />
          </div>
          <div className="col-md-6">
            <RowFliter
              agentUserListAction={this.props.agentUserListAction}
              client={this.props.client}
              deviceStatusFliter={this.deviceStatusFliter.bind(this)}
              userFilter={this.userFilter.bind(this)}
              deviceStatus={this.state.deviceStatus}
              agentUserList={this.props.agentUserList}
              {...this.props}
            />
          </div>
        </div>
        <br />
        <div className="table-responsive">
          <Table
            tableData={this.state.tableData}
            sensorConfig={this.props.sensorConfig}
            updateLicense={this.updateLicense.bind(this)}
            updateName={this.updateName.bind(this)}
            updateSensor={this.updateSensor.bind(this)}
            updateGroup={this.updateGroup.bind(this)}
            vmDelete={this.vmDelete.bind(this)}
            deviceSelected={this.props.deviceSelected}
          />
          <div className="float-right">
            <Pager pageCount={this.state.pageCount} onPageChange={this.pagination.bind(this)} />
          </div>
        </div>
      </TableContainer>
    )
  }
}
