import React, {useEffect, useState} from "react";
import GR from '~/locale'
import {toShortDateTime} from '~/utils/string'
import {waringType} from '~/views/dms2/constants'
import dmsRes from '~/views/dms2/locals'
import axios from 'axios';
import {authHeader} from '~/lib/check-auth'
import {SimpleCard} from '~/views/Components/Cards/Card'
import resources from "../../locale";
import Pager from "../../../Components/Tables/Pager";
import moment from 'moment'
import momentDurationFormatSetup from 'moment-duration-format'
momentDurationFormatSetup(moment);

export default(props) => {
  const {sensorId} = props
  const [data,
    setData] = useState({pageCount: 0, records: []});

  const urlFragment = `${process.env.REACT_APP_ORDER_URL}/api/sensor/recently7DaysMessages/${sensorId}`;

  const [part,
    setPart] = useState(-1);
  const [page,
    setPage] = useState(0);

  useEffect(() => {
    //console.log('url change trigger', url)
    var url = `${urlFragment}?part=${part}&page=${page}`;
    axios({url, method: "get", headers: authHeader()}).then((resp) => {
      setData(resp.data);
    });},
  [part, page]);

  const renderLinks = () => {
    return waringType.map((x, index) => {
      return (
        <span
          key={index}
          
          onClick={(x) => {
          setPart(index)
        }}
          className={`badge badge-info`}>{dmsRes[x]}</span>
      )
    })
  }

  const renderState = (status) => {
    if (status) {
      return <span className="badge badge-success">{GR.normal}</span>;
    } else {
      return <span className="badge badge-danger">{GR.warn}</span>;
    }
  }

  const recoveryTime = (item) => {
    let duration = '';
    if (item.updateDate) {
      let minutes = moment(item.updateDate).diff(moment(item.createDate), 'minutes');
      console.log('minutes', minutes)
      duration = moment
        .duration(minutes, 'minutes')
        .format('h:mm');
      duration = dmsRes
        .nMinutesRecovery
        .replace('#duration#', duration);
    }
    return duration
  }

  const renderList = () => {
    return data
      .records
      .map((item, index) => {
        return (
          <tr key={index}>
            <td>{dmsRes[waringType[item.part]]}</td>
            <td>{renderState(item.status)}</td>
            <td>{item.remark}</td>
            <td>{recoveryTime(item)}</td>
          </tr>
        )
      })
  }

  const pagination = (data) => {
    setPage(data.selected);
  }

  return (
    <SimpleCard title={resources.days7WarningMessage}>
      <div className="row">
        <div className="col">{renderLinks()}</div>
      </div>
      <div className="table-responsive">
        <table className="table table-bordered table-striped table-sm">
          <thead>
            <tr>
              <th>{`${GR.sensor}${GR.name}`}</th>
              <th>{GR.status}</th>
              <th>{GR.remark}</th>
              <th>{resources.recoveryTime}</th>
            </tr>
          </thead>
          <tbody>{renderList()}</tbody>
        </table>
        <div className="float-right">
          <Pager pageCount={data.pageCount} onPageChange={pagination}/>
        </div>
      </div>
    </SimpleCard>
  )
}