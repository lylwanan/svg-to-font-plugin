const _ = require('lodash');
const path = require('path');
const fs = require('fs-extra');
const {
    createSVG,
    createTTF,
    createEOT,
    createWOFF,
    buildTemplateFile
} = require('./util');

/**
 * 自定义的插件
 */
class SvgToFontPlugin {
    constructor(options) {
        // 获取插件的参数
        this.options = _.extend({
            svg2ttf: {},
            unicodeStart: 10000,
            fontName: 'iconfont',
            fileName: 'iconfont.css',
            htmlFileName: 'index.html',
            svgicons2svgfont: {
                fontHeight: 1000,
                normalize: true
            },
            clssaNamePrefix: 'icon',
            src: path.resolve(__dirname, './svgs'),
            dist: path.resolve(__dirname, './dist'),
            template: {
                css: path.resolve(__dirname, './template/style.ejs'),
                html: path.resolve(__dirname, './template/index.ejs')
            }
        }, options);
    }

    formatSize(size) {
        if (typeof size !== 'number' || Number.isNaN(size) === true) {
            return 'unknown size';
        }
    
        if (size <= 0) {
            return '0 bytes';
        }
    
        const abbreviations = ['bytes', 'KiB', 'MiB', 'GiB'];
        const index = Math.floor(Math.log(size) / Math.log(1024));
    
        return `${+(size / Math.pow(1024, index)).toPrecision(3)} ${
            abbreviations[index]
        }`;
    };

    printResult(file) {
        console.log(`[${file.path}]  ${file.fileName.green.bold}  ${this.formatSize(file.size)}`)
    }

    /**
     * 提供webpack对插件进行调用
     */
    apply(compiler) {
        let options = this.options;
        let cssString = [];
        let cssIconHtml = [];

        fs.emptyDirSync(options.dist);

        compiler.hooks.run.tapPromise('emit', compilation => {

            return createSVG(options)
                .then(file => {
                    this.printResult(file);
                    Object.keys(file.unicodes).forEach(name => {
                        cssIconHtml.push(name);
                        let _code = file.unicodes[name];
                        cssString.push(`.${options.clssaNamePrefix}-${name}:before { content: "\\${_code.charCodeAt(0).toString(16)}"; }\n`);
                    });
                })
                .then(() => createTTF(options))
                .then(file => {
                    this.printResult(file);
                    return createEOT(options)
                })
                .then(file => {
                    this.printResult(file);
                    return createWOFF(options);
                })
                .then(file => {
                    this.printResult(file);
                    return buildTemplateFile({
                        path: options.template.css,
                        data: {
                            fontname: options.fontName,
                            cssString: cssString.join(''),
                            timestamp: new Date().getTime(),
                            prefix: options.clssaNamePrefix || options.fontName
                        }
                    })
                })
                .then(file => {
                    let outputPath = path.resolve(options.dist, options.fileName);
                    this.printResult({
                        size: file.size,
                        path: outputPath,
                        fileName: options.fileName
                    });
                    fs.outputFileSync(outputPath, file.data)
                })
                .then(() =>
                    buildTemplateFile({
                        path: options.template.html,
                        data: {
                            prefix: options.clssaNamePrefix,
                            fontname: options.fontName,
                            link: `${options.fileName}`,
                            cssIconHtml,
                            title: options.fontName
                        }
                    })
                )
                .then(file => {
                    let outputPath = path.resolve(options.dist, options.htmlFileName);
                    this.printResult({
                        size: file.size,
                        path: outputPath,
                        fileName: options.htmlFileName
                    });
                    fs.outputFileSync(outputPath, file.data)
                })
        });
    }
}

module.exports = SvgToFontPlugin;