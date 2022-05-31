// eslint-disable-next-line @typescript-eslint/no-var-requires
const { override, addBabelPlugin, addWebpackAlias } = require('customize-cra')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path')
module.exports = override(
  addBabelPlugin([
    'babel-plugin-root-import',
    {
      rootPathSuffix: 'src',
      rootPathPrefix: '~',
    },
  ]),
  // fix:https://github.com/facebook/react/issues/13991
  // problem:hooks can only be called inside the body of a function component,
  /*
   i tried to npm link a package i'm creating. It throws that same error since the other package is also using hooks but with its own React. 
   I had to publish my package to NPM and then import it directly from NPM. 
   That way the error was gone, but i hope this is fixed since publishing a package without testing it is bad, obviously
  */
  // reason:Maybe detect that the app has multiple instances of React and say that it may be the reason of bugs.
  // resolve:add below code
  addWebpackAlias({
    react: path.resolve('./node_modules/react'),
  })
)


module.exports = function override(config, env) {
  //do stuff with the webpack config...

  // config.resolve = {
  //   alias: {
  //     react: path.resolve('./node_modules/react'),
  //   },
  // }
  console.log('config', env)
  return config
}
