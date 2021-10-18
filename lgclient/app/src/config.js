const dev = {
  REACT_APP_LG_URL: 'http://localhost:8888',
  ///defaultApp: require ('./player/components/test/webapp').default
  defaultApp: require ('./vidoeTest').default
}

const prod = {
  REACT_APP_LG_URL: 'http://127.0.0.1:9080/ds',
  defaultApp: require ('./App').default
}

const config = process.env.REACT_APP_STAGE === 'production'
  ? prod
  : dev;

export default config