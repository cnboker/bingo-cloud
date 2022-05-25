import React from 'react'
import { CWidgetStatsA } from '@coreui/react'
import { CChartBar, CChartLine } from '@coreui/react-chartjs'
import G from '~/locale'
import { getStyle } from '@coreui/utils'

//data:[1, 2, 3, 4, 5, 6, 7,0,10,11,12],
//color:['blue','lightBule','orange','red']
export const ChartColor = {
  blue: ['transparent', 'rgba(255,255,255,.55)'],
  lightBlue: ['transparent', 'rgba(255,255,255,.55)'],
  orange: ['rgba(255,255,255,.2)', 'rgba(255,255,255,.55)'],
  red: ['rgba(255,255,255,.2)', 'rgba(255,255,255,.55)'],
}

const dataLabel = [
  `1${G.month}`,
  `2${G.month}`,
  `3${G.month}`,
  `4${G.month}`,
  `5${G.month}`,
  `6${G.month}`,
  `7${G.month}`,
  `8${G.month}`,
  `9${G.month}`,
  `10${G.month}`,
  `11${G.month}`,
  `12${G.month}`,
]

export const LineChart = ({ colorClassName, h1, title, datasetLabel, data, color }) => {
  return (
    <CWidgetStatsA
      className="mb-4"
      color={colorClassName}
      value={<>{h1}</>}
      title={title}
      chart={
        <CChartLine
          className="mt-3 mx-3"
          style={{ height: '70px' }}
          data={{
            labels: dataLabel,
            datasets: [
              {
                label: datasetLabel,
                backgroundColor: color[0],
                borderColor: color[1],
                pointBackgroundColor: getStyle('--cui-primary'),
                data: data,
              },
            ],
          }}
          options={{
            plugins: {
              legend: {
                display: false,
              },
            },
            maintainAspectRatio: false,
            scales: {
              x: {
                grid: {
                  display: false,
                  drawBorder: false,
                },
                ticks: {
                  display: false,
                },
              },
              y: {
                min: 0,
                max: 10,
                display: false,
                grid: {
                  display: false,
                },
                ticks: {
                  display: false,
                },
              },
            },
            elements: {
              line: {
                borderWidth: 2,
                tension: 0.4,
              },
              point: {
                radius: 0,
                hitRadius: 10,
                hoverRadius: 4,
              },
            },
          }}
        />
      }
    />
  )
}

export const BarChart = ({ h1, title, datasetLabel, data, color }) => {
  return (
    <CWidgetStatsA
      className="mb-4"
      color="danger"
      value={<>{h1}</>}
      title={title}
      chart={
        <CChartBar
          className="mt-3 mx-3"
          style={{ height: '70px' }}
          data={{
            labels: dataLabel,
            datasets: [
              {
                label: datasetLabel,
                backgroundColor: color[0],
                borderColor: color[1],
                data: data,
                barPercentage: 0.6,
              },
            ],
          }}
          options={{
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false,
              },
            },
            scales: {
              x: {
                grid: {
                  display: false,
                  drawTicks: false,
                },
                ticks: {
                  display: false,
                },
              },
              y: {
                grid: {
                  display: false,
                  drawBorder: false,
                  drawTicks: false,
                },
                ticks: {
                  display: false,
                },
              },
            },
          }}
        />
      }
    />
  )
}
