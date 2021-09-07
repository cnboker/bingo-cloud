import Select from "react-select";
import GR from "~/locale";
import DatePicker from "react-datepicker";
import React, { useState } from "react";
import moment from "moment";

export default (props) => {
  const logTypeList = ["message", "warning", "fatal"];

  const { onSearch, deviceOptions } = props;
  const [logType, setLogType] = useState({
    label: "message",
    value: 1,
  });
  const [deviceId, setDeviceId] = useState({ label: "", value: "" });
  const [startDate, setStartDate] = useState(moment().subtract(30, "days"));
  const [endDate, setEndDate] = useState(moment());
  
  return (
    <React.Fragment>
      <div className="row">
        <div className="col ddl">
          <Select
            onChange={(o) => {
              setLogType(o);
            }}
            isClearable={true}
            options={logTypeList.map((x, index) => {
              return { label: GR[x], value: index + 1 };
            })}
          />
        </div>
        <div className="col ddl">
          <Select
            onChange={(o) => {
              setDeviceId(o);
            }}
            isClearable={true}
            options={deviceOptions}
          />
        </div>

        <div className="col">
          <DatePicker
            className="form-control"
            selected={startDate}
            onChange={(date) => {
              setStartDate(date);
            }}
          />
        </div>
        <div className="col">
        
          <DatePicker
            className="form-control"
            selected={endDate}
            onChange={(date) => {
              setEndDate(date);
            }}
          />
        </div>
        <div className="col">
          <button
            onClick={() => {
              if (onSearch) {
                onSearch({
                  logType: logType?logType.value:'',
                  key: deviceId?deviceId.value:'',
                  startDate:startDate.format('YYYY-MM-DD'),
                  endDate:endDate.format('YYYY-MM-DD'),
                });
              }
            }}
            className="btn btn-info"
          >
            {GR.search}
          </button>
        </div>
      </div>
    </React.Fragment>
  );
};
