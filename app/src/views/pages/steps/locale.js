import { langLoader } from '~/lib/localize'

const data = {
  en: {
    newUserMessage: 'For new users,free up to {0} devices can activated',
    rightNow: 'now',
    activate: 'activate',
    renewMessage: 'If you need to renew, ',
    renew: 'renew',
    try: 'Try',
    uploadFile: 'Upload material',
    design: 'Design content',
    publish: 'Publish content',
    howtoUse: 'How to Use',
    runClient: '1. Boot signage device',
    qrScan: '2. Waiting QR display on device,scan QR code with your mobile',
    waitDeviceInfo: '3. Waiting device info display on mobile',
    allowIn: '4. Click "Allow" button',
    returnPC: '5.Return PC, click',
    deviceManage: 'Device manage',
    addLicense: 'Add license for devices',
    click: 'Click',
    public: 'Publish',
    materialManage: 'Material Manage',
    materialDefine:
      'Vidoe file(mov, mp4, wmv, rmvb, mpg,m4v etc),image,custom page,static H5 page can defined as material',
    materialUploadInfo: 'In order to device can play, you must upload material to this first.',
    materialUploadTips: 'Any video files, image, H5 page can be uploaded.',
    pubInfo1: 'In material manage page, you can double-click material file.',
    pubInfo2:
      'Click "Publish" button, popup dialog, checked target device, click "publish" in this dialog.',
    customPage1:
      'In "page designer" page, you can customize page layout, make video, image, text together.',
    customPage2: "The file which's extention is IPP like video,image file can be defined meterial.",
  },
  zh: {
    newUserMessage: '新用户,免费5台设备激活',
    rightNow: '马上',
    activate: '激活设备',
    renewMessage: '如果需要续费，点击',
    renew: '续费',
    try: '试用/下单',
    uploadFile: '上传素材',
    design: '内容设计',
    publish: '内容发布',
    howtoUse: '如何使用',
    runClient: '1. 启动数字标牌终端',
    qrScan: '2. 等待数字标牌屏幕二维码页面出现,通过手机扫描二维码(手机首次使用需要先登录系统)',
    waitDeviceInfo: '3. 手机自动导航到授权页面，等待当前设备信息显示',
    allowIn: '4.点击"允许接入"按钮',
    returnPC: '5.回到PC端,点击',
    deviceManage: '设备管理',
    addLicense: '为设备添加许可',
    click: '点击',
    public: '发布',
    materialManage: '素材管理',
    materialDefine:
      '视频文件(mov, mp4, wmv, rmvb, mpg,m4v等),图片,自定义页面,静态H5程序都可以叫素材文件',
    materialUploadInfo: '为了使设备能够正常播放，首先需要将素材文件上传的当前系统',
    materialUploadTips: '可以将视频文件,图片,静态H5程序上传这里',
    pubInfo1: '双击待发布的视频文件,图片,自定义页面(ipp),或扩展名为.zip的H5程序',
    pubInfo2: '点击发布按钮弹出发布页面,选择待发布的设备,点击发布按钮,等待设备更新资料',
    customPage1:
      '在内容设计页面，可以自定义布局，并将图片，视频以及内置的自定义组件组合成一个页面，保存为扩展名为ipp的文件',
    customPage2: '扩展名为ipp的文件和其他图片或视频文件一样是可以作为发布素材.',
  },
}
export default langLoader(data)