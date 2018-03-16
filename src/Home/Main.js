import React, { Component } from 'react';
import About from './About'
import Features from './Features'
import AdvancedFeatures from './AdvancedFeatures'
import Team from './Team'
import Pricing from './Pricing'
import Faq from './Faq'
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
            <Pricing/>
            <Team />   
            <Gallery/>
            <ContactUs/>
          </main>
        )
    }
}

export default Main