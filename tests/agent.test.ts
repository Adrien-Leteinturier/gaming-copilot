import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executeTool } from '../server/tools';
import { emptyConfig } from '../src/domain';
test('No provider means no invented prices',async()=>{const result=await executeTool('searchComponentPrices',{query:'GPU'},emptyConfig) as {quotes:unknown[];status:string};assert.deepEqual(result.quotes,[]);assert.equal(result.status,'provider-unavailable');});
test('Reject untraceable merchant quotes',async()=>{await assert.rejects(executeTool('searchComponentPrices',{query:'GPU'},emptyConfig,{async search(){return [{component:'GPU',amount:10,currency:'EUR',merchant:'',url:'http://example.com',observedAt:'yesterday'}];}}));});
test('Compatibility is never asserted without evidence',async()=>{const result=await executeTool('checkCompatibility',{},emptyConfig) as {status:string};assert.equal(result.status,'unverified');});
test('Alert tools prepare confirmation instead of pretending surveillance',async()=>{const result=await executeTool('createPriceAlert',{query:'GPU',target:300},emptyConfig) as {status:string};assert.equal(result.status,'confirmation-required');await assert.rejects(executeTool('createPriceAlert',{query:'GPU',target:-1},emptyConfig));});
test('Unknown tool names are rejected',async()=>{await assert.rejects(executeTool('shell',{},emptyConfig));});
