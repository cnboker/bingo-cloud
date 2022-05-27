import axios from 'axios'
import { toast } from 'src/views/components/dialog/Index'
import { authHeader } from '~/lib/check-auth'
export const RECEIVE_TAGS = 'RECEIVE_TAGS'

export const receiveTags = (payload) => {
  return { type: RECEIVE_TAGS, payload }
}

export const fetchTags = (catelog) => (dispatch) => {
  axios({
    method: 'GET',
    url: `${process.env.REACT_APP_SERVICE_URL}/api/topic/${catelog}`,
    headers: authHeader(),
  }).then((response) => {
    var data = {
      catelog,
      tags: typeof response.data === 'string' ? JSON.parse(response.data) : response.data,
    }
    dispatch(receiveTags(data))
  })
}

export const tagUpdate = (data) => (dispatch) => {
  axios({
    method: 'post',
    url: `${process.env.REACT_APP_SERVICE_URL}/api/topic`,
    data,
    headers: authHeader(),
  })
    .then(() => {
      toast('success')
      dispatch(receiveTags({ catelog: data.catelog, tags: JSON.parse(data.content) }))
    })
    .catch((e) => {
      toast(e.message)
    })
}

export const tagSelect = (catelog, tagName) => {
  var data = {
    catelog,
    tagName,
  }
  var headers = authHeader()
  axios({
    method: 'GET',
    url: `${process.env.REACT_APP_SERVICE_URL}/api/tag/filter`,
    data,
    headers,
  }).then((topics) => {
    console.log(topics)
    //dispatch(receiveTags(data))
  })
}
