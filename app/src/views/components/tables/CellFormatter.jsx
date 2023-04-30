import { toLongDateTime, toDate } from 'src/lib/string'
import { getLang } from '~/lib/localize'
export const NullStringFormater = ({ val }) => {
  if (!val) return '-'
  return val
}

export const PriceFormater = ({ val }) => {
  return val.toFixed(2)
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
  const lang = getLang()
  if (+val === 0) {
    return lang === 'zh-cn' ? '否' : 'N'
  } else if (+val === 1) {
    return lang === 'zh-cn' ? '是' : 'Y'
  }
}
