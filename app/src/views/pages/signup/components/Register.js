import React from 'react'
import { CButton, CCard, CCardBody, CCol, CContainer, CForm, CFormInput, CInputGroup, CInputGroupText, CRow, CLink } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilUser } from '@coreui/icons'
import { useForm } from 'react-hook-form'
import ValidatorSpan from '~/views/ValidatorSpan'
import R from '../locale'

const Register = ({ onsubmit, error }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm()
  const _onsubmit = (data) => {
    if (onsubmit) {
      onsubmit(data)
    }
  }
  return (
    <div className="bg-light min-vh-100 d-flex flex-row align-items-center">
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
                    <CFormInput type="password" placeholder="Password" autoComplete="new-password" {...register('password', { required: true })} />
                    {errors.password && <ValidatorSpan message="required" />}
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
                    <CLink href="/login">{R.login}</CLink>
                  </div>
                  <ValidatorSpan message={error} />
                </CForm>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Register
