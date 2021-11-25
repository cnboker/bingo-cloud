import { IContentNotify, IContentEvent } from "../interfaces/IContentWorker";
import { CONTENT_READY_EVENT,DOWNLAOD_COMPLETE_EVENT,SNAPSHOT_EVENT } from '../constants'
import { ContentPackage } from '../dataModels/ContentPackage';
import EventDispatcher from "../EventDispatcher";

export default class MockContentNotify implements IContentNotify {
    dispatcher: EventDispatcher;
  
    watch(): void {
        var conentJson = require('../__test__/content.json');
        var contentPackage: ContentPackage = conentJson
        //console.log("MockContentNotify watch", contentPackage);
        this.dispatcher.dispatch(CONTENT_READY_EVENT,contentPackage)
    }

}