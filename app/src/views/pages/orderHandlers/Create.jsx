import React, { useEffect, useState } from 'react'
import { CButton, CCard, CCardBody, CForm, CFormInput, CFormLabel, CAlert } from '@coreui/react'
import {
  PeriodRadioGroup,
  DefaultConfig,
} from 'src/views/components/forms/checks-radios/PeriodRadioGroup'
import { useDispatch, useSelector } from 'react-redux'
import { getOrderSession, createOrder, codeCheck } from './actions'
import { useForm } from 'react-hook-form'
import ValidatorSpan from 'src/views/ValidatorSpan'
import { useHistory } from 'react-router'
export default () => {
  const dispatch = useDispatch()
  const orderContextReducer = useSelector((state) => state.orderContextReducer)
  const { trialDeviceCount, price, discount } = orderContextReducer
  const [period, setPeriod] = useState(DefaultConfig[6])
  const [count, setCount] = useState(trialDeviceCount)
  const [code, setCode] = useState('')
  const [sum, setSum] = useState(0)
  const [discountSum, setDiscountSum] = useState(0)
  const history = useHistory()
  const [codeAvaliable, setCodeAvaliable] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()

  const onSubmit = (data) => {
    console.log('submit', data)
    dispatch(createOrder({ count, days: period.value, code }))
  }

  useEffect(() => {
    if (orderContextReducer.order.id > 0) {
      history.push('/order/checkout')
    }
  }, [orderContextReducer.order])

  useEffect(() => {
    dispatch(getOrderSession())
  }, [])

  const codeChange = (val) => {
    setCode(val)
    if (val.length === 6) {
      console.log('code=', val)
      codeCheck(val).then((x) => {
        x.data ? setCodeAvaliable('可用') : setCodeAvaliable('不可用')
      })
    }
  }

  useEffect(() => {
    var quanitty = +count || 0
    setSum(price * period.value * quanitty)
    setDiscountSum((price * period.value * quanitty * (100 - discount)) / 100)
  }, [period, count, price])

  return (
    <CCard>
      <CCardBody>
        {discount > 0 && <CAlert color="success">今天有{discount}%的折扣</CAlert>}
        <CForm onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-3">
            <CFormLabel>购买时长</CFormLabel>
            <br />
            <PeriodRadioGroup
              onChecked={(val) => setPeriod(val)}
              data={DefaultConfig}
              defaultSelect={DefaultConfig[6]}
            />
          </div>
          <div className="mb-3">
            <CFormLabel>设备数量</CFormLabel>
            <CFormInput
              type="text"
              defaultValue={trialDeviceCount}
              {...register('quantity', { required: true })}
              onChange={(e) => setCount(e.target.value)}
            />
            {errors.quantity && <ValidatorSpan messasge="不能为空" />}
          </div>
          <div className="mb-3">
            <CFormLabel>单价</CFormLabel>
            <CFormInput type="text" value={price} disabled />
          </div>
          <div className="mb-3">
            <CFormLabel>优惠码</CFormLabel>
            <CFormInput type="text" name="code" onChange={(e) => codeChange(e.target.value)} />
            <CFormLabel>{codeAvaliable}</CFormLabel>
          </div>
          <div className="mb-3">
            <CFormLabel>合计</CFormLabel>
            <CFormInput type="text" value={sum.toFixed(2)} disabled />
          </div>
          <div className="mb-3">
            <CFormLabel>实付金额</CFormLabel>
            <CFormInput type="text" value={discountSum.toFixed(2)} disabled />
          </div>
          <div className="mb-3">
            <CButton color="primary" type="submit">
              提交
            </CButton>
          </div>
        </CForm>
      </CCardBody>
    </CCard>
  )
}
