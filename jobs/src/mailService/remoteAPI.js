import axios from 'axios'
import {REACT_APP_ORDER_URL} from '../config'

export const mailQuery = () => {
    var url = `${REACT_APP_ORDER_URL}/api/mail/query`;
    //console.log('url',url)
    return axios({
      url,
      method: "get",
    });
};

export const mailStatusUpdate = (mailMessageIds, status) => {

    var url = `${REACT_APP_ORDER_URL}/api/mail/update`;
    return axios({
      url,
      method: "post",
      data: { mailQueueIDs:mailMessageIds,status},
    });
};
