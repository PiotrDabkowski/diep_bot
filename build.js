require('browserify')('./src/ext.js').bundle(function (err, data) {
    if (err) {
        throw new Error(err);
    }
    let code = require('babel-core').transform(data, {'presets': require('babel-preset-es2015')}).code
    var uglify = require("uglify-js");
    let result = uglify.minify("(function() {});"+code)
    if (result.error) {
        throw result.error;
    }
    console.log(result.code);
})


