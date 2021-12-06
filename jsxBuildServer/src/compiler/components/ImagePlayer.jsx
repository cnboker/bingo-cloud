import React from "react";
import { Animate, randomAnimation } from "./Animate";
import { fileExistWebOSUrls } from "../../lib/util";

export default class ImagePlayer extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            image: null,
            animation: "fadeInLeft",
            background: null,
            zIndex: 999
        };
        this.timer = null;
        this.images = [];
    }

    componentDidMount() {
        const { controlVisible } = this.props;
        if (!controlVisible) return;
        this.start();
    }

    componentDidUpdate(prevProps) {
        const visible = prevProps.controlVisible !== this.props.controlVisible && this.props.controlVisible;
        //prePlay消息不触发
        if ( prevProps.content !== this.props.content && 
      prevProps.playerState == this.props.playerState) {  
        
            console.log("images componentDidUpdate",this.props.content.images);   
            this.start();
        }else if(visible){
            console.log("image visible", this.props.content.images);
            this.start();
        }
    }

    start() {
        const {     
            images      
        } = this.props.content;
        this.images = fileExistWebOSUrls(images);
   
        if (this.images.length === 0) return;

        // if (this.props.allowSendPreplayMessage) {
        //   console.log('requestPreplay', images)
        //   this.props.requestPreplay({
        //     action: "prePlay",
        //     value: "imagePlayer"
        //   });
        // }

        this.play();
    }

    play() {
        const {
            interval,
            duration,
            images      
        } = this.props.content;
        const { controlVisible,maxDuration } = this.props;
        //console.log(moment().format("HH:mm:ss"), interval,duration,maxDuration);
        if (this.timer) {
            clearTimeout(this.timer);
        }
        var nextImage = this.images.shift();
        //console.log('imageplayer', this.images)
        if (nextImage) {
            var background = this.state.background;
            if (!background) {
                background = nextImage;
            } else {
                background = this.state.image;
            }
            //第一張圖片不加效果
            var animation =
        images.length - 1 === this.images.length ? "" : randomAnimation();
            console.log("animation",animation);
            this.setState({
                image: nextImage,
                animation,
                key: Math.random(),
                background
            });
            if (!controlVisible) return;
            this.timer = setTimeout(() => {
                this.play();
            }, interval * 1000);
        } else {
            if (this.props.onEnd && duration >= maxDuration) {
                this.props.onEnd("image");
            } else {
                this.start();
            }
        }
    }

    render() {
        const { controlVisible } = this.props;
        if (!controlVisible) return null;
        const { isTile } = this.props.content;
        if (!this.state.image) return null;
        var styles = {};

        if (isTile) {
            styles.margin = "0 auto";
        } else {
            styles.maxWidth = "100%";
            styles.maxHeight = "100%";
            styles.height = "auto";
            styles.width = "auto";
        }

        var divStyle = {
            overflow: "hidden",
            width: "100%",
            height: "100%",
            backgroundSize: "cover"
        };

        if (this.state.background) {
            divStyle.backgroundImage = `url("${this.state.background}")`;
            divStyle.backgroundRepeat = "no-repeat";
        }

        if (!isTile) {
            divStyle = {
                ...divStyle
            };
        } else {
            divStyle = {
                backgroundPosition: "center center",
                ...divStyle
            };
        }
        return (
            <div style={ divStyle }>
                <Animate animation={ this.state.animation } key={ this.state.key }>
                    <img style={ styles } src={ this.state.image } alt="" />
                </Animate>
            </div>
        );
    }
}

ImagePlayer.defaultProps = {
    content: {
        switchEffect: 1,
        duration: 30,
        isTile: false, //自适应
        interval: 5,
        images: [
            "/UploadFiles/file1013/images/timg (1).jpg",
            "/UploadFiles/file1013/images/timg (2).jpg",
            "/UploadFiles/file1013/images/timg (3).jpg",
            "/UploadFiles/file1013/images/timg (5).jpg"
        ],
        contentType: 2
    }
};
