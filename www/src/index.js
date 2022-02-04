import React from 'react';
//import ReactDOM from 'react-dom';
import { render } from 'react-snapshot';
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';

//ReactDOM.render(<App />, document.getElementById('root'));
render(<App />, document.getElementById('root'));
registerServiceWorker();
