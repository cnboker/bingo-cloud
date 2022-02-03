import React, { useEffect, useRef, useState } from "react"
import { IVidePlayerProps } from '../Meta'

var uniqueID = (function () {
    var id = 1 // This is the private persistent value
    // The outer function returns a nested function that has access to the
    // persistent value.  It is this nested function we're storing in the variable
    // uniqueID above.
    return function () {
        return id++
    } // Return and increment
})() // Invoke the outer function after defining it.

export const VideoPlayer = <T extends unknown>({ urls, exit }: IVidePlayerProps<T>) => {
    const vid1 = useRef(null)
    const vid2 = useRef(null)
    const [currentPlaying, setCurrentPlaying] = useState(0)
    const _urls = urls.map(x => {
        const url = new URL(x)
        return url.pathname
    })
    //console.log('urls=', _urls)
    useEffect(() => {
        vid1.current.name = "vid" + uniqueID()
        vid2.current.name = "vid" + uniqueID()

        vid1.current.addEventListener("ended", () => {
            vid2.current.muted = false
            resetPlayer(vid1.current)
            if (currentPlaying >= urls.length && exit) {
                exit()
                return
            }
            vid2.current.play()

        }, false)


        vid2.current.addEventListener("ended", () => {
            vid1.current.muted = false
            resetPlayer(vid2.current)
            //console.log("vid2 play end", this.CURRENT_PLAYING)
            if (currentPlaying >= urls.length && exit) {
                exit()
                return
            }
            vid1.current.play()

        }, false)

        vid1.current.addEventListener("play", () => {
            console.log(`${vid1.current.name} play, url:${vid1.current.src}`)
            vid1.current.muted = false
            vid2.current.muted = true

            vid1.current.style.visibility = "visible"
            vid2.current.style.visibility = "hidden"

            setCurrentPlaying((cur) => {
                if (cur < urls.length - 1) {
                    vid2.current.src = _urls[cur + 1]
                    vid2.current.load()
                    return cur + 1
                }
                return cur
            })
        })


        vid2.current.addEventListener("play", () => {
            console.log(`${vid2.current.name} play, url:${vid2.current.src}`)
            vid2.current.muted = false
            vid1.current.muted = true
            vid2.current.style.visibility = "visible"
            vid1.current.style.visibility = "hidden"

            setCurrentPlaying(cur => {
                if (cur < urls.length - 1) {
                    vid1.current.src = _urls[cur + 1]
                    vid1.current.load()
                    return cur + 1
                }
                return cur
            })
        })

        dataPerpare()
    }, [])

    const resetPlayer = (player) => {
        player.style.visibility = "hidden"
        console.log(`${player.name} end, url:${player.src}`)
        player.src = ""
    }


    const dataPerpare = () => {
        if (urls.length === 0)
            return
        vid1.current.muted = true
        vid1.current.src = _urls[currentPlaying]

        //vid1.current.load()
        //vid1.current.autoPlay = true
        const playPromise = vid1.current.play()
        if (playPromise !== undefined) {
            playPromise.then(_ => {
                // Automatic playback started!
                // Show playing UI.
            })
                .catch(error => {
                    // Auto-play was prevented
                    // Show paused UI.
                    console.error(error)
                });
        }
    }
    return (
        <>
            <video className="vid" preload="none" ref={vid1}></video>
            <video className="vid" preload="none" ref={vid2} ></video>
        </>
    )

}


