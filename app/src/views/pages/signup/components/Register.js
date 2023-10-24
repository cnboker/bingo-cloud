import React, { useState } from 'react'
import { CButton, CCard, CCardBody, CCol, CContainer, CForm, CFormInput, CInputGroup, CInputGroupText, CRow, CLink } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilUser } from '@coreui/icons'
import { useForm } from 'react-hook-form'
import ValidatorSpan from '~/views/ValidatorSpan'
import R from '../locale'

const Register = ({ onsubmit, error }) => {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm()

  const getActiveColor = (type) => {
    if (type === "Strong") return "#8BC926";
    if (type === "Medium") return "#FEBD01";
    return "#FF0054";
  };
  const handlePassword = (passwordValue) => {
    const strengthChecks = {
      length: 0,
      hasUpperCase: false,
      hasLowerCase: false,
      hasDigit: false,
      hasSpecialChar: false,
    };

    strengthChecks.length = passwordValue.length >= 8 ? true : false;
    strengthChecks.hasUpperCase = /[A-Z]+/.test(passwordValue);
    strengthChecks.hasLowerCase = /[a-z]+/.test(passwordValue);
    strengthChecks.hasDigit = /[0-9]+/.test(passwordValue);
    strengthChecks.hasSpecialChar = /[^A-Za-z0-9]+/.test(passwordValue);
    let verifiedList = Object.values(strengthChecks).filter((value) => value);

    let strength =
      verifiedList.length == 5
        ? "Strong"
        : verifiedList.length >= 2
          ? "Medium"
          : "Weak";

    setPassword(passwordValue);
    setProgress(`${(verifiedList.length / 5) * 100}%`);
    setMessage(strength);

    console.log("verifiedList: ", `${(verifiedList.length / 5) * 100}%`);

  }
  const _onsubmit = (data) => {

    if (onsubmit) {
      onsubmit(data)
    }
  }

  return (
    <div className="bg-light d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={9} lg={7} xl={6}>
            <CCard className="mx-4">
              <CCardBody className="p-4">
                <CForm onSubmit={handleSubmit(_onsubmit)}>
                  <h1>{R.register}</h1>
                  <p className="text-medium-emphasis">{R.registerTitle}</p>
                  <CInputGroup className="mb-3">
                    <CInputGroupText>
                      <CIcon icon={cilUser} />
                    </CInputGroupText>
                    <CFormInput placeholder="Username" autoComplete="username" {...register('userName', { required: true })} />
                    {errors.userName && <ValidatorSpan message="required" />}
                  </CInputGroup>
                  <CInputGroup className="mb-3">
                    <CInputGroupText>@</CInputGroupText>
                    <CFormInput placeholder="Email" autoComplete="email" {...register('email', { required: true })} />
                    {errors.email && <ValidatorSpan message="required" />}
                  </CInputGroup>
                  <CInputGroup className="mb-3">
                    <CInputGroupText>
                      <CIcon icon={cilLockLocked} />
                    </CInputGroupText>
                    <CFormInput type="password" placeholder="Password" autoComplete="new-password" {...register('password', {
                      required: true, minLength: {
                        value: 6,
                        message: "Password must have at least 8 characters"
                      }
                    })} />
                    {errors.password && <ValidatorSpan message="required" />}
                    <div className="progress-bg">
                      <div
                        className="progress"
                        style={{
                          width: progress,
                          backgroundColor: getActiveColor(message),
                        }}
                      ></div>
                    </div>
                    {password.length !== 0 ? (
                      <p className="message" style={{ color: getActiveColor(message) }}>
                        Your password is {message}
                      </p>
                    ) : null}
                  </CInputGroup>
                  <CInputGroup className="mb-4">
                    <CInputGroupText>
                      <CIcon icon={cilLockLocked} />
                    </CInputGroupText>
                    <CFormInput
                      type="password"
                      placeholder="Repeat password"
                      autoComplete="new-password"
                      {...register('passwordConfirmation', {
                        required: true,
                        validate: {
                          matchesPreviousPassword: (value) => {
                            const { password } = getValues()
                            return password === value || R.password_mismatch
                          },
                        },
                      })}
                    />
                    {errors.passwordConfirmation && <ValidatorSpan message={errors.passwordConfirmation.message} />}
                  </CInputGroup>
                  <div className="d-grid">
                    <CButton color="primary" type="submit">
                      {R.create_account}
                    </CButton>
                    <CLink href="#/login">{R.login}</CLink>
                  </div>
                  <ValidatorSpan message={error} />

                </CForm>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
    </div >
  )
}

export default Register
