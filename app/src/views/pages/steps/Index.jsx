import React, { useEffect } from 'react'
import Stepper from 'bs-stepper'
import { CCard, CCardBody, CCardTitle } from '@coreui/react'
import 'bs-stepper/dist/css/bs-stepper.min.css'
export default () => {
  var stepper
  useEffect(() => {
    stepper = new Stepper(document.querySelector('.bs-stepper'))

    /// Will navigate to the second step
    stepper.to(1)
  }, [])

  return (
    <CCard>
      <CCardBody>
        <CCardTitle>如何使用</CCardTitle>
        <div className="bs-stepper">
          <div className="bs-stepper-header" role="tablist">
            <Step index={1} title="创建实例" />
            <StepLine />
            <Step index={2} title="试用/下单" />
            <StepLine />
            <Step index={3} title="激活设备" />
            <StepLine />
            <Step index={4} title="上传素材" />
            <StepLine />
            <Step index={5} title="内容设计" />
            <StepLine />
            <Step index={6} title="发布内容" />
          </div>
          <div className="bs-stepper-content">
            <StepContent index={1}>
              <button className="btn btn-primary" onClick={() => stepper.next()}>
                Next
              </button>
            </StepContent>
            <StepContent index={2}>
              <button className="btn btn-primary" onClick={() => stepper.next()}>
                Next
              </button>
            </StepContent>
            <StepContent index={3}>
              <button className="btn btn-primary" onClick={() => stepper.next()}>
                Next
              </button>
            </StepContent>
            <StepContent index={4}>
              <button className="btn btn-primary" onClick={() => stepper.next()}>
                Next
              </button>
            </StepContent>
            <StepContent index={5}>
              <button className="btn btn-primary" onClick={() => stepper.next()}>
                Next
              </button>
            </StepContent>
            <StepContent index={6}>
              <button className="btn btn-primary" onClick={() => stepper.next()}>
                Next
              </button>
            </StepContent>
          </div>
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
