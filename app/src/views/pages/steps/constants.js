import React from 'react'
import {
  StepTry,
  StepActivateDevice,
  StepUploadResource,
  StepPageDesign,
  StepPublish,
} from './steps'
import R from './locale'
export const steps = [
  {
    title: R.try,
    stepIndex: 0,
    component: <StepTry />,
  },
  {
    title: R.activate,
    stepIndex: 0,
    component: <StepActivateDevice />,
  },
  {
    title: R.uploadFile,
    stepIndex: 0,
    component: <StepUploadResource />,
  },
  {
    title: R.design,
    stepIndex: 0,
    component: <StepPageDesign />,
  },
  {
    title: R.publish,
    stepIndex: 0,
    component: <StepPublish />,
  },
]
