import React from "react";
import Clock from "./Clock";
import moment from "moment";
import { ClientAPI } from "lgservice";

var chineseLunar = require("chinese-lunar");
export default class WeatherPlayer extends React.Component {
    constructor() {
        super();
        this.state = {
            weatherText: "",
            weatherImageUrl: "",
            lunar: ""
        };
    }

    componentDidMount(){
        this.requestWeather();
    }

    componentDidUpdate(prevProps) {
        if (prevProps.city !== this.props.city) {
            this.requestWeather();
        }
    }

    requestWeather() {
        console.log("this.props.city", this.props.city, !this.props.city);
        if (!this.props.city || this.props.city === "null") 
            return;
        const clientAPI = new ClientAPI();
        var arr = this
            .props
            .city
            .split("/");
        var city = arr[arr.length - 1];
        clientAPI
            .getWeather(city)
            .then(x => {
                const { temperature, weather } = x.data;
                console.log("weather", x.data);
                this.setState({
                    weatherText: temperature + " " + weather
                    //weatherImageUrl: clientAPI.dsServer + weatherImageUrl
                });
            });
        //solarToLunar的bug,要输入昨天的日期才能正常显示
        var now = new Date();
        var lunar = chineseLunar.solarToLunar(now, "YMD");
        this.setState({ lunar });
    }

    render() {
        if (!this.props.city || this.props.city === "null") 
            return null;
    
        return (
            <div className="col-sm-4 col-lg-3 absolute">
                <div className="card">
                    <div className="card-body row text-center">
                        <div className="col">
                            <div className="text-value-xl">
                                <Clock/>
                            </div>
                            <div className="text-uppercase text-muted small">
                                { this.state.weatherText }
                
                            </div>
                        </div>
                        <div className="c-vr"></div>
                        <div className="col">
                            <div className="text-value-xl">
                                <h5>{ `${moment().year()}年${moment().month() + 1}月${moment().date()}日` }</h5>
                            </div>
                            <div className="text-uppercase text-muted small">
                                { this.state.lunar }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
