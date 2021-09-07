import React, {Component} from 'react'

export default class CalltoAction extends Component {
  render() {
    return (

      <section id="call-to-action">
        <div class="container">
          <div class="row">
            <div class="col-lg-9 text-center text-lg-left">
              <h3 class="cta-title">打个电话问一下</h3>
              <p class="cta-text">
                沟通和互信是合作的基础,我们已经准备好,随时等待您的咨询.</p>
            </div>
            <div class="col-lg-3 cta-btn-container text-center">
              <a class="cta-btn align-middle" href="tel:13410053353">Call me</a>
            </div>
          </div>

        </div>
      </section>

    )
  }
}