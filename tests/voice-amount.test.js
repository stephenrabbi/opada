import test from 'node:test';
import assert from 'node:assert/strict';
import {parseNairaAmounts,wordsToNaira} from '../src/voice-amount.js';
test('parses a spoken amount',()=>assert.deepEqual(parseNairaAmounts('We sold food worth eight thousand five hundred naira today'),[8500]));
test('parses numeric amount before naira',()=>assert.deepEqual(parseNairaAmounts('Spent 8500 naira'),[8500]));
test('parses naira prefix',()=>assert.deepEqual(parseNairaAmounts('Sold ₦8500'),[8500]));
test('rejects vague amount',()=>assert.deepEqual(parseNairaAmounts('Sold some food'),[]));
test('rejects invalid spoken number',()=>assert.equal(wordsToNaira('eight bananas'),null));
test('preserves multiple values for manual review',()=>assert.deepEqual(parseNairaAmounts('Sold 8000 naira and spent 2000 naira'),[8000,2000]));
