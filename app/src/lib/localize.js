import LocalizedStrings from 'react-localization'
import Cookies from 'js-cookie'
import { language } from '../config'
export const langLoader = (localeData) => {
  const R = new LocalizedStrings(localeData)
  var lang = language || Cookies.get('language') || R.getLanguage()
  R.setLanguage(lang)
  return R
}

export const getLang = () => {
  var lang
  if (navigator.languages !== undefined) lang = navigator.languages[0]
  lang = navigator.language
  return Cookies.get('language') || navigator.language
  //return 'zh-CN'
}
