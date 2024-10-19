const mainBundle = {
    entry: './src/ticoview.js',
    mode: 'development',
    devtool: 'source-map',
    output: {
        filename: 'animator.js',
        path: path.resolve(__dirname, 'public', 'js')
    }
}