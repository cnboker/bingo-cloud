import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList
} from "recharts";
import resources from "../../locale";
import GR from "~/locale";
import {SimpleCard} from '~/views/Components/Cards/Card'
//const {ecWorktime, screenWorktime, playerWorktime} = resources;
const defaultData = [
  {
    date: "7-1",
    ecWorktime: 100,
    screenWorktime: 90,
    playerWorktime: 90
  }, {
    date: "7-2",
    ecWorktime: 120,
    screenWorktime: 100,
    playerWorktime: 100
  }, {
    date: "7-3",
    ecWorktime: 1200,
    screenWorktime: 1000,
    playerWorktime: 1000
  }
];
//7天工作状态统计
export default(props) => {
  return (
    <SimpleCard title={resources.day7StateStatistics}>
    <div
      style={{
      height: 320,
      color: "#fff",
      backgroundColor: 'transparent'
    }}>

      <ResponsiveContainer>
        <BarChart
          data={defaultData}
          margin={{
          top: 15,
          right: 30,
          left: 20,
          bottom: 5
        }}>
          <CartesianGrid strokeDasharray="3 3"/>
          <XAxis dataKey="date"></XAxis>
          <YAxis
            label={{
            value: `${GR.duration}(${GR.second})`,
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

          <Bar name={resources["ecWorktime"]} dataKey={"ecWorktime"} fill="#f60000">
            <LabelList dataKey="ecWorktime" position="top" fill="#fff"/>
          </Bar>
          <Bar
            name={resources["screenWorktime"]}
            dataKey={"screenWorktime"}
            fill="#ff8c00">
            <LabelList dataKey="screenWorktime" position="top" fill="#fff"/>
          </Bar>
          <Bar
            name={resources["playerWorktime"]}
            dataKey={"playerWorktime"}
            fill="#4de94c"
            label={resources["playerWorktime"]}>
            <LabelList dataKey="playerWorktime" position="top" fill="#fff"/>
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
    </SimpleCard>
  );
};

// const CustomTooltip = ({ active, payload, label }) => {   if (active) {
// return (       <div>         <p>{`${resources[payload[0].dataKey]} :
// ${payload[0].value}`}</p>         <p>{`${resources[payload[1].dataKey]} :
// ${payload[1].value}`}</p>         <p>{`${resources[payload[2].dataKey]} :
// ${payload[2].value}`}</p>       </div>     );   }   return null; };