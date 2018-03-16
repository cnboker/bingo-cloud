import React, { Component } from 'react'

class Intro extends Component{
    render() {
        return (
            <section id="intro">

                <div class="intro-text">
                    <h2>欢迎了解I/O&middot;栗子</h2>
                    <p>高端定制软件服务，让我们的解决方案为您的服务领域设定方向</p>
                    <a href="#about" class="btn-get-started scrollto">开始吧</a>
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