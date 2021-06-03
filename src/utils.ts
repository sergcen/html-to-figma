import { LayerNode, Unit } from "./types";

export const hasChildren = (node: LayerNode): node is ChildrenMixin =>
    node && Array.isArray((node as ChildrenMixin).children);


export async function traverse(
    layer: LayerNode,
    cb: (layer: LayerNode, parent: LayerNode | null) => void,
    parent: LayerNode | null = null
) {
    if (layer) {
        await cb(layer, parent);
    }

    if (hasChildren(layer)) {
        for (const child of layer.children as LayerNode[]) {
            await traverse(child, cb, layer);
        }
    }
}

export function size(obj: object) {
    return Object.keys(obj).length;
}

export function getRgb(colorString?: string | null) {
    if (!colorString) {
        return null;
    }
    const [_1, r, g, b, _2, a] = (colorString!.match(
        /rgba?\(([\d\.]+), ([\d\.]+), ([\d\.]+)(, ([\d\.]+))?\)/
    )! || []) as string[];

    const none = a && parseFloat(a) === 0;

    if (r && g && b && !none) {
        return {
            r: parseInt(r) / 255,
            g: parseInt(g) / 255,
            b: parseInt(b) / 255,
            a: a ? parseFloat(a) : 1,
        };
    }
    return null;
}

export const fastClone = (data: any) =>
    typeof data === "symbol" ? null : JSON.parse(JSON.stringify(data));

export const parseUnits = (str?: string | null): null | Unit => {
    if (!str) {
        return null;
    }
    const match = str.match(/([\d\.]+)px/);
    const val = match && match[1];
    if (val) {
        return {
            unit: "PIXELS",
            value: parseFloat(val),
        };
    }
    return null;
};

export function getImageFills(layer: RectangleNode | TextNode) {
    const images =
        Array.isArray(layer.fills) &&
        layer.fills.filter((item) => item.type === 'IMAGE');
    return images;
}
