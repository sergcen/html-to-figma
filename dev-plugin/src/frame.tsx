import * as monaco from 'monaco-editor';
import { htmlToFigma, setContext } from '../../src/browser';
import throttle from 'lodash.throttle';
import { LayerNode } from '../../src/types';

const sendToFigma = (layers: LayerNode) => {
    window.parent.postMessage(
        {
            pluginMessage: {
                type: 'import',
                data: {
                    layers,
                },
            },
        },
        '*'
    );
}

// @ts-ignore
self.MonacoEnvironment = {
    // @ts-ignore
    getWorkerUrl: function (moduleId, label) {
        if (label === 'json') {
            return './json.worker.js';
        }
        if (label === 'css' || label === 'scss' || label === 'less') {
            return './css.worker.js';
        }
        if (label === 'html' || label === 'handlebars' || label === 'razor') {
            return './html.worker.js';
        }
        if (label === 'typescript' || label === 'javascript') {
            return './ts.worker.js';
        }
        return './editor.worker.js';
    },
};

document.addEventListener('DOMContentLoaded', function () {
    const editor = monaco.editor.create(
        document.getElementById('editor-container') as HTMLElement,
        {
            value: `
<html>
    <style>
        .button { 
            background: #fc0;
            padding: 10px;
            border: 0;
            border-radius: 4px;
        }
    </style>
    <body>
        <div id="container">
            <button class="button">TEST</button>
        </div>
    </body>
</html>
`.trim(),
            language: 'html',
        }
    );

    const frame = document.getElementById(
        'iframe-sandbox'
    ) as HTMLIFrameElement;

    if (!frame || !frame.contentWindow) return;

    const updateFigma = throttle(async () => {
        setContext(frame.contentWindow as Window);
        //@ts-ignore
        const res = await htmlToFigma('#container');


        // frame.contentWindow.htmlToFigma = htmlToFigma;
        //@ts-ignore
        // const res = await frame.contentWindow.eval(`(${htmlToFigma.toString()})()`);
        console.log(res);
        sendToFigma(res);
    }, 500);

    const updateSandbox = async () => {
        frame.srcdoc = editor.getValue();
        setTimeout(updateFigma, 500);
        // updateFigma();
    };

    editor.onDidChangeModelContent((e) => {
        updateSandbox();
    });

    setTimeout(updateSandbox, 500);
});
