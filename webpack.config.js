const path = require('path');

module.exports = {
  entry: {
    content_script_main: './src/contentScripts/content_script_main.js',
    content_script_siolated: './src/contentScripts/content_script_siolated.js',
    devtools: './src/devtools/devtools.ts',
    panel: './src/devtools/panel.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  mode: 'development',
  devtool: 'source-map', // 禁用 eval 类型 source map
  parallelism: 16
};