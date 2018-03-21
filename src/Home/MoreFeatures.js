import React, {Component} from 'react'
{/* <!--==========================
              More Features Section
            ============================--> */
}
export default class MoreFeatures extends Component {
  render() {
    return (

      <section id="more-features" class="section-bg">
        <div class="container">

          <div class="section-header">
            <h3 class="section-title">服务流程</h3>
            <span class="section-divider"></span>
            <p class="section-description">严谨的开发流程是产品质量的必要保证</p>
          </div>

          <div class="row">

            <div class="col-lg-6">
              <div class="box wow fadeInLeft">
                <div class="icon">
                  <i class="ion-ios-stopwatch-outline"></i>
                </div>
                <h4 class="title">
                  <a href="">需求沟通</a>
                </h4>
                <p class="description">双方沟通确定项目需求,确定主要的业务功能,业务角色和业务流程.</p>
              </div>
            </div>

            <div class="col-lg-6">
              <div class="box wow fadeInRight">
                <div class="icon">
                  <i class="ion-ios-bookmarks-outline"></i>
                </div>
                <h4 class="title">
                  <a href="">工作量评估</a>
                </h4>
                <p class="description">以需求为依据,排出项目开发计划和开发人员名单,根据资源消耗评估出项目报价,双方在项目报价和开发周期上达成一致后签订合同项目启动.</p>
              </div>
            </div>

            <div class="col-lg-6">
              <div class="box wow fadeInLeft">
                <div class="icon">
                  <i class="ion-ios-analytics-outline"></i>
                </div>
                <h4 class="title">
                  <a href="">开发设计</a>
                </h4>
                <p class="description">项目开发设计需经历几个阶段,界面原型设计,界面原型确定,接口设计,数据库设计,编码,测试等工作,项目的大小不同开发过程也会表现不同.</p>
              </div>
            </div>

            <div class="col-lg-6">
              <div class="box wow fadeInRight">
                <div class="icon">
                  <i class="ion-ios-heart-outline"></i>
                </div>
                <h4 class="title">
                  <a href="">交付</a>
                </h4>
                <p class="description">完成所有的设计和开发后，交付客户做验收,验收包括培训,系统业务功能验收,文档，代码等,系统上线后我们提供1年的免费维护,1年后根据客户需求可以签订维保合同以持续维护.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

    )
  }
}