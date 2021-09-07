import React, {useEffect, useState} from "react";
import axios from 'axios'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import moment from 'moment'
import dmsRes from "~/views/dms2/locals";
import GR from "~/locale";
import {authHeader} from '~/lib/check-auth'
import {SimpleCard} from '~/views/Components/Cards/Card'
import resources from "../../locale";

//7天告警
export default(props) => {
  const [data,
    setData] = useState([]);

  const url = `${process.env.REACT_APP_ORDER_URL}/api/sensor/recently7Days/${props.sensorId}`;

  useEffect(() => {
    if (!props.sensorId) 
      return;
    axios({url, method: "get", headers: authHeader()}).then((resp) => {
      var data = resp
        .data
        .map(x => {
          return {
            date: moment(x.createDate).format('MM/DD'),
            power: x[0] | 0,
            speed: x[1] | 0,
            smoke: x[2] | 0,
            flooding: x[3] | 0,
            temp: x[4] | 0,
            constantCurrentBoard: x[5] | 0,
            filterNet: x[6] | 0,
            vibration: x[7] | 0,
            doorLock: x[8] | 0
          }
        })
      setData(data)
    });
  }, [url, props.sensorId]);

  return (
    <SimpleCard title={resources.days7WarningStatistics}>
      <div
        style={{
        height: 320,
        backgroundColor: 'transparent',
        color: '#fff'
      }}>
        <ResponsiveContainer>
          <BarChart
            data={data}
            margin={{
            top: 15,
            right: 30,
            left: 20,
            bottom: 5
          }}>
            <CartesianGrid strokeDasharray="3 3"/>
            <XAxis dataKey="date"/>
            <YAxis
              label={{
              value: `${GR.quantity}`,
              angle: -90,
              position: "insideLeft",
              fill: "#fff"
            }}/>
            <Tooltip
              contentStyle={{
              'backgroundColor': '#f5f5f5',
              border: 'none',
              color: '#000',
              borderRadius: '5px',
              padding: '15px'
            }}
              cursor={{
              fill: "#446c9a"
            }}/>
            <Legend/>

            <Bar dataKey={"power"} fill="#f60000" name={dmsRes["power"]}/>
            <Bar dataKey={"speed"} fill="#ff8c00" name={dmsRes["speed"]}/>
            <Bar dataKey={"smoke"} fill="#ffee00" name={dmsRes["smoke"]}/>
            <Bar dataKey={"flooding"} fill="#4de94c" name={dmsRes["flooding"]}/>
            <Bar dataKey={"temp"} fill="#3783ff" name={dmsRes["temp"]}/>
            <Bar
              dataKey={"constantCurrentBoard"}
              fill="#4815aa"
              name={dmsRes["constantCurrentBoard"]}/>
            <Bar dataKey={"filterNet"} fill="#9167a9" name={dmsRes["filterNet"]}/>
            <Bar dataKey={"vibration"} fill="#ddaa49" name={dmsRes["vibration"]}/>
            <Bar dataKey={"doorLock"} fill="#82ca9d" name={dmsRes["doorLock"]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SimpleCard>
  )
};

//const {ecWorktime, screenWorktime, playerWorktime} = resources;
/*power = 0,
  speed = 1,
  smoke = 2,
  flooding = 3,
  temp = 4,
  constantCurrentBoard = 5,
  filterNet = 6,
  vibration = 7,
  doorLock = 8
  */
//  const defaultData = [   {     date: "7-1",     power: 1,     speed: 2,
// smoke: 0,     flooding: 0,     temp: 0,     constantCurrentBoard: 0,
// filterNet: 0,     vibration: 0,     doorLock: 0   }, {     date: "7-2",
// power: 1,     speed: 2,     smoke: 0,     flooding: 0,     temp: 0,
// constantCurrentBoard: 0,     filterNet: 0,     vibration: 0,     doorLock: 0
//  }, {     date: "7-3",     power: 1,     speed: 2,     smoke: 3,
// flooding: 4,     temp: 5,     constantCurrentBoard: 6,     filterNet: 7,
// vibration: 8,     doorLock: 9   } ];