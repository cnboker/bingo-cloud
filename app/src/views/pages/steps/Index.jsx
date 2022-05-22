import React, { useEffect, useState, useRef } from 'react'
import Stepper from 'bs-stepper'
import { CCard, CCardBody, CCardTitle } from '@coreui/react'
import 'bs-stepper/dist/css/bs-stepper.min.css'
import { steps } from './constants'
import { useSelector } from 'react-redux'
import G from '~/locale'
import R from './locale'
export default () => {
  const stepMaxIndex = steps.length + 1
  const ctx = useSelector((state) => state.orderContextReducer)
  const [stepIndex, setStepIndex] = useState(1)
  const stepperRef = useRef(null)
  useEffect(() => {
    stepperRef.current = new Stepper(document.querySelector('.bs-stepper'))
    //如果已经创建试用且未激活设备则跳转到设备激活页面
    if (ctx.isCreateTrial && ctx.deviceCount === 0) {
      stepperRef.current.to(2)
    } else {
      stepperRef.current.to(stepIndex)
    }
  }, [])

  const titleRender = () => {
    return steps.map((x, index) => {
      return (
        <React.Fragment key={index}>
          <Step index={index + 1} title={x.title} />
          <StepLine />
        </React.Fragment>
      )
    })
  }
  const contentRender = () => {
    return steps.map((x, index) => {
      return (
        <StepContent index={index + 1} key={index}>
          <div className="mb-5 mt-3">{x.component}</div>
          {stepIndex > 0 && (
            <button
              className="btn btn-light"
              onClick={() => {
                if (stepIndex > 1) {
                  setStepIndex(stepIndex - 1)
                }
                stepperRef.current.previous()
              }}
            >
              {G.last}
            </button>
          )}{' '}
          {stepIndex < stepMaxIndex && (
            <button
              className="btn btn-light"
              onClick={() => {
                if (stepIndex < stepMaxIndex) {
                  setStepIndex(stepIndex + 1)
                }
                stepperRef.current.next()
              }}
            >
              {G.next}
            </button>
          )}
        </StepContent>
      )
    })
  }

  return (
    <CCard>
      <CCardBody>
        <CCardTitle>{R.howtoUse}</CCardTitle>
        <div className="bs-stepper">
          <div className="bs-stepper-header" role="tablist">
            {titleRender()}
          </div>
          <div className="bs-stepper-content">{contentRender()}</div>
        </div>
      </CCardBody>
    </CCard>
  )
}

const Step = ({ index, title }) => {
  return (
    <div className="step" data-target={`#p${index}`}>
      <button
        type="button"
        className="step-trigger"
        role="tab"
        aria-controls={`p${index}`}
        id={`step${index}trigger`}
      >
        <span className="bs-stepper-circle">{index}</span>
        <span className="bs-stepper-label"> {title}</span>
      </button>
    </div>
  )
}
const StepLine = () => {
  return <div className="line"></div>
}

const StepContent = ({ index, children }) => {
  return (
    <div
      id={`p${index}`}
      className="bs-stepper-pane"
      role="tabpanel"
      aria-labelledby={`step${index}trigger`}
    >
      {children}
    </div>
  )
}
