require("./string");
import * as DataModel from "./dataModels/ContentPackage";
import ContentWorker from "./imps/ContentWorker";
import * as util from "./imps/util";
import * as config from "./config";
import ClientAPI from "./imps/ClientAPI";
import * as downloadManager from './imps/downlaodManager';

export { ContentWorker, DataModel, util, config, ClientAPI, downloadManager };





    // var resource = {status:0};
    // Promise.resolve(true)
    //   .then((x) => {
    //     //console.log('exists', x)
    //     if (x) {
    //       console.log(`file exists return`);
    //       return '';
    //     } else {
    //       return Promise.resolve('ok')          
    //     }
    //   })
    //   .then(() => {
    //     resource.status = 1;
    //     console.log("resource.status = 1");
    //     return resource;
    //   })
    //   .catch((e) => {
    //     console.log("singleFileDownload error", e);
    //     resource.status = 2;
    //     return resource;
    //   })
    //   .then((r:any) => {        
    //     console.log('finally execute',r)
    //   });

