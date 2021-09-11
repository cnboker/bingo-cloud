import { toLongDateTime, toDate } from 'src/lib/string'
export const NullStringFormater = ({ val }) => {
  if (!val) return '/'
  return val
}

export const DateFormater = ({ val }) => {
  // console.log("DateTimeFormater",val)
  return toDate(val)
}

export const DateTimeFormater = ({ val }) => {
  // console.log("DateTimeFormater",val)
  return toLongDateTime(val)
}

export const DecimalFormater = ({ val }) => {
  return (val || 0).toFixed(2)
}

export const BooleanFormater = ({ val }) => {
  if (+val === 0) {
    return 'N'
  } else if (+val === 1) {
    return 'Y'
  }
}
