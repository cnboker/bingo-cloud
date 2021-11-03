import React, { useEffect } from 'react'
import Stepper from 'bs-stepper'
import { CCard, CCardBody, CCardTitle } from '@coreui/react'
import 'bs-stepper/dist/css/bs-stepper.min.css'
import { steps } from './constants'
import { useSelector } from 'react-redux'
export default () => {
  var stepper
  var stepIndex = 1
  var stepMaxIndex = steps.length + 1
  const ctx = useSelector((state) => state.orderContextReducer)

  useEffect(() => {
    stepper = new Stepper(document.querySelector('.bs-stepper'))

    /// Will navigate to the second step
    stepper.to(stepIndex)
  }, [])

  useEffect(() => {
    if (!ctx.instance) return
    stepper = new Stepper(document.querySelector('.bs-stepper'))
    if (stepIndex === 1) {
      stepIndex++
      stepper.to(stepIndex)
    }
  }, [ctx.instance])

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
          <button
            className="btn btn-light"
            onClick={() => {
              if (stepIndex > 1) {
                stepIndex--
              }
              stepper.previous()
            }}
          >
            Last
          </button>{' '}
          <button
            className="btn btn-light"
            onClick={() => {
              if (stepIndex < stepMaxIndex) {
                stepIndex++
              }
              stepper.next()
            }}
          >
            Next
          </button>
        </StepContent>
      )
    })
  }

  return (
    <CCard>
      <CCardBody>
        <CCardTitle>如何使用</CCardTitle>
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
