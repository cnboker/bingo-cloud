import React, {Component} from 'react'

{/* <!--==========================
              Product Featuress Section
            ============================--> */
}
export default class Features extends Component {
  render() {
    return (

      <section id="features">
        <div class="container">

          <div class="row">

            <div class="col-lg-8 offset-lg-2">
              <div class="section-header wow fadeIn" data-wow-duration="1s">
                <h3 class="section-title">服务内容</h3>
                <span class="section-divider"></span>
              </div>
            </div>

            {/* <div class="col-lg-4 col-md-5 features-img">
              <img src="img/product-features.png" alt="" class="wow fadeInLeft"/>
            </div> */}

            <div >

              <div class="row">

                <div class="col-lg-6 col-md-6 box wow fadeInRight">
                  <div class="icon">
                    <i class="ion-ios-speedometer-outline"></i>
                  </div>
                  <h4 class="title">
                    <a href="">物联网应用开发</a>
                  </h4>
                  <p class="description">各种终端设备(包括射频设别,红外线感应器,温度,湿度,位置定位设备,充电桩,广告机)通过传输协议(http,rs232,tcp,udp,websocket,mqtt)需要实现智能化识别,定位,跟踪,微信付费,监控和运营管理的应用需求.</p>
                </div>
                <div class="col-lg-6 col-md-6 box wow fadeInRight" data-wow-delay="0.1s">
                  <div class="icon">
                    <i class="ion-ios-flask-outline"></i>
                  </div>
                  <h4 class="title">
                    <a href="">云租赁平台</a>
                  </h4>
                  <p class="description">对比传统的软件购买模式，云租赁平台具备较多的优势,比如付费即用,客户不需要单独购买服务器,
系统统一维护升级极大的减少系统单独运营成本等.经过1年多的尝试,我们公司开发出一款数字标牌云租赁平台,我们也希望把在该项目上积累的经验应用到更多其他应用领域.</p>
                </div>
                <div class="col-lg-6 col-md-6 box wow fadeInRight" data-wow-delay="0.2s">
                  <div class="icon">
                    <i class="ion-social-buffer-outline"></i>
                  </div>
                  <h4 class="title">
                    <a href="">企业应用开发</a>
                  </h4>
                  <p class="description">在企业应用开发方面我们帮客户开发了众筹,P2P,基金管理,外贸进销存,充电桩运营系统,数字标牌管理系统等多款软件,并保持几年来持续运营并为客户服务.</p>
                </div>
                <div class="col-lg-6 col-md-6 box wow fadeInRight" data-wow-delay="0.3s">
                  <div class="icon">
                    <i class="ion-ios-analytics-outline"></i>
                  </div>
                  <h4 class="title">
                    <a href="">技术咨询</a>
                  </h4>
                  <p class="description">不管您是否采用我们的服务,我们公司都愿意和您有更多的交流机会并在能力范围内免费为您提供系统架构,技术选型,团队组建等方面的咨询服务.</p>
                </div>
              </div>

            </div>

          </div>

        </div>

      </section>

    )
  }
}