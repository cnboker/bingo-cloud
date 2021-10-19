export const RECEIVE_PREPLAY = "RECEIVE_PREPLAY";
export const REMOTE_DATA_PUSH = "REMOTE_DATA_PUSH";

export const receivePreplay = payload => {
    return { type: RECEIVE_PREPLAY, payload };
};

export const receiveRemotePush = () => {
    return { type: REMOTE_DATA_PUSH, payload: "remotePush" };
};

export const requestPreplay = data => dispatch => {
    dispatch(receivePreplay(data));
};

export const requestRemotePush = () => dispatch => {
    dispatch(receiveRemotePush());
};
