const express = require('express');
const oldGet = express.Router.prototype.get;

express.Router.prototype.get = function(path, ...handlers) {
  for (let i = 0; i < handlers.length; i++) {
    if (typeof handlers[i] !== 'function') {
      console.error(`UNDEFINED GET HANDLER ON PATH: ${path} at index ${i}`);
      console.error('Handlers array:', handlers);
      process.exit(1);
    }
  }
  return oldGet.apply(this, [path, ...handlers]);
};

const oldPost = express.Router.prototype.post;
express.Router.prototype.post = function(path, ...handlers) {
  for (let i = 0; i < handlers.length; i++) {
    if (typeof handlers[i] !== 'function') {
      console.error(`UNDEFINED POST HANDLER ON PATH: ${path} at index ${i}`);
      console.error('Handlers array:', handlers);
      process.exit(1);
    }
  }
  return oldPost.apply(this, [path, ...handlers]);
};

const oldPatch = express.Router.prototype.patch;
express.Router.prototype.patch = function(path, ...handlers) {
  for (let i = 0; i < handlers.length; i++) {
    if (typeof handlers[i] !== 'function') {
      console.error(`UNDEFINED PATCH HANDLER ON PATH: ${path} at index ${i}`);
      console.error('Handlers array:', handlers);
      process.exit(1);
    }
  }
  return oldPatch.apply(this, [path, ...handlers]);
};

import('./src/server.ts').catch(console.error);
