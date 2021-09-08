import React, { useEffect } from "react";
//redux hook
import { useDispatch, useSelector } from "react-redux";
import { getDeviceLogs } from "../../actions";
import { instanceFetchRequest } from "~/views/Instance/actions";
import DeviceLogToolbar from "./deviceLogToolbar";
import Pager from "../../../Components/Tables/Pager";
import GR from '~/locale'
import {toShortDateTime} from '~/utils/string'


export default (props) => {
  const logTypeList = ["message", "warning", "fatal"];

  const { instance, client,deviceList,deviceLogReducer } = useSelector((state) => state);
  const deviceOptions = deviceList.map(x=>{
      return {label:x.name,value:x.deviceId}
  })
  //same as mapDispatchToProps
  const dispatch = useDispatch();
  let query = {};

  useEffect(() => {
    if (instance.successful) return;
    dispatch(instanceFetchRequest(client));
  }, []);

  const renderList = () => {
    const data = deviceLogReducer.data || [];
    return data.map((item,index) => {
      return (
        <tr key={index}>
            <td>{item.Name}</td>
            <td>{GR[logTypeList[item.MessageType-1]]}</td>
            <td>{item.IP}</td>
            <td>{toShortDateTime(item.UpdateDate)}</td>
            <td>{item.Message}</td>
        </tr>
      );
    });
  }

  const onSearch =(query) =>{
    const { server } = instance.payload;
    dispatch(getDeviceLogs(server,query));
  }

  const pagination = (data) => {    
    query.page = data.selected;
    const { server } = instance.payload;
    dispatch(getDeviceLogs(server,query));   
  }

  return (
    <div>
      <DeviceLogToolbar onSearch={onSearch} deviceOptions={deviceOptions}/>
      <br />
      <div className="table-responsive">
        <table className="table table-bordered table-striped table-sm">
          <thead>
            <tr>
              <th>{GR.name}</th>             
              <th>{GR.messageType}</th>
              <th>{GR.ip}</th>
              <th>{GR.createDate}</th>
              <th>{GR.message}</th>              
            </tr>
          </thead>
          <tbody>{renderList()}</tbody>
        </table>
        <br />
        <div className="float-right">
          <Pager
            pageCount={deviceLogReducer.pageCount}
            onPageChange={pagination}
          />
        </div>
      </div>
    </div>
  );
};
