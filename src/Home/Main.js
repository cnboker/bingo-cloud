import React, { Component } from 'react';
import About from './About'
import Features from './Features'
import AdvancedFeatures from './AdvancedFeatures'
import Gallery from './Gallery'
import ContactUs from './ContactUs'
import CalltoAction from './CalltoAction'
import MoreFeatures from './MoreFeatures'

class Main extends Component{

    render(){
        return(
            <main id="main">
            <About />
            <Features />
            <AdvancedFeatures/>
            <CalltoAction/>
            <MoreFeatures />     
            <Gallery/>
            <ContactUs/>
          </main>
        )
    }
}

export default Main