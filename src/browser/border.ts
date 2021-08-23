import { LayerNode, MetaLayerNode, WithRef } from '../types';
import { capitalize, getRgb } from '../utils';

export const getBorder = (
    computedStyle: CSSStyleDeclaration
) => {
    if (!computedStyle.border) {
        return;
    }
    const parsed = computedStyle.border.match(/^([\d\.]+)px\s*(\w+)\s*(.*)$/);
    if (!parsed) return;

    let [_match, width, type, color] = parsed;

    if (width && width !== '0' && type !== 'none' && color) {
        const rgb = getRgb(color);
        if (!rgb) return;

        return {
            strokes: [
                {
                    type: 'SOLID',
                    color: {
                        r: rgb.r,
                        b: rgb.b,
                        g: rgb.g,
                    },
                    opacity: rgb.a || 1,
                },
            ],
            strokeWeight: Math.round(parseFloat(width)),
        };
    }
};

export const getBorderPin = (
    rect: ClientRect,
    computedStyle: CSSStyleDeclaration
) => {
    const directions = ['top', 'left', 'right', 'bottom'];
    const layers = [];

    for (const dir of directions) {
        const computed = computedStyle[('border' + capitalize(dir)) as any];
        if (!computed) {
            continue;
        }

        const parsed = computed.match(/^([\d\.]+)px\s*(\w+)\s*(.*)$/);
        if (!parsed) continue;

        let [_match, borderWidth, type, color] = parsed;
        if (borderWidth && borderWidth !== '0' && type !== 'none' && color) {
            const rgb = getRgb(color);
            if (rgb) {
                const width = ['top', 'bottom'].includes(dir)
                    ? rect.width
                    : parseFloat(borderWidth);
                const height = ['left', 'right'].includes(dir)
                    ? rect.height
                    : parseFloat(borderWidth);
                layers.push({
                    type: 'RECTANGLE',
                    x:
                        dir === 'left'
                            ? rect.left
                            : dir === 'right'
                            ? rect.right - width
                            : rect.left,
                    y:
                        dir === 'top'
                            ? rect.top - height
                            : dir === 'bottom'
                            ? rect.bottom
                            : rect.top,
                    width,
                    height,
                    children: [],
                    fills: [
                        {
                            type: 'SOLID',
                            color: {
                                r: rgb.r,
                                b: rgb.b,
                                g: rgb.g,
                            },
                            opacity: rgb.a || 1,
                        } as SolidPaint,
                    ] as any,
                } as MetaLayerNode);
            }
        }
    }
    if (!layers.length) return;
    // return layers;
    return [{
        type: 'FRAME',
        clipsContent: false,
        name: '::borders',
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        children: layers,
        // @ts-expect-error
        fills: []
    }] as MetaLayerNode[];
};
