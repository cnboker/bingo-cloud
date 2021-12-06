import { IContentWorker } from "./interfaces/IContentWorker";
import * as configer from "./configer";
import * as downloadManager from './webosApis/downloadManager';
import * as systemservice from './webosApis/systemservice'
import * as storageAccess from './webosApis/systemservice'
import * as webosFileService from './imps/WebOSFileService'
import * as usbservice from './webosApis/usbservice'
import * as applicationmanager from './webosApis/applicationmanager'
import * as bootservice from './imps/bootservice'
import { serviceRegister, getService } from './imps/ServiceProiver'

const webosApis = {
    downloadManager,
    systemservice,
    storageAccess,
    webosFileService,
    usbservice,
    applicationmanager,
    bootservice
}

export {
    IContentWorker,
    configer,
    webosApis,
    serviceRegister,
    getService
}
