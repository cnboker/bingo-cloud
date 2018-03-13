import React, { Component } from 'react'

class Intro extends Component{
    render() {
        return (
            <section id="intro">

                <div class="intro-text">
                    <h2>Welcome to Avilon</h2>
                    <p>We are team of talanted designers making websites with Bootstrap</p>
                    <a href="#about" class="btn-get-started scrollto">Get Started</a>
                </div>

                <div class="product-screens">

                    <div class="product-screen-1 wow fadeInUp" data-wow-delay="0.4s" data-wow-duration="0.6s">
                        <img src="img/product-screen-1.png" alt="" />
                    </div>

                    <div class="product-screen-2 wow fadeInUp" data-wow-delay="0.2s" data-wow-duration="0.6s">
                        <img src="img/product-screen-2.png" alt="" />
                    </div>

                    <div class="product-screen-3 wow fadeInUp" data-wow-duration="0.6s">
                        <img src="img/product-screen-3.png" alt="" />
                    </div>

                </div>

            </section>
        )

    }
}

export default Intro