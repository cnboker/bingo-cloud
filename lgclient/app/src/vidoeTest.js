//src: "http://127.0.0.1:8888/4k.mp4",
import React, {useEffect, useRef} from 'react'
import {videoPlay} from './serviceAPI/deviceCaller'
export default ()=>{
  const assetURL = 'http://127.0.0.1:8888/animal.webm';
  // ./mp4info frag_bunny.mp4 | grep Codec
  //const mimeCodec = 'video/mp4; codecs="avc1.64001F, mp4a.40.2"';
  const mimeCodec = 'video/mp4; codecs="avc1.4d401f,mp4a.40.2"'
  //var mimeCodec = 'video/mp4; codecs="avc1.640034"; profiles="mp42,mp41,isom,avc1"';
  const videoRef = useRef();
  //const video = document.querySelector('video');
  const sourceOpen =(src) => {
    const {currentTarget:mediaSource} = src
   
    var video = document.getElementById('video');
    var sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);
    fetchAB(assetURL, function (buf) {
      sourceBuffer.addEventListener('updateend', function () {
        if (mediaSource.readyState === 'open') {
          mediaSource.endOfStream();
          
        }
        //console.log('mediaSource.readyState',mediaSource.readyState);// ended
        
         videoRef.current.crossOrigin = 'anonymous';
        console.log('videoRef.current',video)
        video.play().catch((error)=>{ console.log('player', error)})
        
      });
      sourceBuffer.appendBuffer(buf);
    });
  };

  const fetchAB =(url, cb)=> {
    
    console.log("fetchAB",url);
    var xhr = new XMLHttpRequest;
    
    xhr.open('get', url);
    //xhr.setRequestHeader("Range", `bytes=0-${1024 * 1024}`);
   
    xhr.responseType = 'arraybuffer';
    xhr.onload = function () {
      cb(xhr.response);
    };
    xhr.send();
  };

  useEffect(()=>{
    // videoPlay().then(()=>{
    //   console.log('videoPlay...')
    // })
    // var video = document.getElementById('video');
    // if ('MediaSource' in window && MediaSource.isTypeSupported(mimeCodec)) {
    //   var mediaSource = new MediaSource;
    //   video.pause()
    //   video.src = URL.createObjectURL(mediaSource);
    //   mediaSource.addEventListener('sourceopen', sourceOpen);
    // } else {
    //   console.error('Unsupported MIME type or codec: ', mimeCodec);
    // }
  },[])
  return (
    <>
{/* <video muted="muted" id='video'  controls  ref={videoRef}></video> */}
<video
    id="my-video"
    class="video-js"
    controls
    preload="auto"
    width="1920"
    height="1080"
    autoPlay={true}
    data-setup="{}"
  >
    <source src="http://127.0.0.1:8888/videos/pipe.mp4" type="video/mp4" />
    <source src="http://127.0.0.1:8888/2.mp4" type="video/mp4" />
    <source src="http://127.0.0.1:8888/q4.mp4" type="video/mp4" />
    <p class="vjs-no-js">
      To view this video please enable JavaScript, and consider upgrading to a
      web browser that
      <a href="https://videojs.com/html5-video-support/" target="_blank"
        >supports HTML5 video</a>
    </p>
  </video>
    </>
  
  )
}

