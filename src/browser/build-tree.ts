import { getBoundingClientRect } from './dom-utils';
import { hasChildren, traverse } from '../utils';
import { LayerNode, WithRef } from '../types';

function getParent(layer: LayerNode, root: WithRef<FrameNode>) {
    let response: LayerNode | null = null;
    try {
        traverse(root, (child) => {
            if (
                child &&
                (child as any).children &&
                (child as any).children.includes(layer)
            ) {
                response = child;
                // Deep traverse short circuit hack
                throw 'DONE';
            }
        });
    } catch (err) {
        if (err === 'DONE') {
            // Do nothing
        } else {
            console.error(err.message);
        }
    }
    return response;
}

function getParents(node: Element | Node): Element[] {
    let el: Element | null =
        node instanceof Node && node.nodeType === Node.TEXT_NODE
            ? node.parentElement
            : (node as Element);

    let parents: Element[] = [];
    while (el && (el = el.parentElement)) {
        parents.push(el);
    }
    return parents;
}

function getDepth(node: Element | Node) {
    return getParents(node).length;
}

function setData(node: any, key: string, value: string) {
    if (!(node as any).data) {
        (node as any).data = {};
    }
    (node as any).data[key] = value;
}

export function removeRefs(layers: LayerNode[], root: WithRef<FrameNode>) {
    layers.concat([root]).forEach((layer) => {
        traverse(layer, (child) => {
            delete child.ref;
        });
    });
}

export function addConstraints(layers: LayerNode[]) {
    layers.forEach((layer) => {
        traverse(layer, (child) => {
            if (child.type === 'SVG') {
                child.constraints = {
                    horizontal: 'CENTER',
                    vertical: 'MIN',
                };
            } else {
                const ref = child.ref;
                if (ref) {
                    const el =
                        // @ts-expect-error
                        ref instanceof HTMLElement ? ref : ref.parentElement;
                    const parent = el && el.parentElement;
                    if (el && parent) {
                        const currentDisplay = el.style.display;
                        el.style.setProperty('display', 'none', '!important');
                        let computed = getComputedStyle(el);
                        const hasFixedWidth =
                            computed.width &&
                            computed.width.trim().endsWith('px');
                        const hasFixedHeight =
                            computed.height &&
                            computed.height.trim().endsWith('px');
                        el.style.display = currentDisplay;
                        const parentStyle = getComputedStyle(parent);
                        let hasAutoMarginLeft = computed.marginLeft === 'auto';
                        let hasAutoMarginRight =
                            computed.marginRight === 'auto';
                        let hasAutoMarginTop = computed.marginTop === 'auto';
                        let hasAutoMarginBottom =
                            computed.marginBottom === 'auto';

                        computed = getComputedStyle(el);

                        if (
                            ['absolute', 'fixed'].includes(computed.position!)
                        ) {
                            setData(child, 'position', computed.position!);
                        }

                        if (hasFixedHeight) {
                            setData(child, 'heightType', 'fixed');
                        }
                        if (hasFixedWidth) {
                            setData(child, 'widthType', 'fixed');
                        }

                        const isInline =
                            computed.display &&
                            computed.display.includes('inline');

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

                            setData(child, 'widthType', 'shrink');
                        }
                        const parentJustifyContent =
                            parentStyle.display === 'flex' &&
                            ((parentStyle.flexDirection === 'row' &&
                                parentStyle.justifyContent) ||
                                (parentStyle.flexDirection === 'column' &&
                                    parentStyle.alignItems));

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
                                (parentStyle.flexDirection === 'row' &&
                                    parentStyle.alignItems));
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

                        if (child.type === 'TEXT') {
                            if (computed.textAlign === 'center') {
                                hasAutoMarginLeft = true;
                                hasAutoMarginRight = true;
                            } else if (computed.textAlign === 'right') {
                                hasAutoMarginLeft = true;
                                hasAutoMarginRight = false;
                            }
                        }

                        child.constraints = {
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
                    }
                } else {
                    child.constraints = {
                        horizontal: 'SCALE',
                        vertical: 'MIN',
                    };
                }
            }
        });
    });
}

