import { CopyResult, CallResult } from '../dataModels/lunaModel'

export const localcopy = (
  srcPath: string,
  destPath: string,
  subscribe: (result: CopyResult) => void
): Promise<any> => {
  return copy(
    'internal',
    'INTERNAL_STORAGE',
    srcPath,
    'internal',
    'INTERNAL_STORAGE',
    destPath,
    subscribe
  )
}

export const copy = (
  srcStorageType: string,
  srcDriveId: string,
  srcPath: string,
  destStorageType: string,
  destDriveId: string,
  destPath: string,
  subscribe: (result: CopyResult) => void
): Promise<any> => {
  return new Promise((resolve, reject) => {
    //@ts-ignore
    webosBridge.onservicecallback = (msg: string) => {
      var response = JSON.parse(msg);
      const {
        returnValue,
        errorCode,
        errorText,
        progress
      } = response
      console.log("copy", response);
      if (returnValue) {
        resolve('success');
      }
      else if (returnValue === false) {
        reject({ errorCode, errorText });
      }
      //通知推送
      if (typeof subscribe === 'function') {
        subscribe(progress)
      }

    }
    var url = "luna://com.webos.service.storageaccess/device/copy";
    var params = JSON.stringify({
      srcStorageType,
      srcDriveId,
      srcPath,
      destStorageType,
      destDriveId,
      destPath,
      subscribe: (typeof subscribe === 'function'),
      overwrite: true
    })
    //@ts-ignore
    webosBridge.call(url, params);
  })
}

/*
Eject the storage device . in case of 'cloud'stroage type, It acts as a logout operation
note: the operation is not applicable for 'internal' storage type
*/
export const reject = () => {

}


export const remove = (
  storageType: string,
  driveId: string,
  path: string
): Promise<CallResult> => {
  return new Promise((resolve, reject) => {
    //@ts-ignore'
    webosBridge.onservicecallback = (msg: string) => {
      var response = JSON.parse(msg);
      const result = <CallResult>response
      console.log("remove", response);
      if (result.returnValue) {
        resolve(result);
      }
      else if (result.returnValue === false) {
        reject(result);
      }
    }
    var url = "luna://com.webos.service.storageaccess/device/remove";
    var params = JSON.stringify({
      storageType,
      driveId,
      path
    })
    //@ts-ignore
    webosBridge.call(url, params)
  })
}

