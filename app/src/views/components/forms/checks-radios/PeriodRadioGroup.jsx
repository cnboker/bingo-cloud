import React from 'react'
import LocalizedStrings from 'react-localization'
import CheckGroup from './CheckGroup'
const R = new LocalizedStrings({
  en: {
    week: 'Week',
    month: 'Month',
    year: 'Year',
  },
  zh: {
    week: '周',
    month: '月',
    year: '年',
  },
})

export const DefaultConfig = [
  { label: `1${R.week}`, value: 7 },
  { label: `1${R.month}`, value: 30 },
  { label: `2${R.month}`, value: 60 },
  { label: `3${R.month}`, value: 90 },
  { label: `4${R.month}`, value: 120 },
  { label: `5${R.month}`, value: 150 },
  { label: `6${R.month}`, value: 180 },
  { label: `1${R.year}`, value: 360 },
  { label: `1${R.year}`, value: 720 },
]

export const PeriodRadioGroup = ({ onChecked, defaultSelect }) => {
  return (
    <CheckGroup
      data={DefaultConfig}
      name="period"
      onChecked={onChecked}
      defaultSelect={defaultSelect}
    />
  )
}
