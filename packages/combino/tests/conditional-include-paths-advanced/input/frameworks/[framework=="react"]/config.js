module.exports = {
    framework: 'react',
    language: 'javascript',
    features: ['ui', 'routing', 'state-management'],
    build: {
        target: 'es2020',
        minify: true,
        sourcemap: true
    },
    dev: {
        port: 3000,
        hot: true
    }
};
