import { makeTree, removeRefs } from './build-tree';
import { getShadowEls } from './dom-utils';
import { elementToFigma } from './element-to-figma';
import { LayerNode, WithRef } from '../types';
import { textToFigma } from './text-to-figma';
import { addConstraints } from './add-constraints';
import { context } from './utils';

export function htmlToFigma(
    selector: HTMLElement | string = 'body',
    useFrames = true,
    time = false
) {
    // @ts-expect-error
    const { HTMLElement } = context.window;
    if (time) {
        console.time('Parse dom');
    }

    let layers: LayerNode[] = [];
    const el =
        selector instanceof HTMLElement
            ? selector as HTMLElement
            : context.document.querySelector(selector as string || 'body');

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

    const els = (Array.from(el.querySelectorAll('*')) as Element[]).reduce(
        (memo, el) => {
            memo.push(el);
            memo.push(...getShadowEls(el));

            return memo;
        },
        [] as Element[]
    );

    if (els) {
        layers = Array.from(els)
            .map((el) => elementToFigma(el))
            .flat()
            .filter(Boolean) as LayerNode[];
        console.log(layers);
    }

    layers.push(...textToFigma(el));

    // TODO: send frame: { children: []}
    const root = {
        type: 'FRAME',
        width: Math.round(window.innerWidth),
        height: Math.round(context.document.documentElement.scrollHeight),
        x: 0,
        y: 0,
        ref: context.document.body,
    } as WithRef<FrameNode>;

    layers.unshift(root);

    // TODO: arg can be passed in
    const MAKE_TREE = useFrames;
    if (MAKE_TREE) {
        (root as any).children = layers.slice(1);
        makeTree(layers, root);
        addConstraints([root]);
        removeRefs([root], root);
        if (time) {
            console.info('\n');
            console.timeEnd('Parse dom');
        }
        return [root];
    }

    removeRefs(layers, root);

    if (time) {
        console.info('\n');
        console.timeEnd('Parse dom');
    }

    return layers;
}
