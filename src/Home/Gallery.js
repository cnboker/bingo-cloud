import React, {Component} from 'react'

{/* <!--==========================
              Gallery Section
            ============================--> */
}
export default class Gallery extends Component {
  render() {
    return (

      <section id="gallery">
        <div class="container-fluid">
          <div class="section-header">
            <h3 class="section-title">案例展示</h3>
            <span class="section-divider"></span>
            <p class="section-description">近期项目界面展示</p>
          </div>
          <div class="row no-gutters">

            <div class="col-lg-4 col-md-6">
              <div class="gallery-item wow fadeInUp">
                <a href="img/gallery/a1.png" class="gallery-popup">
                  <img src="img/gallery/a1.png" alt=""/>
                </a>
              </div>
            </div>

            <div class="col-lg-4 col-md-6">
              <div class="gallery-item wow fadeInUp">
                <a href="img/gallery/a2.png" class="gallery-popup">
                  <img src="img/gallery/a2.png" alt=""/>
                </a>
              </div>
            </div>

            <div class="col-lg-4 col-md-6">
              <div class="gallery-item wow fadeInUp">
                <a href="img/gallery/a3.png" class="gallery-popup">
                  <img src="img/gallery/a3.png" alt=""/>
                </a>
              </div>
            </div>

          {/*   <div class="col-lg-4 col-md-6">
              <div class="gallery-item wow fadeInUp">
                <a href="img/gallery/gallery-4.jpg" class="gallery-popup">
                  <img src="img/gallery/gallery-4.jpg" alt="" />
                </a>
              </div>
            </div>

            <div class="col-lg-4 col-md-6">
              <div class="gallery-item wow fadeInUp">
                <a href="img/gallery/gallery-5.jpg" class="gallery-popup">
                  <img src="img/gallery/gallery-5.jpg" alt="" />
                </a>
              </div>
            </div>

            <div class="col-lg-4 col-md-6">
              <div class="gallery-item wow fadeInUp">
                <a href="img/gallery/gallery-6.jpg" class="gallery-popup">
                  <img src="img/gallery/gallery-6.jpg" alt="" />
                </a>
              </div>
            </div> */}

          </div>

        </div>
      </section>
    )
  }
}