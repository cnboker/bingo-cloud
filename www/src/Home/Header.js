import React, { Component } from 'react';

class Header extends Component{
    render(){
        return(
            <header id="header">
            <div className="container">
        
              <div id="logo" className="pull-left">
                <h1><a href="#intro" className="scrollto">IOLIZ</a></h1>
                {/*<!-- Uncomment below if you prefer to use an image logo -->
                <!-- <a href="#intro"><img src="img/logo.png" alt="" title=""></a> -->} */}
              </div>
        
              <nav id="nav-menu-container">
                <ul className="nav-menu">
                  <li className="menu-active"><a href="#intro">首页</a></li>
                  <li><a href="#about">关于我们</a></li>      
                  <li><a href="#features">服务内容</a></li>
                  <li><a href="#more-features">服务流程</a></li>
                  <li><a href="#gallery">案例展示</a></li>                     
                  <li><a href="#contact">联系我们</a></li>
                </ul>
              </nav>
            </div>
          </header>
        )
    }
}

export default Header