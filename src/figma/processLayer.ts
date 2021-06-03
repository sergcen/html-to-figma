import { getImageFills } from "../utils";
import { processImages } from "./images";
import { getMatchingFont } from "./getFont";
import { assign } from "./helpers";
import { LayerNode } from "../types";

const processDefaultElement = (
    layer: LayerNode,
    node: SceneNode
): SceneNode => {
    node.x = layer.x as number;
    node.y = layer.y as number;
    node.resize(layer.width || 1, layer.height || 1);
    assign(node, layer);
    // rects.push(frame);
    return node;
};

const createNodeFromLayer = (layer: LayerNode) => {
    if (layer.type === 'FRAME' || layer.type === 'GROUP') {
        return figma.createFrame();
    }

    if (layer.type === 'SVG' && layer.svg) {
        return figma.createNodeFromSvg(layer.svg);
    }

    if (layer.type === 'RECTANGLE') {
        return figma.createRectangle();
    }

    if (layer.type === 'TEXT') {
        return figma.createText();
    }
};

const SIMPLE_TYPES = ['FRAME', 'GROUP', 'SVG', 'RECTANGLE'];

export const processLayer = async (
    layer: LayerNode,
    parent: LayerNode | null,
    baseFrame: PageNode | FrameNode
) => {
    const parentFrame = (parent?.ref as FrameNode) || baseFrame;

    if (typeof layer.x !== 'number' || typeof layer.y !== 'number') {
        throw Error('Layer coords not defined');
    }

    const node = createNodeFromLayer(layer);

    if (!node) {
        throw Error(`${layer.type} not implemented`);
    }

    if (SIMPLE_TYPES.includes(layer.type as string)) {
        parentFrame.appendChild(processDefaultElement(layer, node));
    }
    layer.ref = node;

    if (layer.type === 'RECTANGLE') {
        if (getImageFills(layer as RectangleNode)) {
            await processImages(layer as RectangleNode);
        }
    }

    if (layer.type === 'TEXT') {
        const text = node as TextNode;

        if (layer.fontFamily) {
            text.fontName = await getMatchingFont(layer.fontFamily);

            delete layer.fontFamily;
        }

        assign(text, layer);
        text.resize(layer.width || 1, layer.height || 1);

        text.textAutoResize = 'HEIGHT';

        const lineHeight = layer.lineHeight ?
            // @ts-expect-error
            layer.lineHeight?.value : 
            layer.height;
        
        let adjustments = 0;

        // Adjust text size
        while (
            typeof text.fontSize === 'number' &&
            typeof layer.fontSize === 'number' &&
            (text.height > Math.max(layer.height as number, lineHeight) * 1.2 ||
                text.width > (layer.width as number) * 1.2)
        ) {
            // Don't allow changing more than ~30%
            if (adjustments++ > layer.fontSize * 0.3) {
                console.warn('Too many font adjustments', text, layer);
                // debugger
                break;
            }
            try {
                text.fontSize = text.fontSize - 1;
            } catch (err) {
                console.warn('Error on resize text:', layer, text, err);
            }
        }
        parentFrame.appendChild(text);
    }

    return node;
};
