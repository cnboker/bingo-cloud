import ContentNotify from '../imps/ContentNotify'
import { expect } from 'chai';
import 'mocha';
import EventDispatcher from '../EventDispatcher';
require('../config')

const client = new ContentNotify(new EventDispatcher());

describe('call notify watch', () => {
    it('api notify return is not null', () => {
        //client.watch();
    });
});