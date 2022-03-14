import axios from 'axios'

const authHeader=()=> {
  // return authorization header with jwt token
  let user = JSON.parse(localStorage.getItem('token'))

  if (user && user) {
    return {
      Authorization: 'Bearer ' + user.access_token,
    }
  } else {
    return {}
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const asyncGet = (params) => {
  const { url, data } = params
  var headers = auth.authHeader()
  return axios({
    method: 'get',
    url,
    data,
    headers,
  })
}

export const asyncDelete = (params) => {
  const { url, data } = params
  var headers = auth.authHeader()
  return axios({
    method: 'delete',
    url,
    data,
    headers,
  })
}

export const asyncPost = (params) => {
  const { url, data } = params
  var headers = auth.authHeader()
  return axios({
    method: 'post',
    url,
    data,
    headers,
  })
}