export function makeTree(layers: LayerNode[], root: WithRef<FrameNode>) {
    const refMap = new WeakMap<Element | Node | SceneNode, LayerNode>();
    layers.forEach((layer) => {
        if (layer.ref) {
            refMap.set(layer.ref, layer);
        }
    });

    let updated = true;
    let iterations = 0;
    while (updated) {
        updated = false;
        if (iterations++ > 10000) {
            console.error('Too many tree iterations 1');
            break;
        }

        traverse(root, (layer, originalParent) => {
            // const node = layer.ref!;
            const node = layer.ref;
            let parentElement: Element | null =
                (node && (node as Element).parentElement) || null;
            do {
                if (parentElement === document.body) {
                    break;
                }
                if (parentElement && parentElement !== document.body) {
                    // Get least common demoninator shared parent and make a group
                    const parentLayer = refMap.get(parentElement);
                    if (parentLayer === originalParent) {
                        break;
                    }
                    if (parentLayer && parentLayer !== root) {
                        if (hasChildren(parentLayer)) {
                            if (originalParent) {
                                const index = (
                                    originalParent as any
                                ).children.indexOf(layer);
                                (originalParent as any).children.splice(
                                    index,
                                    1
                                );
                                (parentLayer.children as Array<any>).push(
                                    layer
                                );
                                updated = true;
                                return;
                            }
                        } else {
                            let parentRef = parentLayer.ref;
                            if (
                                parentRef &&
                                parentRef instanceof Node &&
                                parentRef.nodeType === Node.TEXT_NODE
                            ) {
                                parentRef = parentRef.parentElement as Element;
                            }
                            const overflowHidden =
                                parentRef instanceof Element &&
                                getComputedStyle(parentRef).overflow !==
                                    'visible';
                            const newParent: LayerNode = {
                                type: 'FRAME',
                                clipsContent: !!overflowHidden,
                                // type: 'GROUP',
                                x: parentLayer.x,
                                y: parentLayer.y,
                                width: parentLayer.width,
                                height: parentLayer.height,
                                ref: parentLayer.ref,
                                backgrounds: [] as any,
                                // @ts-expect-error
                                children: [parentLayer, layer] as LayerNode[],
                            };

                            const parent = getParent(parentLayer, root);
                            if (!parent) {
                                console.warn(
                                    '\n\nCANT FIND PARENT\n',
                                    JSON.stringify({
                                        ...parentLayer,
                                        ref: null,
                                    })
                                );
                                continue;
                            }
                            if (originalParent) {
                                const index = (
                                    originalParent as any
                                ).children.indexOf(layer);
                                (originalParent as any).children.splice(
                                    index,
                                    1
                                );
                            }
                            delete parentLayer.ref;
                            const newIndex = (parent as any).children.indexOf(
                                parentLayer
                            );
                            refMap.set(parentElement, newParent);
                            (parent as any).children.splice(
                                newIndex,
                                1,
                                newParent
                            );
                            updated = true;
                            return;
                        }
                    }
                }
            } while (
                parentElement &&
                (parentElement = parentElement.parentElement)
            );
        });
    }
    // Collect tree of depeest common parents and make groups
    let secondUpdate = true;
    let secondIterations = 0;
    while (secondUpdate) {
        if (secondIterations++ > 10000) {
            console.error('Too many tree iterations 2');
            break;
        }
        secondUpdate = false;

        traverse(root, (layer, parent) => {
            if (secondUpdate) {
                return;
            }
            if (layer.type === 'FRAME') {
                // Final all child elements with layers, and add groups around  any with a shared parent not shared by another
                const ref = layer.ref as Element;
                if (layer.children && layer.children.length > 2) {
                    const childRefs =
                        layer.children &&
                        (layer.children as LayerNode[]).map(
                            (child) => child.ref!
                        );

                    let lowestCommonDenominator = layer.ref!;
                    let lowestCommonDenominatorDepth = getDepth(
                        lowestCommonDenominator as Element
                    );

                    // Find lowest common demoninator with greatest depth
                    for (const childRef of childRefs) {
                        const otherChildRefs = childRefs.filter(
                            // @ts-ignore
                            (item) => item !== childRef
                        );
                        const childParents = getParents(childRef as Node);
                        for (const otherChildRef of otherChildRefs) {
                            const otherParents = getParents(
                                otherChildRef as Node
                            );
                            for (const parent of otherParents) {
                                if (
                                    childParents.includes(parent) &&
                                    (layer.ref! as HTMLElement).contains(parent)
                                ) {
                                    const depth = getDepth(parent);
                                    if (depth > lowestCommonDenominatorDepth) {
                                        lowestCommonDenominator = parent;
                                        lowestCommonDenominatorDepth = depth;
                                    }
                                }
                            }
                        }
                    }
                    if (
                        lowestCommonDenominator &&
                        lowestCommonDenominator !== layer.ref
                    ) {
                        // Make a group around all children elements
                        const newChildren = layer.children!.filter(
                            (item: any) =>
                                (
                                    lowestCommonDenominator as HTMLElement
                                ).contains(item.ref)
                        );

                        if (newChildren.length !== layer.children.length) {
                            const lcdRect = getBoundingClientRect(
                                lowestCommonDenominator as Element
                            );

                            const overflowHidden =
                                lowestCommonDenominator instanceof Element &&
                                getComputedStyle(lowestCommonDenominator)
                                    .overflow !== 'visible';

                            const newParent: LayerNode = {
                                type: 'FRAME',
                                clipsContent: !!overflowHidden,
                                ref: lowestCommonDenominator as Element,
                                x: lcdRect.left,
                                y: lcdRect.top,
                                width: lcdRect.width,
                                height: lcdRect.height,
                                backgrounds: [] as any,
                                children: newChildren as any,
                            };
                            refMap.set(lowestCommonDenominator, ref);
                            let firstIndex = layer.children.length - 1;
                            for (const child of newChildren) {
                                const childIndex = layer.children.indexOf(
                                    child as any
                                );
                                if (
                                    childIndex > -1 &&
                                    childIndex < firstIndex
                                ) {
                                    firstIndex = childIndex;
                                }
                            }
                            (layer.children as any).splice(
                                firstIndex,
                                0,
                                newParent
                            );
                            for (const child of newChildren) {
                                const index = layer.children.indexOf(child);
                                if (index > -1) {
                                    (layer.children as any).splice(index, 1);
                                }
                            }
                            secondUpdate = true;
                        }
                    }
                }
            }
        });
    }
    // Update all positions
    traverse(root, (layer) => {
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

    return layers;
}
