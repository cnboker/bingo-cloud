import React, {Component} from 'react'

export default class About extends Component {
  render() {
    return (

      <section id="about" class="section-bg">
        <div class="container-fluid">
          <div class="section-header">
            <h3 class="section-title">关于我们</h3>
            <span class="section-divider"></span>
            <p class="section-description">
              深圳市易晟信息技术有限公司是一家软件定制服务提供商，通过我们在软件行业十多年的设计能力的积累帮助客户实现目标赢得成功！
            </p>
          </div>

          <div class="row">
            <div class="col-lg-6 about-img wow fadeInLeft">
              <img src="img/about-img.jpg" alt=""/>
            </div>

            <div class="col-lg-6 content wow fadeInRight">
              <h2>服务理念</h2>
              <h3>“我需要A，请给我A, 不要给我B！“</h3>

              <ul>
                <li>
                  <i class="ion-android-checkmark-circle"></i>
                  良好的沟通是成功的一半，忠实于客户需求，没有什么比这个更重要.</li>

                <li>
                  <i class="ion-android-checkmark-circle"></i>
                  清晰流畅一致的用户体验，让每一个设计元素出现在它该出现的地方.
                </li>

                <li>
                  <i class="ion-android-checkmark-circle"></i>
                  高逼格的设计能力及品味，简洁有序的代码，拒绝外光里脏的代码，<br/>让软件保持更长的生命持续为客户创造价值.
                </li>
                <li>
                  <i class="ion-android-checkmark-circle"></i>
                  我们的服务帮助客户实现业务增长，让客户觉得我们值得信赖，足够.
                </li>
              </ul>

              <p>
                多年的实践经验让我们领悟到，系统通过验收正式上线后并不表示我们合作的结束，而是合作的真正开始. <br/>系统上线后正式的业务
                开始在系统上运作，客户的疑惑，系统发现新的bug需要我们在场；业务的不断增长对系统提出了更多的业务需求及新的标准，也需要我们在场.
                <br/>系统业务数据的增长，客户越来越体会到系统的价值所在，其实这个时候也是我们好日子的时候，对于“长期与客户保持良好关系”我们深悟此道。
              </p>
            </div>
          </div>

        </div>
      </section>

    )
  }
}