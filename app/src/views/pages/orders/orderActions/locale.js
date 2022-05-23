import { langLoader } from '~/lib/localize'

const data = {
  en: {
    trial_tips: 'Trail detail',
    trial_days: 'Trail days',
    trial_max_device: 'Device quota',
    trial_day_unit: 'Days',
  },
  zh: {
    trial_tips: '试用说明',
    trial_days: '试用天数',
    trial_max_device: '最大试用设备',
    trial_day_unit: '天',
  },
}
export default langLoader(data)
