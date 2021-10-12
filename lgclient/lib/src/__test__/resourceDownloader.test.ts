require('../config')

import { expect } from 'chai';
import 'mocha';

import jsonObj from './region.json';
import contentPackage from './content.json';
import { Region, JsonImage,ContentPackage } from '../dataModels/ContentPackage';
import { ResourceDownloader } from "../imps/ResourceDownloader";


// describe('regionJson Convert test', () => {
//     it('regionJson return JsonContent object', () => {
//         var obj: Region = jsonObj;
//         var imageObj: JsonImage = obj.content as JsonImage;
//         expect(imageObj.images.length).to.equal(2)
//         // console.log('imageObj', imageObj);
//     });
// });


// describe('onBegin test', () => {
//     it('request file to local dir', () => {
//         var data:ContentPackage = contentPackage;
//         var downloader = new ResourceDownloader(data);
//         downloader.download();
//     });
// });
