import { expect } from "chai";
import "mocha";
import {IContentWorker} from '../interfaces/IContentWorker'
import {serviceRegister,getService} from '../imps/ServiceProiver'

describe("service provider test", ()=>{
  beforeEach(function() {
    serviceRegister();
  });
  it('get service not null',()=>{
    var contentWorker = <IContentWorker>getService("IContentWorker");
    //console.log('contentWorker',contentWorker)
    expect(contentWorker).is.not.null;
  })
})

