const path = require('path');
const JSZip = require('jszip');

const { readFile } = require('./util/files');
const Errors = require('./errors');

const RENDERERS = {
    'xlsx': require('./templaters/xlsx'),
    // 'docx': require('./lib/docx'),
};

/* IDEAS
 *
 * parser function has signature like function(property, { scope, cache }, callback)
 * - can return a promise instead of callback
 * - cache is a Map() object you can use to store things so you don't have to re-fetch/evaluate them
 */

class Templater {
    constructor(parser, {
        tagFinder = /\[\[(.*?[^\\])\]\]/g,
    }) {
        this.parser = parser;
        this.tagFinder = tagFinder;
    }

    async render(src, type) {
        if (!src) throw new Error('File argument is required');

        const source = typeof src === 'string' ? await readFile(src) : src;
        if (!type) {
            if (typeof src === 'string') type = path.extname(src).substring(1);
            else throw new Error('Type argument is required when not passing a filepath');
        }

        const zip = await JSZip.loadAsync(source);
        if (!Object.keys(RENDERERS).includes(type)) throw new Error('Filetype not supported');
        const renderer = new RENDERERS[type](zip, this);

        await renderer.render();
    }
}

module.exports = {
    Templater,
    Errors,

    block: {
        open: (block, data) => {
            return { type: 'block:open', block, data };
        },
        close: (block) => {
            return { type: 'block:close', block };
        },
    },
    data: (data) => {
        return { type: 'data', data };
    },
};
