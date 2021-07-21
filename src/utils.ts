import { LayerNode, Unit } from './types';

export const hasChildren = (node: LayerNode): node is ChildrenMixin =>
    node && Array.isArray((node as ChildrenMixin).children);

export function traverse(
    layer: LayerNode,
    cb: (layer: LayerNode, parent: LayerNode | null) => void,
    parent: LayerNode | null = null
) {
    if (layer) {
        cb(layer, parent);
        if (hasChildren(layer)) {
            layer.children.forEach((child) =>
                traverse(child as LayerNode, cb, layer)
            );
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
    typeof data === 'symbol' ? null : JSON.parse(JSON.stringify(data));

export const toNum = (v: string): number => {
    // if (!/px$/.test(v) && v !== '0') return v;
    if (!/px$/.test(v) && v !== '0') return 0;
    const n = parseFloat(v);
    // return !isNaN(n) ? n : v;
    return !isNaN(n) ? n : 0;
};

export const parseUnits = (str?: string | null): null | Unit => {
    if (!str) {
        return null;
    }
    const value = toNum(str);
    // const match = str.match(/([\d\.]+)px/);
    // const val = match && match[1];
    if (value) {
        return {
            unit: 'PIXELS',
            value,
        };
    }
    return null;
};

const LENGTH_REG = /^[0-9]+[a-zA-Z%]+?$/;

const isLength = (v: string) => v === '0' || LENGTH_REG.test(v);

interface ParsedBoxShadow {
    inset: boolean;
    offsetX: number;
    offsetY: number;
    blurRadius: number;
    spreadRadius: number;
    color: string;
}

export const parseValue = (str: string): ParsedBoxShadow => {
    // TODO: this is broken for multiple box shadows
    if (str.startsWith('rgb')) {
        // Werid computed style thing that puts the color in the front not back
        const colorMatch = str.match(/(rgba?\(.+?\))(.+)/);
        if (colorMatch) {
            str = (colorMatch[2] + ' ' + colorMatch[1]).trim();
        }
    }

    const PARTS_REG = /\s(?![^(]*\))/;
    const parts = str.split(PARTS_REG);
    const inset = parts.includes('inset');
    const last = parts.slice(-1)[0];
    const color = !isLength(last) ? last : 'rgba(0, 0, 0, 1)';

    const nums = parts
        .filter((n) => n !== 'inset')
        .filter((n) => n !== color)
        .map(toNum);

    const [offsetX, offsetY, blurRadius, spreadRadius] = nums;

    return {
        inset,
        offsetX,
        offsetY,
        blurRadius,
        spreadRadius,
        color,
    };
};

export function getImageFills(layer: RectangleNode | TextNode) {
    const images =
        Array.isArray(layer.fills) &&
        layer.fills.filter((item) => item.type === 'IMAGE');
    return images;
}
