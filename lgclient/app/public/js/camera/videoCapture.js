/******************************************************
 * 
 * WebCamera using adapter.js
 * 
 * new WebCamera(parameters)
 *  - Prepare for initializing webcam
 *    - parameters.divTag : DIV tag for creating video tag
 *                          and webcam input will be displayed
 *    - parameters.width  : Webcam resolution width
 *    - parameters.height : Webcam resolution height
 * 
 * WebCamera.initialize(callback)
 *  - Initialize webcam, and video tag will be displayed
 *    from webcam input
 * 
 * WebCamera.capture(imageDivElement, callback)
 *  - Capture screenshot from webcam(video tag)
 *    and display screenshot to div tag
 * 
 ******************************************************/

var WebCamera = function (parameters) {
    var videoDivElement = parameters.divTag,
        videoTagElement;
    var imageDivElement;


    WebCamera.prototype.initialize = function (callback) {
        videoTagElement = document.createElement('video');
        videoTagElement.id = '__webcam__';
        videoTagElement.autoplay = true;
        videoTagElement.texture = true;
        videoTagElement.style.border = '0px';
        videoTagElement.style.padding = '0px';
        videoTagElement.style.margin = '0px';
        videoTagElement.style.width = '100%';
        videoTagElement.style.height = '100%';
        videoDivElement.appendChild(videoTagElement);
        cameraInit(callback);
    }

    WebCamera.prototype.capture = function (imageDivElement, callback) {
        var canvas = document.createElement('canvas');
        canvas.width = videoTagElement.videoWidth;
        canvas.height = videoTagElement.videoHeight;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(videoTagElement, 0, 0, canvas.width, canvas.height);
        // var img = document.getElementById('captured');
        // var img = imgEl;

        while (imageDivElement.firstChild) {
            imageDivElement.removeChild(imageDivElement.firstChild);
        }

        var imgEl = document.createElement('img');
        imgEl.id = '__webcam_captured_';
        imgEl.style.position = 'absolute';
        imgEl.style.border = '0px';
        imgEl.style.padding = '0px';
        imgEl.style.margin = '0px';
        imgEl.style.width = '100%';
        imgEl.style.height = '100%';
        imgEl.src = canvas.toDataURL();
        imgEl.onload = callback;
        imageDivElement.appendChild(imgEl);
    }

    function cameraInit(callback) {

        // var video = document.querySelector('video');
        var video = videoTagElement;

        // Put variables in global scope to make them available to the browser console.
        var constraints = window.constraints = {
            audio: false,
            video: {
                mandatory: {
                    // minWidth: 418,
                    // minHeight: 503,
                    // maxWidth: 418,
                    // maxHeight: 503
                    minWidth: parameters.width,
                    minHeight: parameters.height,
                    maxWidth: parameters.width,
                    maxHeight: parameters.height
                }
            }
        };

        function handleSuccess(stream) {
            var videoTracks = stream.getVideoTracks();
            console.log('Got stream with constraints:', constraints);
            console.log('Using video device: ' + videoTracks[0].label);
            stream.oninactive = function () {
                console.log('Stream inactive');
            };
            window.stream = stream; // make variable available to browser console
            video.srcObject = stream;
            setTimeout(function () {
                callback(true);
            }, 1000)
        }

        function handleError(error) {
            console.error('getUserMedia error: ' + error.name, error);
            setTimeout(function () {
                callback(false);
            }, 1000)
        }

        navigator.mediaDevices.getUserMedia(constraints).
            then(handleSuccess).catch(handleError);

    }
}