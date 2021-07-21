import {
    isHidden,
    getAppliedComputedStyles,
    getBoundingClientRect,
    getUrl,
    prepareUrl,
} from './dom-utils';
import { size, getRgb, parseUnits, toNum, parseValue } from '../utils';
import { LayerNode, WithRef } from '../types';

export const elementToFigma = (el: Element, pseudo?: string) => {
    const layers: LayerNode[] = [];

    if (isHidden(el)) {
        return;
    }
    if (el instanceof SVGSVGElement) {
        const rect = el.getBoundingClientRect();

        // TODO: pull in CSS/computed styles
        // TODO: may need to pull in layer styles too like shadow, bg color, etc
        layers.push({
            type: 'SVG',
            ref: el,
            svg: el.outerHTML,
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
        });
        return;
    }
    // Sub SVG Eleemnt
    else if (el instanceof SVGElement) {
        return;
    }

    if (el.parentElement && el.parentElement instanceof HTMLPictureElement) {
        return;
    }

    const appliedStyles = getAppliedComputedStyles(el, pseudo);
    const computedStyle = getComputedStyle(el, pseudo);

    if (
        (size(appliedStyles) ||
            el instanceof HTMLImageElement ||
            el instanceof HTMLPictureElement ||
            el instanceof HTMLVideoElement) &&
        computedStyle.display !== 'none'
    ) {
        const rect = getBoundingClientRect(el);

        if (rect.width >= 1 && rect.height >= 1) {
            const fills: Paint[] = [];

            const color = getRgb(computedStyle.backgroundColor);

            if (color) {
                fills.push({
                    type: 'SOLID',
                    color: {
                        r: color.r,
                        g: color.g,
                        b: color.b,
                    },
                    opacity: color.a || 1,
                } as SolidPaint);
            }

            const rectNode = {
                type: 'RECTANGLE',
                ref: el,
                x: Math.round(rect.left),
                y: Math.round(rect.top),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                fills: fills as any,
            } as WithRef<RectangleNode>;

            if (computedStyle.border) {
                const parsed = computedStyle.border.match(
                    /^([\d\.]+)px\s*(\w+)\s*(.*)$/
                );
                if (parsed) {
                    let [_match, width, type, color] = parsed;
                    if (width && width !== '0' && type !== 'none' && color) {
                        const rgb = getRgb(color);
                        if (rgb) {
                            rectNode.strokes = [
                                {
                                    type: 'SOLID',
                                    color: {
                                        r: rgb.r,
                                        b: rgb.b,
                                        g: rgb.g,
                                    },
                                    opacity: rgb.a || 1,
                                },
                            ];
                            rectNode.strokeWeight = Math.round(
                                parseFloat(width)
                            );
                        }
                    }
                }
            }

            if (!rectNode.strokes) {
                const capitalize = (str: string) =>
                    str[0].toUpperCase() + str.substring(1);
                const directions = ['top', 'left', 'right', 'bottom'];
                for (const dir of directions) {
                    const computed =
                        computedStyle[('border' + capitalize(dir)) as any];
                    if (computed) {
                        const parsed = computed.match(
                            /^([\d\.]+)px\s*(\w+)\s*(.*)$/
                        );
                        if (parsed) {
                            let [_match, borderWidth, type, color] = parsed;
                            if (
                                borderWidth &&
                                borderWidth !== '0' &&
                                type !== 'none' &&
                                color
                            ) {
                                const rgb = getRgb(color);
                                if (rgb) {
                                    const width = ['top', 'bottom'].includes(
                                        dir
                                    )
                                        ? rect.width
                                        : parseFloat(borderWidth);
                                    const height = ['left', 'right'].includes(
                                        dir
                                    )
                                        ? rect.height
                                        : parseFloat(borderWidth);
                                    layers.push({
                                        ref: el,
                                        type: 'RECTANGLE',
                                        x:
                                            dir === 'left'
                                                ? rect.left - width
                                                : dir === 'right'
                                                ? rect.right
                                                : rect.left,
                                        y:
                                            dir === 'top'
                                                ? rect.top - height
                                                : dir === 'bottom'
                                                ? rect.bottom
                                                : rect.top,
                                        width,
                                        height,
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
                                    } as WithRef<RectangleNode>);
                                }
                            }
                        }
                    }
                }
            }

            if (
                computedStyle.backgroundImage &&
                computedStyle.backgroundImage !== 'none'
            ) {
                const urlMatch = computedStyle.backgroundImage.match(
                    /url\(['"]?(.*?)['"]?\)/
                );
                const url = urlMatch && urlMatch[1];

                if (url) {
                    fills.push({
                        url: prepareUrl(url),
                        type: 'IMAGE',
                        // TODO: backround size, position
                        scaleMode:
                            computedStyle.backgroundSize === 'contain'
                                ? 'FIT'
                                : 'FILL',
                        imageHash: null,
                    } as ImagePaint);
                }
            }
            if (el instanceof SVGSVGElement) {
                const url = `data:image/svg+xml,${encodeURIComponent(
                    el.outerHTML.replace(/\s+/g, ' ')
                )}`;
                if (url) {
                    fills.push({
                        url,
                        type: 'IMAGE',
                        // TODO: object fit, position
                        scaleMode: 'FILL',
                        imageHash: null,
                    } as ImagePaint);
                }
            }
            if (el instanceof HTMLImageElement) {
                const url = el.src;
                if (url) {
                    fills.push({
                        url,
                        type: 'IMAGE',
                        // TODO: object fit, position
                        scaleMode:
                            computedStyle.objectFit === 'contain'
                                ? 'FIT'
                                : 'FILL',
                        imageHash: null,
                    } as ImagePaint);
                }
            }
            if (el instanceof HTMLPictureElement) {
                const firstSource = el.querySelector('source');
                if (firstSource) {
                    const src = getUrl(firstSource.srcset.split(/[,\s]+/g)[0]);
                    // TODO: if not absolute
                    if (src) {
                        fills.push({
                            url: src,
                            type: 'IMAGE',
                            // TODO: object fit, position
                            scaleMode:
                                computedStyle.objectFit === 'contain'
                                    ? 'FIT'
                                    : 'FILL',
                            imageHash: null,
                        } as ImagePaint);
                    }
                }
            }
            if (el instanceof HTMLVideoElement) {
                const url = el.poster;
                if (url) {
                    fills.push({
                        url,
                        type: 'IMAGE',
                        // TODO: object fit, position
                        scaleMode:
                            computedStyle.objectFit === 'contain'
                                ? 'FIT'
                                : 'FILL',
                        imageHash: null,
                    } as ImagePaint);
                }
            }

            if (computedStyle.boxShadow && computedStyle.boxShadow !== 'none') {
                const parsed = parseValue(computedStyle.boxShadow);
                const color = getRgb(parsed.color);
                if (color) {
                    rectNode.effects = [
                        {
                            color,
                            type: 'DROP_SHADOW',
                            radius: parsed.blurRadius,
                            blendMode: 'NORMAL',
                            visible: true,
                            offset: {
                                x: parsed.offsetX,
                                y: parsed.offsetY,
                            },
                        } as ShadowEffect,
                    ];
                }
            }

            const borderTopLeftRadius = parseUnits(
                computedStyle.borderTopLeftRadius
            );
            if (borderTopLeftRadius) {
                rectNode.topLeftRadius = borderTopLeftRadius.value;
            }
            const borderTopRightRadius = parseUnits(
                computedStyle.borderTopRightRadius
            );
            if (borderTopRightRadius) {
                rectNode.topRightRadius = borderTopRightRadius.value;
            }
            const borderBottomRightRadius = parseUnits(
                computedStyle.borderBottomRightRadius
            );
            if (borderBottomRightRadius) {
                rectNode.bottomRightRadius = borderBottomRightRadius.value;
            }
            const borderBottomLeftRadius = parseUnits(
                computedStyle.borderBottomLeftRadius
            );
            if (borderBottomLeftRadius) {
                rectNode.bottomLeftRadius = borderBottomLeftRadius.value;
            }

            layers.push(rectNode);
        }
    }

    if (!pseudo && getComputedStyle(el, 'before').content !== 'none') {
        const pseudo = elementToFigma(el, 'before');
        
        pseudo?.length && layers.push(...pseudo);
    }

    if (!pseudo && getComputedStyle(el, 'after').content !== 'none') {
        const pseudo = elementToFigma(el, 'after');
        pseudo?.length && layers.push(...pseudo);
    }

    return layers;
};
