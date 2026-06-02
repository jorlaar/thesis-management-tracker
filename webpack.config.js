const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const nodeExternals = require('webpack-node-externals');
const NodemonPlugin = require('nodemon-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV,
  externals: nodeExternals({
      allowlist: ['uuid']
  }),
  target: 'node',
  context: path.resolve(__dirname, 'src'),
  entry: {
    'server/index': './server/index.ts',
    'server/workers/index': './server/workers/index.ts',
    'render': './render.ts'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist')
  },
  resolve: {
    plugins: [new TsconfigPathsPlugin()],
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts?$/,
        loader: 'ts-loader'
      }
    ]
  },
  plugins: [
    new NodemonPlugin({
      stdin: false
    })
  ],
  experiments: {
    topLevelAwait: true
  },
  optimization: {
    minimize: true,
    nodeEnv: false,
    minimizer: [
      new TerserPlugin({
        include: /\.ts($|\?)/i,
        exclude: /\.controller\.ts/i,
        minify: TerserPlugin.terserMinify,
        parallel: 4
      })
    ]
  }
};
