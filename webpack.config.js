import path from 'path';

const dev = {
    entry: './src/ticoview.js',
    mode: 'development',
    devtool: 'source-map',
    output: {
        filename: 'tv.js',
        library: 'tv',
        libraryTarget: 'umd',
        path: path.resolve(import.meta.dirname, 'dist')
    }
}

const production = {
    entry: './src/ticoview.js',
    mode: 'production',
    output: {
        filename: 'tv.min.js',
        library: 'tv',
        libraryTarget: 'umd',
        path: path.resolve(import.meta.dirname, 'dist')
    }
}

export default [dev, production]