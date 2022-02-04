import { langLoader } from '~/lib/localize'

const data = {
  en: {
    quickStart: 'Quick start',
    dashboard: 'Dashboard',
  },
  zh: {
    quickStart: '快速入门',
    dashboard: '仪表盘',
  },
}

export default langLoader(data)
