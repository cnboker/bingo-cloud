import React, { useEffect, useRef, useState } from "react"
import { IVidePlayerProps } from '../Meta'

export const VideoPlayer = <T extends unknown>({ urls, exit }: IVidePlayerProps<T>) => {
    const video = useRef(null)
    console.log('urls', urls)
    const [currentPlaying, setCurrentPlaying] = useState(0)

    useEffect(() => { 
        video.current.addEventListener('timeupdate', (event) => {
            if (!video.current) return;
            const { currentTime, duration } = video.current;
            if (duration - currentTime < 1) {
                //end
                const index = currentPlaying + 1;
                if (index === urls.length) {
                    exit && exit()
                } else {
                    setCurrentPlaying(index)
                    play(urls[index])
                }
            }
        });

        video.current.mute = true

        video.current.onloadeddata = () => {
            console.log('player...')
            //video.current.currentTime = 0.1
            video.current.play().then(() => {
                // TODO: 在用户开始播放视频时，获取视频的其余部分。
            });
        }
        //video.current.load(); // 后续能够播放视频。

        play(urls[currentPlaying])

    }, [])

    // useEffect(() => {
    //     window.caches.open('video-pre-cache')
    //         .then(cache => Promise.all(urls.map(videoFileUrl => fetchAndCache(videoFileUrl, cache))));
    // }, [])


    useEffect(() => {

        window.addEventListener('fetch', event => {
            debugger
            //@ts-ignore
            event.respondWith(loadFromCacheOrFetch(event.request));
        });

        function loadFromCacheOrFetch(request) {
            // 为此请求搜索所有可用的缓存。
            return caches.match(request)
                .then(response => {

                    // 如果它尚未在缓存中，则从网络获取。
                    if (!response) {
                        return fetch(request);
                        // 注意，我们可能希望将响应添加到缓存中，同时并行
                        // 返回网络响应。
                    }

                    // 浏览器发送一个 HTTP Range 请求。 让我们从缓存中
                    // 手动重建一个。
                    if (request.headers.has('range')) {
                        return response.blob()
                            .then(data => {

                                // 从 Range 请求标头中获取起始位置。
                                const pos = Number(/^bytes\=(\d+)\-/g.exec(request.headers.get('range'))[1]);
                                const options = {
                                    status: 206,
                                    statusText: 'Partial Content',
                                    headers: response.headers
                                }
                                const slicedResponse = new Response(data.slice(pos), options);
                                //@ts-ignore
                                slicedResponse.setHeaders('Content-Range', 'bytes ' + pos + '-' +
                                    (data.size - 1) + '/' + data.size);
                                //@ts-ignore
                                slicedResponse.setHeaders('X-From-Cache', 'true');

                                return slicedResponse;
                            });
                    }

                    return response;
                })
        }
    }, [])

    const fetchAndCache = (videoFileUrl, cache) => {
        // 首先检查视频是否在缓存中。
        return cache.match(videoFileUrl)
            .then(cacheResponse => {
                // 如果视频已在缓存中，我们返回缓存的响应。
                if (cacheResponse) {
                    return cacheResponse;
                }
                // 否则，从网络获取视频
                return fetch(videoFileUrl, { headers: { range: 'bytes=0-567139' } })
                    .then(networkResponse => {
                        // 将响应添加到缓存中，同时并行返回网络响应。
                        console.log('networkResponse', networkResponse)
                        cache.put(videoFileUrl, networkResponse.clone());
                        return networkResponse;
                    });
            });
    }

    const play = (url: string): void => {
        // 后续能够播放视频。
        video.current.load()
        video.current.src = url;
        return;
        window.caches.open('video-pre-cache')
            .then(cache => fetchAndCache(url, cache)) // 在上文定义。
            .then(response => response.arrayBuffer())
            .then(data => {
                console.log('data', data)
                const mediaSource = new MediaSource();
                video.current.src = URL.createObjectURL(mediaSource);
                mediaSource.addEventListener('sourceopen', () => {
                    //检查编码 https://gpac.github.io/mp4box.js/test/filereader.html
                    //视频预加载 https://web.dev/i18n/zh/fast-playback-with-preload/
                    //https://ioncannon.net/utilities/1515/segmenting-webm-video-and-the-mediasource-api/
                    const sourceBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.640028"');
                    URL.revokeObjectURL(video.current.src);
                    sourceBuffer.appendBuffer(data);

                    sourceBuffer.addEventListener("updateend", () => {
                        if (
                            mediaSource.readyState === "open" &&
                            sourceBuffer &&
                            sourceBuffer.updating === false
                        ) {
                            //sourceBuffer.appendBuffer(data);

                        }
                        // console.log('updateend...')
                        // Limit the total buffer size to 20 minutes
                        // This way we don't run out of RAM
                        if (
                            video.current.buffered.length &&
                            video.current.buffered.end(0) - video.current.buffered.start(0) > 1200
                        ) {
                            sourceBuffer.remove(0, video.current.buffered.end(0) - 1200)
                        }
                    });
                }, { once: true });
            });

    }

    return (
        <>
            <video ref={video} muted={true} crossOrigin="anonymous" width={1280} height={640}></video>

        </>
    )

}


