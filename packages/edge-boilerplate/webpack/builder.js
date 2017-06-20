import path from "path"
import fs from "fs"
import webpack from "webpack"
import ExtractCssChunks from "extract-css-chunks-webpack-plugin"
import StatsPlugin from "stats-webpack-plugin"

const defaults = {
  target: "client",
  env: process.env.NODE_ENV,
  verbose: false
}

export default function builder(options = {})
{
  const config = { ...defaults, ...options }

  const isServer = config.target === "server"
  const isClient = config.target === "client"

  const isDevelopment = config.env === "development"
  const isProduction = config.env === "production"

  console.log(`Edge Webpack: Generate Config for: ${config.target}@${config.env}`)

  const name = isServer ? "server" : "client"
  const target = isServer ? "node" : "web"
  const devtool = "source-map"

  const nodeModules = path.resolve(__dirname, "../node_modules")

  // if you're specifying externals to leave unbundled, you need to tell Webpack
  // to still bundle `react-universal-component`, `webpack-flush-chunks` and
  // `require-universal-module` so that they know they are running
  // within Webpack and can properly make connections to client modules:
  const serverExternals = fs
    .readdirSync(nodeModules)
    .filter((x) => !(/\.bin|react-universal-component|require-universal-module|webpack-flush-chunks/).test(x))
    .reduce(
      (externals, request) => {
        externals[request] = `commonjs ${request}`
        return externals
      },
      {},
    )



  return {
    name,
    target,
    devtool,
    externals: isServer ? serverExternals : undefined,

    entry: [
      isClient && isDevelopment ? "webpack-hot-middleware/client?path=/__webpack_hmr&timeout=20000&reload=false&quiet=false&noInfo=false" : null,
      isClient ? path.resolve(__dirname, "../src/index.js") : path.resolve(__dirname, "../server/render.js")
    ].filter(Boolean),

    output: {
      libraryTarget: isServer ? "commonjs2" : "var",
      filename: isDevelopment || isServer ? "[name].js" : "[name].[chunkhash].js",
      path: isServer ? path.resolve(__dirname, "../build/server") : path.resolve(__dirname, "../build/client"),
      publicPath: "/static/"
    },

    module: {
      rules: [
        // References to images, fonts, movies, music, etc.
        {
          test: /\.(eot|woff|woff2|ttf|otf|svg|png|jpg|jpeg|jp2|jpx|jxr|gif|webp|mp4|mp3|ogg|pdf|html)$/,
          loader: "file-loader",
          options: {
            name: "[name].[ext]",
            emitFile: isClient
          }
        },
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: "babel-loader"
        },

        {
          test: /\.css$/,
          use: isClient ? ExtractCssChunks.extract({
            use: [
              {
                loader: "css-loader",
                options: {
                  modules: true,
                  localIdentName: "[local]-[hash:base62:8]",
                  import: false,
                  minimize: false
                }
              },
              {
                loader: "postcss-loader",
                query:
                {
                  sourceMap: true
                }
              }
            ]
          }) : [
            {
              loader: "css-loader/locals",
              options: {
                modules: true,
                localIdentName: "[local]-[hash:base62:8]",
                import: false,
                minimize: false
              }
            },
            {
              loader: "postcss-loader",
              query:
              {
                sourceMap: true
              }
            }
          ]
        }
      ]
    },

    plugins: [
      isProduction && isClient ? new StatsPlugin("stats.json") : null,

      isProduction ? new webpack.HashedModuleIdsPlugin() : null,
      isDevelopment ? new webpack.NamedModulesPlugin() : null,

      isClient ? new ExtractCssChunks() : null,
      isServer ? new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 }) : null,

      // only needed when server built with webpack
      isClient ? new webpack.optimize.CommonsChunkPlugin({
        names: [ "bootstrap" ],

        // needed to put webpack bootstrap code before chunks
        //
        filename: isProduction ? "[name].[contenthash].js" : "[name].js",
        minChunks: Infinity
      }) : null,

      isClient ? new webpack.HotModuleReplacementPlugin() : null,
      isClient && isDevelopment ? new webpack.NoEmitOnErrorsPlugin() : null,

      new webpack.DefinePlugin({
        "process.env": {
          NODE_ENV: JSON.stringify(options.env)
        }
      })
    ].filter(Boolean)
  }
}