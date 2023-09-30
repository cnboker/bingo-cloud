import LocalizedStrings from 'react-localization'
import Cookies from 'js-cookie'
import { language } from '../config'
export const langLoader = (localeData) => {
  const R = new LocalizedStrings(localeData)
  var lang = Cookies.get('language') || R.getLanguage() || language
  R.setLanguage(lang)
  return R
}

export const getLang = () => {
  if (navigator.languages !== undefined) var lang = navigator.languages[0]
  return Cookies.get('language') || navigator.language
  //return 'zh-CN'
}
