import React, { Component } from 'react'
import ReactQMap from '~/components/QMAP/index'
import CityPicker from '~/views/Components/CityPicker/index'
import cityData from 'china-area-data'
import { Input } from 'reactstrap'

class MapBox extends Component {
  constructor(props) {
    super()
    this.state = {
      center: {},
      city: '',
      position: props.position || null,
    }
    this.marker = null
  }

  componentDidMount() {
    if ('geolocation' in navigator) {
      /* geolocation is available */
      navigator.geolocation.getCurrentPosition(this._showPosition, this._showError)
    } else {
      /* geolocation IS NOT available */
      alert('你的浏览器不支持geolocation')
    }
  }

  _showPosition = (position) => {
    console.log(position.coords)
    this.setState({
      center: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
    })
    // alert(JSON.stringify({latitude: position.coords.latitude, longitude:
    // position.coords.longitude}));
  }

  _showError = (error) => {
    console.log(error)
    alert('获取定位异常')
  }

  //wMap对应qq.maps对象 map对应new qq.maps.Map(document.getElementById('container'))对象
  _getMap(map, wMap) {
    if (map) {
      this.map = map
    }
    if (wMap) {
      this.wMap = wMap
    }
    this.addMarkerListener(map, wMap, (lat, lng) => {
      if (this.props.onMarkerUpdate) {
        this.props.onMarkerUpdate({ lat, lng })
      }
    })
    const { position } = this.state
    if (position && !this.marker) {
      const { lat, lng } = position
      const latlng = new wMap.LatLng(lat, lng)
      this.latlngSetCenter(latlng)
      this.marker = new wMap.Marker({ map, position: latlng, animation: wMap.MarkerAnimation.DROP })
    }
  }

  addMarkerListener = (map, wMap, fn) => {
    //增加添加marker标签事件
    wMap.event.addListener(map, 'click', (e) => {
      // console.log('maker', e)
      const { lat, lng } = e.latLng
      const latlng = new wMap.LatLng(lat, lng)

      if (this.marker) {
        this.marker.setPosition(latlng)
      } else {
        this.marker = new wMap.Marker({
          map,
          position: latlng,
          animation: wMap.MarkerAnimation.DROP,
        })
        this.setState({
          position: {
            lat,
            lng,
          },
        })
      }
      if (fn) {
        fn(lat, lng)
      }
      //marker.setTitle('test');
    })
  }

  addressSetCenter(city) {
    let self = this
    let geocoder = new this.wMap.Geocoder({
      complete: function (result) {
        console.log('addressSetCenter', result.detail)
        self.map.setCenter(result.detail.location)
      },
    })
    geocoder.getLocation(city)
  }

  latlngSetCenter(latlng) {
    const map = this.map
    const geocoder = new this.wMap.Geocoder()
    geocoder.setComplete((result) => {
      console.log('result.detail.location', result.detail.location)
      map.setCenter(result.detail.location)
    })
    geocoder.getAddress(latlng)
  }

  handleChange = (value) => {
    console.log(value)
    let city
    city = cityData['86'][value.province]

    if (value.city) {
      city += cityData[value.province][value.city]
    }
    console.log('city=', city)
    this.setState({ city })
    this.addressSetCenter(city)
  }

  onKeyDown(e) {
    // console.log(e)
    if (e.key === 'Enter') {
      const input = e.target.value
      console.log('address', input)
      this.addressSetCenter(this.state.city + input)
    }
  }

  render() {
    return (
      <ul className="list-group">
        <li className="list-group-item">
          <CityPicker source={cityData} noDistrict onOptionChange={this.handleChange} />
        </li>
        <li className="list-group-item">
          <Input
            type="text"
            placeholder="输入地址回车定位位置"
            onKeyDown={this.onKeyDown.bind(this)}
          />
        </li>
        <li className="list-group-item">
          <ReactQMap
            ref={(instance) => {
              this.qmap = instance
            }}
            center={{
              latitude: 30.53786,
              longitude: 104.07265,
            }}
            initialOptions={{
              zoomControl: true,
              mapTypeControl: true,
            }}
            apiKey="5MDBZ-ZTW3V-42NPE-UYNBQ-XYEBE-CQBBJ"
            style={{
              height: 500,
              backgroundColor: '#091220',
            }} // 高度和宽度默认占父元素的100%
            getMap={(map, wMap) => {
              this._getMap(map, wMap)
            }}
          />
        </li>
      </ul>
    )
  }
}

export default MapBox
