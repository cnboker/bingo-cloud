import React, { Component } from 'react'

class Intro extends Component{
    render() {
        return (
            <section id="intro">

                <div class="intro-text">
                    <h2>高端软件定制</h2>
                    <p>量身定做切合您业务的系统,让技术规范您的业务!</p>
                    <a href="#about" class="btn-get-started scrollto">开始吧</a>
                </div>

                {/* <div class="product-screens">

                    <div class="product-screen-1 wow fadeInUp" data-wow-delay="0.4s" data-wow-duration="0.6s">
                        <img src="img/product-screen-1.png" alt="" />
                    </div>

                    <div class="product-screen-2 wow fadeInUp" data-wow-delay="0.2s" data-wow-duration="0.6s">
                        <img src="img/product-screen-2.png" alt="" />
                    </div>

                    <div class="product-screen-3 wow fadeInUp" data-wow-duration="0.6s">
                        <img src="img/product-screen-3.png" alt="" />
                    </div>

                </div> */}

            </section>
        )

    }
}

export default Intro