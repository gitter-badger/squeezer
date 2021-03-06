const path              = require('path');
const fs                = require('fs');

const babelRC = JSON.parse(fs.readFileSync(`${__dirname}/../../.babelrc`, 'utf8'));

module.exports = {
  context: path.join(__dirname),
  devtool   : 'source-map',
  target    : 'web',
  module    : {
    loaders : [
      {
        test    : /\.js$/,
        exclude : /(node_modules)/,
        loader  : 'babel-loader',
        query   : {
          presets : babelRC.presets,
          cacheDirectory : true,
          compact: true
        }
      },
      {
        test   : /\.json$/,
        loader : 'json-loader'
      },
      {
        test    : /\.yaml$/,
        include : path.resolve('data'),
        loader  : 'yaml'
      },
      {
        test    : /\.pug$/,
        loader  : 'pug-loader'
      }
    ]
  },
  plugins   : [
  ]
};
