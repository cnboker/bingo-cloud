import React, { useEffect } from 'react'
import './default.css'
export default () => {
    useEffect(() => {
        return setInterval(() => {
            updateClock()
        }, 1)
    })
    return (
        <div id="timedate">
            <a id="mon">January</a>
            <a id="d">1</a>,
            <a id="y">0</a><br />
            <a id="h">12</a> :
            <a id="m">00</a>:
            <a id="s">00</a>:
            <a id="mi">000</a>
        </div>
    )
}

// START CLOCK SCRIPT

Number.prototype.pad = function (n) {
    for (var r = this.toString(); r.length < n; r = 0 + r);
    return r;
};

function updateClock() {
    var now = new Date();
    var milli = now.getMilliseconds(),
        sec = now.getSeconds(),
        min = now.getMinutes(),
        hou = now.getHours(),
        mo = now.getMonth(),
        dy = now.getDate(),
        yr = now.getFullYear();
    var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var tags = ["mon", "d", "y", "h", "m", "s", "mi"],
        corr = [months[mo], dy, yr, hou.pad(2), min.pad(2), sec.pad(2), milli];
    for (var i = 0; i < tags.length; i++)
        document.getElementById(tags[i]).firstChild.nodeValue = corr[i];
}



  // END CLOCK SCRIPT