import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
let fakeStorageObj = {};
const fakeStorageInstance = {
  getItem(key) {
    return fakeStorageObj[key];
  },
  setItem(key, val) {
    fakeStorageObj[key] = val;
  },
  clear() {
    fakeStorageObj = {};
  },
  key(i) {
    return Object.keys(fakeStorageObj)[i];
  },
  removeItem(key) {
    delete fakeStorageObj[key];
  },
  get length() {
    return Object.keys(fakeStorageObj).length;
  },
};

Object.defineProperty(window, 'localStorage', {
  value: fakeStorageInstance,
});
ReactDOM.render(<App defaultQuery={(window as any).defaultQuery} endpoint={(window as any).endpoint} />, document.body);
