import moment from 'moment'
//import 'moment-duration-format'
//moment.locale('zh-cn')
export const toDate = function (text) {
  return moment(text).format('YYYY-MM-DD')
}

export const toShortDateTime = function (text) {
  return moment(text).format('MM-DD HH:mm')
}

export const toLongDateTime = function (text) {
  if (!text) return '/'
  if (text === '0001-01-01T00:00:00') return '/'
  return moment(text).format('YYYY-MM-DD HH:mm:ss')
}

export const toTime = function (text) {
  return moment(text).format('HH:MM:SS')
}

export const toShortTime = function (text) {
  return moment(text).format('HH:MM')
}

export const durationToHHMM = function (minutes) {
  //return moment.utc(moment.duration(minutes, "m").asMilliseconds()).format("dd:HH:mm")
  return moment
    .duration(minutes, 'minutes')
    .format()
    .replace('month', '月')
    .replace('months', '月')
    .replace('week', '周')
    .replace('weeks', '周')
    .replace('day', '天')
    .replace('days', '天')
    .replace('hour', '时')
    .replace('hours', '时')
}

export const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// eslint-disable-next-line no-extend-native
Array.prototype.setAll = function (v) {
  var i,
    n = this.length
  for (i = 0; i < n; ++i) {
    this[i] = v
  }
}

// eslint-disable-next-line no-extend-native
Object.defineProperty(Array.prototype, 'chunk', {
  value: function (chunkSize) {
    var R = []
    for (var i = 0; i < this.length; i += chunkSize) R.push(this.slice(i, i + chunkSize))
    return R
  },
})

export const jsonToUrlQuery = (json) => {
  var url = Object.keys(json)
    .map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(json[k])
    })
    .join('&')
  return url
}

export const uniqueID = () => {
  return Math.random().toString(36).slice(2)
}

if (!String.prototype.format) {
  String.prototype.format = function () {
    var args = arguments
    return this.replace(/{(\d+)}/g, function (match, number) {
      return typeof args[number] != 'undefined' ? args[number] : match
    })
  }
}

/**
 * 补全数组长度的功能 如果某个数组不够指定长度，会在头部补全
 * @param { Number } length
 * @param { * } element
 * @return 补全后的数组
 * 示例: [].padStart(Number, element = '')
 */
if (!Array.prototype.padStart) {
  Object.defineProperty(Array.prototype, 'padStart', {
    value: function (length, element) {
      // length is Number
      if (!Number(length) && Number(length) != 0) throw new Error(`${length} is not Number`)
      // init
      let self = this
      let len = length - this.length
      // add elements
      for (let i = 0; i < len; i++) {
        if (element instanceof Array) {
          self.unshift([...element])
        } else if (element instanceof Object) {
          self.unshift({ ...element })
        } else {
          self.unshift(element || '')
        }
      }
      return self
    },
  })
}

/**
 * 补全数组长度的功能 如果某个数组不够指定长度，会在尾部补全
 * @param { Number } length
 * @param { * } element
 * @return 补全后的数组
 * 示例: [].padEnd(Number, element = '')
 */
if (!Array.prototype.padEnd) {
  Object.defineProperty(Array.prototype, 'padEnd', {
    value: function (length, element) {
      // length is Number
      if (!Number(length) && Number(length) != 0) throw new Error(`${length} is not Number`)
      // init
      let self = this
      let len = length - this.length
      // add elements
      for (let i = 0; i < len; i++) {
        if (element instanceof Array) {
          self.push([...element])
        } else if (element instanceof Object) {
          self.push({ ...element })
        } else {
          self.push(element || '')
        }
      }
      return self
    },
  })
}
