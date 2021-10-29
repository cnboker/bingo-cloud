import React from 'react'
import {
  StepTry,
  StepActivateDevice,
  StepUploadResource,
  StepPageDesign,
  StepPublish,
} from './steps'

export const steps = [
  {
    title: '试用/下单',
    stepIndex: 0,
    component: <StepTry />,
  },
  {
    title: '激活设备',
    stepIndex: 0,
    component: <StepActivateDevice />,
  },
  {
    title: '上传素材',
    stepIndex: 0,
    component: <StepUploadResource />,
  },
  {
    title: '内容设计',
    stepIndex: 0,
    component: <StepPageDesign />,
  },
  {
    title: '发布内容',
    stepIndex: 0,
    component: <StepPublish />,
  },
]
