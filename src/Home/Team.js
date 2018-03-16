import React, {Component} from 'react'
{/* <!--==========================
              Our Team Section
            ============================--> */
}
export default class Team extends Component {
  render() {
    return (

      <section id="team" class="section-bg">
        <div class="container">
          <div class="section-header">
            <h3 class="section-title">Our Team</h3>
            <span class="section-divider"></span>
            <p class="section-description">Sed ut perspiciatis unde omnis iste natus error
              sit voluptatem accusantium doloremque</p>
          </div>
          <div class="row wow fadeInUp">
            <div class="col-lg-3 col-md-6">
              <div class="member">
                <div class="pic"><img src="img/team/team-1.jpg" alt=""/></div>
                <h4>Walter White</h4>
                <span>Chief Executive Officer</span>
                <div class="social">
                  <a href="">
                    <i class="fa fa-twitter"></i>
                  </a>
                  <a href="">
                    <i class="fa fa-facebook"></i>
                  </a>
                  <a href="">
                    <i class="fa fa-google-plus"></i>
                  </a>
                  <a href="">
                    <i class="fa fa-linkedin"></i>
                  </a>
                </div>
              </div>
            </div>

            <div class="col-lg-3 col-md-6">
              <div class="member">
                <div class="pic"><img src="img/team/team-2.jpg" alt=""/></div>
                <h4>Sarah Jhinson</h4>
                <span>Product Manager</span>
                <div class="social">
                  <a href="">
                    <i class="fa fa-twitter"></i>
                  </a>
                  <a href="">
                    <i class="fa fa-facebook"></i>
                  </a>
                  <a href="">
                    <i class="fa fa-google-plus"></i>
                  </a>
                  <a href="">
                    <i class="fa fa-linkedin"></i>
                  </a>
                </div>
              </div>
            </div>

            <div class="col-lg-3 col-md-6">
              <div class="member">
                <div class="pic"><img src="img/team/team-3.jpg" alt=""/></div>
                <h4>William Anderson</h4>
                <span>CTO</span>
                <div class="social">
                  <a href="">
                    <i class="fa fa-twitter"></i>
                  </a>
                  <a href="">
                    <i class="fa fa-facebook"></i>
                  </a>
                  <a href="">
                    <i class="fa fa-google-plus"></i>
                  </a>
                  <a href="">
                    <i class="fa fa-linkedin"></i>
                  </a>
                </div>
              </div>
            </div>

            <div class="col-lg-3 col-md-6">
              <div class="member">
                <div class="pic"><img src="img/team/team-4.jpg" alt=""/></div>
                <h4>Amanda Jepson</h4>
                <span>Accountant</span>
                <div class="social">
                  <a href="">
                    <i class="fa fa-twitter"></i>
                  </a>
                  <a href="">
                    <i class="fa fa-facebook"></i>
                  </a>
                  <a href="">
                    <i class="fa fa-google-plus"></i>
                  </a>
                  <a href="">
                    <i class="fa fa-linkedin"></i>
                  </a>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>
    )
  }
}