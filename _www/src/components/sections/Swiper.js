import React, { useRef, useState } from "react";
// Import Swiper React components
import { Swiper, SwiperSlide } from "swiper/react";
import DS1 from './../../assets/images/ds1.jpeg'
import DS2 from './../../assets/images/ds2.jpeg'
import DS3 from './../../assets/images/ds4.jpeg'
// Import Swiper styles
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

import "../../assets/scss/styles.css";

// import Swiper core and required modules
import SwiperCore, { Autoplay, Pagination, Navigation } from "swiper";

// install Swiper modules
SwiperCore.use([Autoplay, Pagination, Navigation]);

export default function App() {
  return (
    <>
      <Swiper
        spaceBetween={30}
        centeredSlides={true}
        autoplay={{
          delay: 2500,
          disableOnInteraction: false,
        }}
        pagination={{
          clickable: true,
        }}
        navigation={true}
        className="mySwiper"
      >
        <SwiperSlide><img src={DS1} alt=''/></SwiperSlide>
        <SwiperSlide><img src={DS2} alt=''/></SwiperSlide>
        <SwiperSlide><img src={DS3} alt=''/></SwiperSlide>
       
      </Swiper>
    </>
  );
}
