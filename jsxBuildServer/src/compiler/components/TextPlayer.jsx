import React from "react";
import { Animate, specialAnimation } from "./Animate";

export default class TextPlayer extends React.Component {
    constructor(){
        super();
        this.timer = null;
    
    }
    componentDidMount() {
        this.play();
    }

    componentDidUpdate(prevProps) {
        if (
            prevProps.content !== this.props.content &&
      prevProps.playerState === this.props.playerState
        ) {
            this.play();
        }
    }

    play() {
        console.log("text player");
        this.animation = specialAnimation();
        if(this.timer){
            clearTimeout(this.timer);
        }

        if (this.props.allowSendPreplayMessage) {
            this.props.requestPreplay({
                action: "prePlay",
                value: "textPlayer"
            });
        }

        const { maxDuration } = this.props;
        const { duration } = this.props.content;
        this.timer = setTimeout(() => {      
            if (this.props.onEnd && duration >= maxDuration) {
                this.props.onEnd("text");
            }
        }, duration * 1000);
    }

    render() {
        const { content } = this.props;
        const { style } = content;
        console.log("text render");
        var divStyle = {
            fontSize: style.fontSize + "px",
            textDecorationLine: style.textDecoration,
            color: style.color,
            fontWeight: style.fontWeight,
            fontFamily: style.fontFamily,
            textAlign: style.text_align,
            backgroundColor: style.backgroundColor,
            backgroundImage: style.backgroundImage,
            height: "100%",
            widht: "100%"
        };
        return (
            <Animate animation={ this.animation }>
                <div style={ divStyle }>{ content.text[0] }</div>;
            </Animate>
        );
    }
}

TextPlayer.defaultProps = {
    content: {
        text: ["hello world"],
        duration: 5,
        style: {
            fontSize: "100",
            textDecoration: "underline",
            color: "#e52870",
            fontWeight: "0",
            fontFamily: "宋体",
            x: 0,
            y: 0,
            text_align: "center",
            backgroundColor: "#ffffff",
            backgroundImage: null,
            rollStyle: 3,
            direction: 2,
            fontSpeed: 1,
            switchTime: 0,
            backgroundType: 1
        },
        contentType: 1
    }
};
