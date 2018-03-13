import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import Header from  './Home/Header'
import Intro from './Home/Intro'
import Main from './Home/Main'
import Footer from './Home/Footer'
class App extends Component {
  render() {
    return (
      <div className="App">
        <Header />
        <Intro />
        <Main />
        <Footer/>       
      </div>
    );
  }
} 

export default App;
