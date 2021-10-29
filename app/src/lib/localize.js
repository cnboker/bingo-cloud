import LocalizedStrings from 'react-localization'
import Cookies from 'js-cookie'

export const langLoader = (localeData) => {
  const R = new LocalizedStrings(localeData)
  var language = Cookies.get('language') || R.getLanguage()
  R.setLanguage(language)
  return R
}

export const getLang = () => {
  var lang
  if (navigator.languages !== undefined) lang = navigator.languages[0]
  lang = navigator.language
  return Cookies.get('language') || lang
}
