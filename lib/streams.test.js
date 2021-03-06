const {
    ChunkSplitter,
    InputStream,
    OutputWatcher,

    testTransformStreams,
} = require('../test/streams');

module.exports = function({
    XMLTagReplacer,
    awaitStreamEvent,
    end,
    finish,
}) {
    describe('XMLTagReplacer', function() {
        it('should find an xml tag and replace it', function() {
            testTransformStreams([XMLTagReplacer('foo', 'REPLACED')],
                '<foo>contents</foo>',
                'REPLACED');
            testTransformStreams([XMLTagReplacer('foo', 'REPLACED')],
                '<bar><foo>contents</foo></bar>',
                '<bar>REPLACED</bar>');
            testTransformStreams([XMLTagReplacer('foo', 'REPLACED')],
                '<foo><bar>contents</bar></foo>',
                'REPLACED');
        });
        it('should only replace the tag\'s contents if contentsOnly:true', function() {
            testTransformStreams([XMLTagReplacer('foo', 'REPLACED', { contentsOnly: true })],
                '<foo>contents</foo>',
                '<foo>REPLACED</foo>');
            testTransformStreams([XMLTagReplacer('foo', 'REPLACED', { contentsOnly: true })],
                '<bar><foo>contents</foo></bar>',
                '<bar><foo>REPLACED</foo></bar>');
            testTransformStreams([XMLTagReplacer('foo', 'REPLACED', { contentsOnly: true })],
                '<foo><bar>contents</bar></foo>',
                '<foo>REPLACED</foo>');
        });
        it('should replace tags split across multiple lines', function() {
            testTransformStreams([XMLTagReplacer('foo', 'REPLACED')],
                '<foo>\ncontents\nsecond line\n</foo>',
                'REPLACED');
            testTransformStreams([XMLTagReplacer('foo', 'REPLACED', { contentsOnly: true })],
                '<foo>\ncontents\nsecond line\n</foo>',
                '<foo>REPLACED</foo>');
        });
        it('should deal with split chunks', function() {
            testTransformStreams([ChunkSplitter(1), XMLTagReplacer('foo', 'REPLACED')],
                '<foo>contents</foo>',
                'REPLACED');
            testTransformStreams([ChunkSplitter(1), XMLTagReplacer('foo', 'REPLACED', { contentsOnly: true })],
                '<foo>contents</foo>',
                '<foo>REPLACED</foo>');
        });
        it('should replace multiple tags if found', function() {
            testTransformStreams([XMLTagReplacer('foo', 'REPLACED')],
                '<bar><foo>contents 1</foo></bar>\n<foo>contents 2</foo><foo>contents 3</foo>',
                '<bar>REPLACED</bar>\nREPLACEDREPLACED');
            testTransformStreams([XMLTagReplacer('foo', 'REPLACED', { contentsOnly: true })],
                '<bar><foo>contents 1</foo></bar>\n<foo>contents 2</foo><foo>contents 3</foo>',
                '<bar><foo>REPLACED</foo></bar>\n<foo>REPLACED</foo><foo>REPLACED</foo>');
        });
        it('should deal with self-closing tags', function() {
            testTransformStreams([XMLTagReplacer('foo', 'REPLACED')],
                '<foo />',
                'REPLACED');
            testTransformStreams([XMLTagReplacer('foo', 'REPLACED', { contentsOnly: true })],
                '<foo />',
                '<foo>REPLACED</foo>');
        });
    });

    describe('awaitStreamEvent', function() {
        const BIG_STRING = Array.from({ length: 1e4 }, () => Math.random()).join('foo');

        it('should resolve once the specified event is emitted by the stream', async function() {
            const readable = InputStream(BIG_STRING)
                .on('data', () => {});
            const writable = InputStream(BIG_STRING)
                .pipe(OutputWatcher());

            await Promise.all([
                awaitStreamEvent('end')(readable),
                awaitStreamEvent('finish')(writable),
            ]);
        });
        it('should reject if the stream emits an error', function(done) {
            const error = new Error('HALT YOU FOOL');
            const stream = InputStream('<foo>bar</foo>');
            awaitStreamEvent('finish')(stream).then(
                () => done('Resolved despite stream error'),
                (err) => err === error ? done() : done(err),
            );
            stream.emit('error', error);
        });
    });
};
