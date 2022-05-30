import React from 'react'
import { Link } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCardGroup,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilUser } from '@coreui/icons'
import { useForm } from 'react-hook-form'
import ValidatorSpan from 'src/views/ValidatorSpan'
import R from '../locale'
const Login = ({ submit, error }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()
  const onSumit = (data) => {
    if (submit) {
      submit(data)
    }
  }

  return (
    <div className="bg-light min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={8}>
            <CCardGroup>
              <CCard className="p-4">
                <CCardBody>
                  <CForm onSubmit={handleSubmit(onSumit)}>
                    <h1>{R.login}</h1>
                    <p className="text-medium-emphasis">{R.loginTitle}</p>
                    <CInputGroup className="mb-3">
                      <CInputGroupText>
                        <CIcon icon={cilUser} />
                      </CInputGroupText>
                      <CFormInput
                        placeholder="Username"
                        autoComplete="username"
                        {...register('userName', { required: true })}
                      />{' '}
                      {errors.userName && <ValidatorSpan message="required" />}
                    </CInputGroup>
                    <CInputGroup className="mb-4">
                      <CInputGroupText>
                        <CIcon icon={cilLockLocked} />
                      </CInputGroupText>
                      <CFormInput
                        type="password"
                        placeholder="Password"
                        autoComplete="current-password"
                        {...register('password', { required: true })}
                      />
                      {errors.password && <ValidatorSpan message="required" />}
                    </CInputGroup>
                    <CRow>
                      <CCol xs={6}>
                        <CButton color="primary" className="px-4" type="submit">
                          Login
                        </CButton>
                      </CCol>
                      <CCol xs={6} className="text-right">
                        <Link color="link" className="px-0" to={'/forgetPassword'}>
                          {R.forgetPassword}?
                        </Link>
                      </CCol>
                    </CRow>
                    <CRow>
                      <ValidatorSpan message={R[error]} />
                    </CRow>
                  </CForm>
                </CCardBody>
              </CCard>
              <CCard className="text-white bg-primary py-5">
                <CCardBody className="text-center">
                  <div>
                    <h2>{R.signup}</h2>
                    <p>{R.signupDesc}</p>
                    <Link to="/register">
                      <CButton color="primary" className="mt-3" active tabIndex={-1}>
                        {R.signup}
                      </CButton>
                    </Link>
                  </div>
                </CCardBody>
              </CCard>
            </CCardGroup>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Login
