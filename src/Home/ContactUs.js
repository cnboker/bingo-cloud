import React, {Component} from 'react'

export default class ContactUs extends Component {
  render() {
    return (

      <section id="contact">
        <div class="container">
          <div class="row wow fadeInUp">

            <div class="col-lg-4 col-md-4">
              <div class="contact-about">
                <h3>IOLIZ</h3>
                <p>值得信赖的长期合作伙伴.</p>
              {/*   <div class="social-links">
                  <a href="#" class="twitter">
                    <i class="fa fa-twitter"></i>
                  </a>
                  <a href="#" class="facebook">
                    <i class="fa fa-facebook"></i>
                  </a>
                  <a href="#" class="instagram">
                    <i class="fa fa-instagram"></i>
                  </a>
                  <a href="#" class="google-plus">
                    <i class="fa fa-google-plus"></i>
                  </a>
                  <a href="#" class="linkedin">
                    <i class="fa fa-linkedin"></i>
                  </a>
                </div> */}
              </div>
            </div>

            <div class="col-lg-3 col-md-4">
              <div class="info">
                <div>
                  <i class="ion-ios-location-outline"></i>
                  <p>龙岗荣超英隆大厦A座2014</p>
                </div>

                <div>
                  <i class="ion-ios-email-outline"></i>
                  <p>6348816@qq.com</p>
                </div>

                <div>
                  <i class="ion-ios-telephone-outline"></i>
                  <p>+13410053353</p>
                </div>

              </div>
            </div>

            <div class="col-lg-5 col-md-8">
              <div class="form">
                <div id="sendmessage">您的信息!</div>
                <div id="errormessage"></div>
                <form action="" method="post" role="form" class="contactForm">
                  <div class="form-row">
                    <div class="form-group col-lg-6">
                      <input
                        type="text"
                        name="name"
                        class="form-control"
                        id="name"
                        placeholder="您的姓名"
                        data-rule="minlen:4"
                        data-msg="Please enter at least 4 chars"/>
                      <div class="validation"></div>
                    </div>
                    <div class="form-group col-lg-6">
                      <input
                        type="email"
                        class="form-control"
                        name="email"
                        id="email"
                        placeholder="您的邮箱"
                        data-rule="email"
                        data-msg="Please enter a valid email"/>
                      <div class="validation"></div>
                    </div>
                  </div>
                  <div class="form-group">
                    <input
                      type="text"
                      class="form-control"
                      name="subject"
                      id="subject"
                      placeholder="标题"
                      data-rule="minlen:4"
                      data-msg="Please enter at least 8 chars of subject"/>
                    <div class="validation"></div>
                  </div>
                  <div class="form-group">
                    <textarea
                      class="form-control"
                      name="message"
                      rows="5"
                      data-rule="required"
                      data-msg="Please write something for us"
                      placeholder="内容"></textarea>
                    <div class="validation"></div>
                  </div>
                  <div class="text-center">
                    <button type="submit" title="Send Message">发送</button>
                  </div>
                </form>
              </div>
            </div>

          </div>

        </div>
      </section>
    )
  }
}