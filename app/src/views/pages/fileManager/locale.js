import { langLoader } from '~/lib/localize'

const data = {
  en: {
    pendingItems: 'Pending items',
    pendingList: 'Pending items',
    cancel: 'Cancel',
    pub: 'Publish',
    selectedItems: 'Selected items',
    parameterSetting: 'Parameters setting',
    deviceList: 'Device list',
    playEffect: 'Play effect',
    duration: 'play long each image(sec)',
  },
  zh: {
    pendingItems: '待发布项',
    pendingList: '待发布素材列表',
    cancel: '取消',
    pub: '发布',
    selectedItems: '选中项目',
    parameterSetting: '参数设置',
    deviceList: '设备列表',
    playEffect: '播放效果',
    duration: '单图片播放时长(秒)',
  },
}

export default langLoader(data)
