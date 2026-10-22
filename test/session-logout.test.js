import test from 'node:test';
import assert from 'node:assert/strict';
import {originIsAllowed} from '../src/session-origin.js';
test('logout requires an HTTPS same-origin request',()=>{
 const request=(url,origin)=>({url,headers:{get:()=>origin}});
 assert.equal(originIsAllowed(request('https://opada.example/logout','https://opada.example')),true);
 assert.equal(originIsAllowed(request('https://opada.example/logout','https://different.example')),false);
 assert.equal(originIsAllowed(request('https://opada.example/logout',null)),false);
 assert.equal(originIsAllowed(request('http://opada.example/logout','http://opada.example')),false);
});
