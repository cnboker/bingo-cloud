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
    videoEncodeTip:
      '  {0} encoding({1}%), video encoding make playback better,be patient to finish.',
    videoEncodeDone: '  {0} encode success.',
    videoEncodeError: ' {0} try again.',
  },
  zh: {
    pendingItems: '待发布项',
    pendingList: '待发布内容列表',
    cancel: '取消',
    pub: '发布',
    selectedItems: '选中项目',
    parameterSetting: '参数设置',
    deviceList: '设备列表',
    playEffect: '播放效果',
    duration: '单图片播放时长(秒)',
    videoEncodeTip: '  文件{0}正在编码({1}%),视频编码可以使播放体验更好,请耐心等待编码完成.',
    videoEncodeDone: '  文件{0}视频编码完成.',
    videoEncodeError: ' 文件{0}视频编码错误.',
  },
}

export default langLoader(data)
