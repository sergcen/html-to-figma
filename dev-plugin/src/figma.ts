import { addLayersToFrame, defaultFont } from '../../src/figma';


//@ts-ignore
figma.showUI(__html__, {
    width: 650,
    height: 600,
});

let figmaId: string = '';

figma.ui.onmessage = async (msg) => {
    if (msg.type === 'import') {
        await figma.loadFontAsync(defaultFont);

        const { data } = msg;

        let { layers } = data;

        const name = 'SANDBOX RESULT';

        let baseFrame: PageNode | FrameNode = figma.currentPage;
        let frameRoot: SceneNode = baseFrame as any;

        let x = 0, y = 0;
        let currentNode;
        if (figmaId) {
            currentNode = figma.currentPage.findOne(n => n.id === figmaId);
            if (!currentNode) return;

            if (currentNode) {
                x = currentNode.x;
                y = currentNode.y;
            }
        }

        for (const rootLayer of layers) {
            rootLayer.x = x;
            rootLayer.y = y;
        }

        await addLayersToFrame(layers, baseFrame, ({ node, parent }) => {
            if (!parent) {
                frameRoot = node;
                figmaId = node.id;
                node.name = name;
            }
        });

        currentNode?.remove();
    }
};
