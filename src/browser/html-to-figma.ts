import { addConstraints, makeTree, removeRefs } from './build-tree';
import { isHidden, textNodesUnder } from './dom-utils';
import { elementToFigma } from './element-to-figma';
import { LayerNode, WithRef } from '../types';
import { fastClone, parseUnits, getRgb } from '../utils';

export function htmlToFigma(
    selector: HTMLElement | string = 'body',
    useFrames = false,
    time = false
) {
    if (time) {
        console.time('Parse dom');
    }

    let layers: LayerNode[] = [];
    const el =
        selector instanceof HTMLElement
            ? selector
            : document.querySelector(selector || 'body');

    if (el) {
        // Process SVG <use> elements
        for (const use of Array.from(
            el.querySelectorAll('use')
        ) as SVGUseElement[]) {
            try {
                const symbolSelector = use.href.baseVal;
                const symbol: SVGSymbolElement | null =
                    document.querySelector(symbolSelector);
                if (symbol) {
                    use.outerHTML = symbol.innerHTML;
                }
            } catch (err) {
                console.warn('Error querying <use> tag href', err);
            }
        }

        const getShadowEls = (el: Element): Element[] =>
            Array.from(
                el.shadowRoot?.querySelectorAll('*') || ([] as Element[])
            ).reduce((memo, el) => {
                memo.push(el);
                memo.push(...getShadowEls(el));
                return memo;
            }, [] as Element[]);

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
        }

        const textNodes = textNodesUnder(el);

        for (const node of textNodes) {
            if (node.textContent && node.textContent.trim().length) {
                const parent = node.parentElement;
                if (parent) {
                    if (isHidden(parent)) {
                        continue;
                    }
                    const computedStyles = getComputedStyle(parent);
                    const range = document.createRange();
                    range.selectNode(node);
                    const rect = fastClone(range.getBoundingClientRect());
                    const lineHeight = parseUnits(computedStyles.lineHeight);
                    range.detach();
                    if (lineHeight && rect.height < lineHeight.value) {
                        const delta = lineHeight.value - rect.height;
                        rect.top -= delta / 2;
                        rect.height = lineHeight.value;
                    }
                    if (rect.height < 1 || rect.width < 1) {
                        continue;
                    }

                    const textNode = {
                        x: Math.round(rect.left),
                        ref: node,
                        y: Math.round(rect.top),
                        width: Math.round(rect.width),
                        height: Math.round(rect.height),
                        type: 'TEXT',
                        characters:
                            node.textContent.trim().replace(/\s+/g, ' ') || '',
                    } as WithRef<TextNode>;

                    const fills: SolidPaint[] = [];
                    const rgb = getRgb(computedStyles.color);

                    if (rgb) {
                        fills.push({
                            type: 'SOLID',
                            color: {
                                r: rgb.r,
                                g: rgb.g,
                                b: rgb.b,
                            },
                            opacity: rgb.a || 1,
                        } as SolidPaint);
                    }

                    if (fills.length) {
                        textNode.fills = fills;
                    }
                    const letterSpacing = parseUnits(
                        computedStyles.letterSpacing
                    );
                    if (letterSpacing) {
                        textNode.letterSpacing = letterSpacing;
                    }

                    if (lineHeight) {
                        textNode.lineHeight = lineHeight;
                    }

                    const { textTransform } = computedStyles;
                    switch (textTransform) {
                        case 'uppercase': {
                            textNode.textCase = 'UPPER';
                            break;
                        }
                        case 'lowercase': {
                            textNode.textCase = 'LOWER';
                            break;
                        }
                        case 'capitalize': {
                            textNode.textCase = 'TITLE';
                            break;
                        }
                    }

                    const fontSize = parseUnits(computedStyles.fontSize);
                    if (fontSize) {
                        textNode.fontSize = Math.round(fontSize.value);
                    }
                    if (computedStyles.fontFamily) {
                        // const font = computedStyles.fontFamily.split(/\s*,\s*/);
                        (textNode as any).fontFamily =
                            computedStyles.fontFamily;
                    }

                    if (computedStyles.textDecoration) {
                        if (
                            computedStyles.textDecoration === 'underline' ||
                            computedStyles.textDecoration === 'strikethrough'
                        ) {
                            textNode.textDecoration =
                                computedStyles.textDecoration.toUpperCase() as any;
                        }
                    }
                    if (computedStyles.textAlign) {
                        if (
                            ['left', 'center', 'right', 'justified'].includes(
                                computedStyles.textAlign
                            )
                        ) {
                            textNode.textAlignHorizontal =
                                computedStyles.textAlign.toUpperCase() as any;
                        }
                    }

                    layers.push(textNode);
                }
            }
        }
    }

    // TODO: send frame: { children: []}
    const root = {
        type: 'FRAME',
        width: Math.round(window.innerWidth),
        height: Math.round(document.documentElement.scrollHeight),
        x: 0,
        y: 0,
        ref: document.body,
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
