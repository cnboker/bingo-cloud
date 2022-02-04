import React, { Component } from 'react'

class Footer extends Component {
    render() {
        return (
            <footer id="footer">
                <div class="container">
                    <div class="row">
                        <div class="col-lg-6 text-lg-left text-center">
                            <div class="copyright">
                                &copy; Copyright <strong>ioliz</strong>. All Rights Reserved
                                </div>
                            <div class="credits">

                                Designed by <a href="http://www.ioliz.com/">ioliz.com</a>
                            </div>
                        </div>
                        <div class="col-lg-6">
                            <nav class="footer-links text-lg-right text-center pt-2 pt-lg-0">
                                <a href="#intro" class="scrollto">首页</a>
                                <a href="#about" class="scrollto">关于</a>
                               <a target="_blank" href="http://www.miibeian.gov.cn/" class="scrollto">粤ICP备18034927号</a>
                            </nav>
                        </div>
                    </div>
                </div>
            </footer>
        )
    }
}

export default Footer