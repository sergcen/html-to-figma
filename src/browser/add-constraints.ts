import { LayerNode, MetaLayerNode } from '../types';
import { traverse } from '../utils';
import { context } from './utils';

function setData(node: any, key: string, value: string) {
    if (!(node as any).data) {
        (node as any).data = {};
    }
    (node as any).data[key] = value;
}

export const addConstraintToLayer = (layer: MetaLayerNode, elem?: HTMLElement, pseudo?: string) => {
    // @ts-expect-error
    const { getComputedStyle, HTMLElement } = context.window;
    
    if (layer.type === 'SVG') {
        layer.constraints = {
            horizontal: 'CENTER',
            vertical: 'MIN',
        };

        return;
    }

    if (!elem) {
        layer.constraints = {
            horizontal: 'SCALE',
            vertical: 'MIN',
        };
        return;
    }

    const el =
        elem instanceof HTMLElement ? elem : elem.parentElement;
    const parent = el && el.parentElement;
    if (!el || !parent) return;

    const currentDisplay = el.style.display;
    // TODO
    // правильно посчитать фиксированную ширину и высоту
    el.style.setProperty('display', 'none', '!important');
    let computed = getComputedStyle(el, pseudo);
    const hasFixedWidth =
        computed.width && computed.width.trim().endsWith('px');
    const hasFixedHeight =
        computed.height && computed.height.trim().endsWith('px');
    el.style.display = currentDisplay;
    // TODO END 
    const parentStyle = getComputedStyle(parent);
    let hasAutoMarginLeft = computed.marginLeft === 'auto';
    let hasAutoMarginRight = computed.marginRight === 'auto';
    let hasAutoMarginTop = computed.marginTop === 'auto';
    let hasAutoMarginBottom = computed.marginBottom === 'auto';

    computed = getComputedStyle(el, pseudo);

    if (['absolute', 'fixed'].includes(computed.position!)) {
        setData(layer, 'position', computed.position!);
    }

    if (hasFixedHeight) {
        setData(layer, 'heightType', 'fixed');
    }
    if (hasFixedWidth) {
        setData(layer, 'widthType', 'fixed');
    }

    const isInline = computed.display && computed.display.includes('inline');

    if (isInline) {
        const parentTextAlign = parentStyle.textAlign;
        if (parentTextAlign === 'center') {
            hasAutoMarginLeft = true;
            hasAutoMarginRight = true;
        } else if (parentTextAlign === 'right') {
            hasAutoMarginLeft = true;
        }

        if (computed.verticalAlign === 'middle') {
            hasAutoMarginTop = true;
            hasAutoMarginBottom = true;
        } else if (computed.verticalAlign === 'bottom') {
            hasAutoMarginTop = true;
            hasAutoMarginBottom = false;
        }

        setData(layer, 'widthType', 'shrink');
    }
    const parentJustifyContent =
        parentStyle.display === 'flex' &&
        ((parentStyle.flexDirection === 'row' && parentStyle.justifyContent) ||
            (parentStyle.flexDirection === 'column' && parentStyle.alignItems));

    if (parentJustifyContent === 'center') {
        hasAutoMarginLeft = true;
        hasAutoMarginRight = true;
    } else if (
        parentJustifyContent &&
        (parentJustifyContent.includes('end') ||
            parentJustifyContent.includes('right'))
    ) {
        hasAutoMarginLeft = true;
        hasAutoMarginRight = false;
    }

    const parentAlignItems =
        parentStyle.display === 'flex' &&
        ((parentStyle.flexDirection === 'column' &&
            parentStyle.justifyContent) ||
            (parentStyle.flexDirection === 'row' && parentStyle.alignItems));
    if (parentAlignItems === 'center') {
        hasAutoMarginTop = true;
        hasAutoMarginBottom = true;
    } else if (
        parentAlignItems &&
        (parentAlignItems.includes('end') ||
            parentAlignItems.includes('bottom'))
    ) {
        hasAutoMarginTop = true;
        hasAutoMarginBottom = false;
    }

    if (layer.type === 'TEXT') {
        if (computed.textAlign === 'center') {
            hasAutoMarginLeft = true;
            hasAutoMarginRight = true;
        } else if (computed.textAlign === 'right') {
            hasAutoMarginLeft = true;
            hasAutoMarginRight = false;
        }
    }

    layer.constraints = {
        horizontal:
            hasAutoMarginLeft && hasAutoMarginRight
                ? 'CENTER'
                : hasAutoMarginLeft
                ? 'MAX'
                : 'SCALE',
        vertical:
            hasAutoMarginBottom && hasAutoMarginTop
                ? 'CENTER'
                : hasAutoMarginTop
                ? 'MAX'
                : 'MIN',
    };
};

// export function addConstraints(layers: LayerNode[]) {
//     layers.forEach((layer) => {
//         traverse(layer, (child) => {
//             addConstraintToLayer(child);
//         });
//     });
// }
