import { LayerNode } from '../types';
import { traverse } from '../utils';
import { processLayer } from './processLayer';

interface LayerCbArgs {
    node: SceneNode;
    layer: LayerNode;
    parent: LayerNode | null;
}

export async function addLayersToFrame(
    layers: LayerNode[],
    baseFrame: PageNode | FrameNode,
    onLayerProcess?: (args: LayerCbArgs) => void
) {
    for (const rootLayer of layers) {
        await traverse(rootLayer, async (layer, parent) => {
            try {
                const node = await processLayer(layer, parent, baseFrame);

                onLayerProcess?.({ node, layer, parent });
            } catch (err) {
                console.warn('Error on layer:', layer, err);
            }
        });
    }
}

export * from './getFont';