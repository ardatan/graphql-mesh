import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

const rootElement = document.createElement('div');
rootElement.id = 'root';
document.body.appendChild(rootElement);
ReactDOM.render(<App defaultQuery={(window as any).defaultQuery} endpoint={(window as any).endpoint} />, rootElement);
