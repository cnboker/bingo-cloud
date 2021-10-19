import React from "react";
import Program from "./Program";

export default class DoubleProgram extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            currentProgram: null,
            nextProgram: null,
            showNextProgram: false 
        };
    }

    componentDidMount() {    
        this.initilize();  
    }

    initilize() {
        this.setState({
            showNextProgram: false
        });
        const { programs } = this.props;
    
        if (programs.length === 0) return;
        var currentProgram = programs.shift();
        var nextProgram = programs.shift();

        programs.push(currentProgram);
        if (!nextProgram) {
            nextProgram = { ...currentProgram };      
        }
        programs.push(nextProgram);
        this.setState({
            currentProgram,
            nextProgram
        });
    }

    componentDidUpdate(prevProps) {
        if (prevProps.programs !== this.props.programs) {
            console.log("DoubleProgram,componentDidUpdate");
            //有信息重置狀態
    
            this.initilize();
      
        }
    }

    //检查是否播放下一个节目,节目有视频以视频播放结束播放下一个节目，否正图片播放结束播放下一个节目
    onEnd(name) {
        console.log("name=",name);
        //
        if (name === "current") {
            // if (!this.state.nextProgram) {
            //   //重复播放
            //   this.setState({
            //     currentProgram: { ...this.state.currentProgram }
            //   });
            //   return;
            // }
            this.onCurrentEnd();
        }
        if (name === "next") {
            this.onNextEnd();
        }
    }

    //第一個播放結束換第一個的節目原
    onCurrentEnd() {
        const { programs } = this.props;
        var currentProgram = programs.shift();
        programs.push(currentProgram);
        this.setState({
            showNextProgram: true,
            currentProgram
        });
    //console.log("current program end");
    }

    //第二個播放結束，換第二個的節目原
    onNextEnd() {
        const { programs } = this.props;
        var nextProgram = programs.shift();
        programs.push(nextProgram);
        this.setState({
            nextProgram,
            showNextProgram: false
     
        });
    //console.log("next program end");
    }

    render() {
    //console.log("this.state.showNextProgram", this.state.showNextProgram);
        return (
            <React.Fragment>
                <div 
                    className={ !this.state.showNextProgram?"show":"hide" }
                >
                    <Program
                        name="current"
                        data={ this.state.currentProgram }
                        onEnd={ this.onEnd.bind(this) }
                        controlVisible={ !this.state.showNextProgram }
                    />
                </div>
                <div
                    className={ this.state.showNextProgram?"show":"hide" }
                >
                    { this.state.nextProgram && (
                        <Program
                            name="next"
                            data={ this.state.nextProgram }
                            onEnd={ this.onEnd.bind(this) }
                            controlVisible={ this.state.showNextProgram }
                        />
                    ) }
                </div>
            </React.Fragment>
        );
    }
}
