const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const SVGIcons2SVGFont = require('svgicons2svgfont');
const ttf2eot = require('ttf2eot');
const svg2ttf = require('svg2ttf');
const ttf2woff = require('ttf2woff');
require('colors-cli/toxic');

let unicodeObj = {};
// Unicode Private Use Area start.
// https://en.wikipedia.org/wiki/Private_Use_Areas
let startUnicode = 0xea01;

/*
 * Get icon unicode
 * @return {Array} unicode array
 */
function getIconUnicode(name) {
    let unicode = String.fromCharCode(startUnicode++);
    unicodeObj[name] = unicode;
    return [unicode];
}
/*
 * Filter svg files
 * @return {Array} svg files
 */
function filterSvgFiles(svgFolderPath) {
    let files = fs.readdirSync(svgFolderPath, 'utf-8');
    let svgArr = [];
    if (!files) {
        throw new Error(`Error! Svg folder is empty.${svgFolderPath}`);
    }

    for (let i in files) {
        if (typeof files[i] !== 'string' || path.extname(files[i]) !== '.svg') continue;
        if (!~svgArr.indexOf(files[i])) {
            svgArr.push(path.join(svgFolderPath, files[i]));
        }
    }
    return svgArr;
}
/**
 * SVG to SVG font
 */
exports.createSVG = options => {
    number = options.unicodeStart;
    return new Promise((resolve, reject) => {
        // init
        const fontStream = new SVGIcons2SVGFont({
            ...options.svgicons2svgfont
        });
        function writeFontStream(svgPath) {
            // file name
            let _name = path.basename(svgPath, '.svg');
            const glyph = fs.createReadStream(svgPath);
            glyph.metadata = { unicode: getIconUnicode(_name), name: _name };
            fontStream.write(glyph);
        }

        const distPath = path.join(options.dist, options.fontName + '.svg');
        // Setting the font destination
        fontStream.pipe(fs.createWriteStream(distPath)).on('finish', () => {
            resolve({
                path: distPath,
                unicodes: unicodeObj,
                fileName: options.fontName + '.svg',
                size: fs.readFileSync(distPath).byteLength
            });
        }).on('error', (err) => {
            if (err) {
                console.log(err);
                reject(err);
            }
        });
        filterSvgFiles(options.src).forEach(svg => {
            if (typeof svg !== 'string') return false;
            writeFontStream(svg);
        });
        
        // Do not forget to end the stream
        fontStream.end();
    });
};

/**
 * SVG font to TTF
 */
exports.createTTF = options => {
    return new Promise((resolve, reject) => {
        options.svg2ttf = options.svg2ttf || {};
        const distPath = path.join(options.dist, options.fontName + '.ttf');
        let ttf = svg2ttf(fs.readFileSync(path.join(options.dist, options.fontName + '.svg'), 'utf8'), options.svg2ttf);
        ttf = this.ttf = new Buffer(ttf.buffer);
        fs.writeFile(distPath, ttf, err => {
            if (err) {
                return reject(err);
            }
            resolve({
                path: distPath,
                size: ttf.byteLength,
                fileName: options.fontName + '.ttf'
            });
        });
    });
};

/**
 * TTF font to EOT
 */
exports.createEOT = options => {
    return new Promise((resolve, reject) => {
        const distPath = path.join(options.dist, options.fontName + '.eot');
        const eot = new Buffer(ttf2eot(this.ttf).buffer);

        fs.writeFile(distPath, eot, err => {
            if (err) {
                return reject(err);
            }
            resolve({
                path: distPath,
                size: eot.byteLength,
                fileName: options.fontName + '.eot'
            });
        });
    });
};

/**
 * TTF font to WOFF
 */
exports.createWOFF = options => {
    return new Promise((resolve, reject) => {
        const distPath = path.join(options.dist, options.fontName + '.woff');
        const woff = new Buffer(ttf2woff(this.ttf).buffer);
        fs.writeFile(distPath, woff, err => {
            if (err) {
                return reject(err);
            }
            resolve({
                path: distPath,
                size: woff.byteLength,
                fileName: options.fontName + '.woff'
            });
        });
    });
};

/**
 * Create HTML
 */
exports.buildTemplateFile = ({ path, data = {}, options = {} }) => {
    return new Promise((resolve, reject) => {
        ejs.renderFile(path, data, options, (err, str) => {
            if (err) reject(err);
            resolve({
                data: str,
                size: str.length
            });
        });
    });
};
