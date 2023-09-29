var ffmpeg = require("fluent-ffmpeg");

//Check whether the video is h264 and 1080p video
module.exports = (filename) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filename, function (err, metadata) {
            console.log(metadata);
            if (metadata.streams.length > 0) {
                const videoinfo = metadata.streams[0];
                const { codec_name, width, height, r_frame_rate } = videoinfo
                //first element
                const frp = eval(r_frame_rate)
                console.log('videoinfo', codec_name, width, height, r_frame_rate, frp)

                if (codec_name === 'h264') {
                    resolve(!(width <= 1920 && height <= 1080 && frp <= 30))
                } else {
                    resolve(true)
                }
            } else {
                resolve(true)
            }
        });
    })
}

