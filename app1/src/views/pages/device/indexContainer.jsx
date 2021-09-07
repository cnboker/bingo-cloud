import { connect } from "react-redux";
import Index from "./Components/index";
import { authorizeRequest } from "../Authorize/actions";
import { agentUserListRequest } from "../Users/actions";
import {
  deviceListRequest,
  deviceUpdateName,
  deviceUpdateSensor,
  updateLicense,
  deviceMQTTSubscrible,
  deviceSelected,
  deviceGroupUpdate,
  createVMRequest,
  deleteVMDevice
} from "./actions";

import {fetchTags} from '../Tags/actions'
import {findSensorConfig,updateFanModel,fanModelRemove} from "../dms2/actions/sensorConfig";
import {getUserSensorIds} from '../dms2/actions/sensorActions';

const mapStateToProps = (state, ownProps) => {
  return {
    deviceList: state.deviceList,
    authorize: state.authorize,
    client: state.client,
    agentUserList: state.agentUsersReducer,
    instance: state.instance,
    tagReducer:state.tagReducer,
    sensorConfig:state.sensorReducer.sensorConfig,
    userSensorIds:state.sensorReducer.userSensorIds
  };
};

const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    deviceListAction: userName => dispatch(deviceListRequest(userName)),
    authorizeAction: values => dispatch(authorizeRequest(values)),
    agentUserListAction: values => dispatch(agentUserListRequest(values)),
    deviceUpdateName: (deviceId, name) =>
      dispatch(deviceUpdateName(deviceId, name)),
    deviceUpdateSensor: (deviceId, name) =>
      dispatch(deviceUpdateSensor(deviceId, name)),
    updateLicense: (userName, deviceId) =>
      dispatch(updateLicense(userName, deviceId)),
    deviceMQTTSubscrible: ids => dispatch(deviceMQTTSubscrible(ids)),
    //fetch device group
    fetchTags:catelog=>dispatch(fetchTags(catelog)),
    deviceSelected:(device,selected)=>dispatch(deviceSelected(device,selected)),
    deviceGroupUpdate:(deviceId,groupName)=>dispatch(deviceGroupUpdate(deviceId,groupName)),
    fetchSensorConfig: (userName) => {
      dispatch(findSensorConfig(userName));
    },
    updateFanModel:(model)=>dispatch(updateFanModel(model)),
    getUserSensorIds:(username)=>dispatch(getUserSensorIds(username)),
    createVMRequest:(quantity)=>dispatch(createVMRequest(quantity)),
    vmDelete:(id)=>dispatch(deleteVMDevice(id)),
    fanModelRemove:(id)=>dispatch(fanModelRemove(id))
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Index);
