import React from "react";
import resources from "../../locale";
import {BrowserRouter as Router, Switch, useRouteMatch, useParams} from "react-router-dom";
import DeviceDetail from "./deviceDetail";
import DeviceLogs from "./deviceLogs";
import DeviceScreenCap from "./deviceScreenCap";
import DownloadProgress from "./downloadProgress";
import {PrivateRoute} from "~/lib/check-auth";
import {useSelector} from "react-redux";
import Navs from '~/components/Navs'
import Test from './test';

export default(props) => {
  let match = useRouteMatch();
  let {id} = useParams();

  const navs = [
    {
      url: `/device/details/${id}`,
      text: resources.deviceMonitor
    }, {
      url: `${match.url}/screen`,
      text: resources.deviceScreenCap
    }, {
      url: `${match.url}/logs`,
      text: resources.deviceLogs
    }, {
      url: `${match.url}/downloadProgress`,
      text: resources.downlaodProgress
    }
  ];

  const curDeviceInfo = useSelector((state) => state.deviceList.find((c) => c.deviceId === id));

  const sensorId = useSelector(state => {
    var fanModel = state
      .sensorReducer
      .sensorConfig
      .fanModel
      .find(x => x.deviceId === id);
    return fanModel
      ? fanModel.sensorId
      : ''
  });

  

  return (
    <Router>
      <div>
        <Navs data={navs}/>
        <Switch>
          <PrivateRoute
            path={`${match.path}/screen`}
            component={() => {
            return (<DeviceScreenCap deviceInfo={curDeviceInfo}/>)
          }}/>
          <PrivateRoute
            path={`${match.path}/logs`}
            component={() => {return (<DeviceLogs deviceInfo={curDeviceInfo}/>)}}/>
          <PrivateRoute
            path={`${match.path}/downloadProgress`}
            component={() => {
            return (<DownloadProgress deviceInfo={curDeviceInfo}/>)
          }}/>
          <PrivateRoute
            exact
            path={`${match.path}`}
            component={() => {
            return (<DeviceDetail deviceInfo={curDeviceInfo} sensorId={sensorId}/>)
          }}/>
        </Switch>
      </div>

    </Router>
  );
};
