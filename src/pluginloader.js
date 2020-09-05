/*jshint esversion: 8 */
// this is so cursed

const fs = require('fs');

function pluginloader(directory) {
    const files = fs.readdirSync(`${__dirname}/${directory}/`);
    let plugins = {}
    console.log(files)
    files.map(loadplugin)
    
    function loadplugin(pluginfile) {
        if (!pluginfile.endsWith(".js"))
            return
        const pluginname = pluginfile.slice(0, -3)
        const plugin = require(`${__dirname}/${directory}/${pluginfile}`)
        plugins[pluginname] = plugin
    }

    console.log(plugins)
}

module.exports = pluginloader;