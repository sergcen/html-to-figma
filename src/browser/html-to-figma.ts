import { elementToFigma } from './element-to-figma';
import { LayerNode, MetaLayerNode, PlainLayerNode, WithMeta } from '../types';
import { addConstraintToLayer } from './add-constraints';
import { context } from './utils';
import { traverse, traverseMap } from '../utils';
import { ElemTypes, isElemType } from './dom-utils';

const removeMeta = (layerWithMeta: WithMeta<LayerNode>): LayerNode | undefined => {
    const {
        textValue,
        before,
        after,
        borders,
        ref,
        type,
        zIndex,
        ...rest
    } = layerWithMeta;
    
    if (!type) return;

    return { type, ...rest } as PlainLayerNode;
}

const mapDOM = (root: Element): LayerNode => {
    const elems: WithMeta<LayerNode>[] = [];
    const walk = context.document.createTreeWalker(
        root,
        NodeFilter.SHOW_ALL,
        null,
        false
    );
    const refs = new Map<Element, MetaLayerNode[]>();

    let n: Node | null = walk.currentNode;
    
    do {
        if (!n.parentElement) continue;
        const figmaEl = elementToFigma(n as Element);

        if (figmaEl) {
            addConstraintToLayer(figmaEl, n as HTMLElement);

            const children = refs.get(n.parentElement) || [];
            refs.set(n.parentElement, [...children, figmaEl]);
            elems.push(figmaEl as WithMeta<LayerNode>);
        }
    } while (n = walk.nextNode());
    
    const result = elems[0];

    for (let i = 0;i < elems.length; i++) {
        const elem = elems[i];
        if (elem.type !== 'FRAME') continue;

        elem.children = elem.children || [];

        elem.before && elem.children.push(elem.before);

        const children = refs.get(elem.ref as Element) || [];

        children && elem.children.push(...children);
        // elements with text
        if (!elem.textValue) {
            elem.children = elem.children.filter(Boolean);
        } else {
            elem.children = [elem.textValue];
        }
        // extends elements for show complex borders
        if (elem.borders) {
            elem.children = elem.children.concat(elem.borders);
        }
        elem.after && elem.children.push(elem.after);

        elem.children.sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
    }

    // @ts-expect-error
    const layersWithoutMeta = traverseMap<WithMeta<LayerNode>>(result, (layer) => {
        return removeMeta(layer);
    }) as LayerNode;
    // Update all positions and clean
    traverse(layersWithoutMeta, (layer) => {
        if (layer.type === 'FRAME' || layer.type === 'GROUP') {
            const { x, y } = layer;
            if (x || y) {
                traverse(layer, (child) => {
                    if (child === layer) {
                        return;
                    }
                    child.x = child.x! - x!;
                    child.y = child.y! - y!;
                });
            }
        }
    });

    return layersWithoutMeta;
}

export function htmlToFigma(
    selector: HTMLElement | string = 'body',
) {

    let layers: LayerNode[] = [];
    const el =
        isElemType(selector as HTMLElement, ElemTypes.Element)
            ? selector as HTMLElement
            : context.document.querySelectorAll(selector as string || 'body')[0];

    if (!el) {
        throw Error(`Element not found`);
    }

    // Process SVG <use> elements
    for (const use of Array.from(
        el.querySelectorAll('use')
    ) as SVGUseElement[]) {
        try {
            const symbolSelector = use.href.baseVal;
            const symbol: SVGSymbolElement | null =
                context.document.querySelector(symbolSelector);
            if (symbol) {
                use.outerHTML = symbol.innerHTML;
            }
        } catch (err) {
            console.warn('Error querying <use> tag href', err);
        }
    }

    // const els = (Array.from(el.querySelectorAll('*')) as Element[]).reduce(
    //     (memo, el) => {
    //         memo.push(el);
    //         memo.push(...getShadowEls(el));

    //         return memo;
    //     },
    //     [] as Element[]
    // );
    const data = mapDOM(el);

    return data ? data : [];
}
