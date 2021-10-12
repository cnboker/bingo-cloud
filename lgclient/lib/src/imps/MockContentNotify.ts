import { IContentNotify, IContentEvent } from "../interfaces/IContentWorker";
import { SimpleEventDispatcher } from "ste-simple-events";
import { ContentPackage } from '../dataModels/ContentPackage';

export default class MockContentNotify implements IContentNotify {
    private dispatcher = new SimpleEventDispatcher<ContentPackage>();
    private snapshotDispatcher = new SimpleEventDispatcher<void>();

    contentReadyEvent(): IContentEvent<ContentPackage> {
        return this.dispatcher.asEvent()
    }

    snapshotEvent(): IContentEvent<void> {
        return this.snapshotDispatcher.asEvent()
    }


    watch(): void {
        var conentJson = require('../__test__/content.json');
        var contentPackage: ContentPackage = conentJson
        //console.log("MockContentNotify watch", contentPackage);
        this.dispatcher.dispatch(contentPackage)
    }

}