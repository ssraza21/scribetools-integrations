'use strict';

// Runs each Make custom IML function's test.js against its code.js, the way
// Make's editor does: the function is a global, `it` and `assert` are given.
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'make', 'functions');
let count = 0;
for (const name of fs.readdirSync(root)) {
  const code = fs.readFileSync(path.join(root, name, 'code.js'), 'utf8');
  const test = fs.readFileSync(path.join(root, name, 'test.js'), 'utf8');
  const it = (label, fn) => {
    fn();
    count += 1;
  };
  new Function('assert', 'it', `${code}\n${test}`)(assert, it);
}
console.log(`${count} Make function tests passed`);
