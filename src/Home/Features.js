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

            <div class="col-lg-8 offset-lg-4">
              <div class="section-header wow fadeIn" data-wow-duration="1s">
                <h3 class="section-title">服务内容</h3>
                <span class="section-divider"></span>
              </div>
            </div>

            <div class="col-lg-4 col-md-5 features-img">
              <img src="img/product-features.png" alt="" class="wow fadeInLeft"/>
            </div>

            <div class="col-lg-8 col-md-7 ">

              <div class="row">

                <div class="col-lg-6 col-md-6 box wow fadeInRight">
                  <div class="icon">
                    <i class="ion-ios-speedometer-outline"></i>
                  </div>
                  <h4 class="title">
                    <a href="">物联网应用开发</a>
                  </h4>
                  <p class="description">各种终端设备(包括射频设别，红外线感应器，温度，湿度，位置定位设备，充电桩，广告机）通过传输协议(http,rs232,tcp,udp,websocket,mqtt)需要实现智能化识别，定位，跟踪, 微信付费，监控和运营管理的应用需求.</p>
                </div>
                <div class="col-lg-6 col-md-6 box wow fadeInRight" data-wow-delay="0.1s">
                  <div class="icon">
                    <i class="ion-ios-flask-outline"></i>
                  </div>
                  <h4 class="title">
                    <a href="">云租赁平台</a>
                  </h4>
                  <p class="description">Minim veniam, quis nostrud exercitation ullamco laboris
                    nisi ut aliquip ex ea commodo consequat tarad limino ata noble dynala mark.</p>
                </div>
                <div class="col-lg-6 col-md-6 box wow fadeInRight" data-wow-delay="0.2s">
                  <div class="icon">
                    <i class="ion-social-buffer-outline"></i>
                  </div>
                  <h4 class="title">
                    <a href="">Sed ut perspiciatis</a>
                  </h4>
                  <p class="description">Duis aute irure dolor in reprehenderit in voluptate velit
                    esse cillum dolore eu fugiat nulla pariatur teleca starter sinode park ledo.</p>
                </div>
                <div class="col-lg-6 col-md-6 box wow fadeInRight" data-wow-delay="0.3s">
                  <div class="icon">
                    <i class="ion-ios-analytics-outline"></i>
                  </div>
                  <h4 class="title">
                    <a href="">Magni Dolores</a>
                  </h4>
                  <p class="description">Excepteur sint occaecat cupidatat non proident, sunt in
                    culpa qui officia deserunt mollit anim id est laborum dinoun trade capsule.</p>
                </div>
              </div>

            </div>

          </div>

        </div>

      </section>

    )
  }
}