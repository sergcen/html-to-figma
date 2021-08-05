import {
    isHidden,
    getBoundingClientRect,
    getUrl,
    prepareUrl,
    isElemType,
    ElemTypes,
} from './dom-utils';
import { getRgb, parseUnits, parseBoxShadowValues, getOpacity } from '../utils';
import { MetaLayerNode, SvgNode, WithMeta } from '../types';
import { context, replaceSvgFill } from './utils';
import { textToFigma } from './text-to-figma';
import { getBorder, getBorderPin } from './border';

export const elementToFigma = (
    el: Element,
    pseudo?: string
): MetaLayerNode | undefined => {
    if (el.nodeType === Node.TEXT_NODE) {
        return textToFigma(el);
    }
    if (el.nodeType !== Node.ELEMENT_NODE) {
        return;
    }

    if (
        el.nodeType !== Node.ELEMENT_NODE ||
        isHidden(el, pseudo) ||
        isElemType(el, ElemTypes.SubSVG)
    ) {
        return;
    }

    const { getComputedStyle } = context.window;

    if (el.parentElement && isElemType(el, ElemTypes.Picture)) {
        return;
    }

    const computedStyle = getComputedStyle(el, pseudo);

    if (isElemType(el, ElemTypes.SVG)) {
        const rect = el.getBoundingClientRect();
        const fill = computedStyle.fill;

        return {
            type: 'SVG',
            ref: el,
            // add FILL to SVG to get right color in figma
            svg: replaceSvgFill(el.outerHTML, fill),
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
        } as WithMeta<SvgNode>;
    }

    const rect = getBoundingClientRect(el, pseudo);

    if (rect.width < 1 || rect.height < 1) {
        return;
    }

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
    const overflowHidden = computedStyle.overflow !== 'visible';
    const rectNode = {
        type: 'FRAME',
        ref: el,
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        clipsContent: !!overflowHidden,
        fills: fills as any,
        children: [],
        opacity: getOpacity(computedStyle),
    } as WithMeta<FrameNode>;

    const zIndex = Number(computedStyle.zIndex);
    if (isFinite(zIndex)) {
        rectNode.zIndex = zIndex;
    }

    const stroke = getBorder(computedStyle);

    if (stroke) {
        rectNode.strokes = stroke.strokes as SolidPaint[];
        rectNode.strokeWeight = stroke.strokeWeight;
    } else {
        rectNode.borders = getBorderPin(rect, computedStyle);
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
                    computedStyle.backgroundSize === 'contain' ? 'FIT' : 'FILL',
                imageHash: null,
            } as ImagePaint);
        }
    }
    // if (isElemType(el, ElemTypes.SVG)) {
    //     const url = `data:image/svg+xml,${encodeURIComponent(
    //         el.outerHTML.replace(/\s+/g, ' ')
    //     )}`;
    //     if (url) {
    //         fills.push({
    //             url,
    //             type: 'IMAGE',
    //             // TODO: object fit, position
    //             scaleMode: 'FILL',
    //             imageHash: null,
    //         } as ImagePaint);
    //     }
    // }
    if (isElemType(el, ElemTypes.Image)) {
        const url = (el as HTMLImageElement).src;
        if (url) {
            fills.push({
                url,
                type: 'IMAGE',
                // TODO: object fit, position
                scaleMode:
                    computedStyle.objectFit === 'contain' ? 'FIT' : 'FILL',
                imageHash: null,
            } as ImagePaint);
        }
    }
    if (isElemType(el, ElemTypes.Picture)) {
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
                        computedStyle.objectFit === 'contain' ? 'FIT' : 'FILL',
                    imageHash: null,
                } as ImagePaint);
            }
        }
    }
    if (isElemType(el, ElemTypes.Video)) {
        const url = (el as HTMLVideoElement).poster;
        if (url) {
            fills.push({
                url,
                type: 'IMAGE',
                // TODO: object fit, position
                scaleMode:
                    computedStyle.objectFit === 'contain' ? 'FIT' : 'FILL',
                imageHash: null,
            } as ImagePaint);
        }
    }

    if (computedStyle.boxShadow && computedStyle.boxShadow !== 'none') {
        const parsed = parseBoxShadowValues(computedStyle.boxShadow);
        const hasShadowSpread =
            parsed.findIndex(({ spreadRadius }) => Boolean(spreadRadius)) !==
            -1;
        // figma requires clipsContent=true, without spreadRadius wont be applied
        if (hasShadowSpread) {
            rectNode.clipsContent = true;
        }
        rectNode.effects = parsed.map((shadow) => ({
            color: shadow.color,
            type: 'DROP_SHADOW',
            radius: shadow.blurRadius,
            spread: shadow.spreadRadius,
            blendMode: 'NORMAL',
            visible: true,
            offset: {
                x: shadow.offsetX,
                y: shadow.offsetY,
            },
        })) as ShadowEffect[];
    }

    const borderTopLeftRadius = parseUnits(
        computedStyle.borderTopLeftRadius,
        rect.height
    );
    if (borderTopLeftRadius) {
        rectNode.topLeftRadius = borderTopLeftRadius.value;
    }
    const borderTopRightRadius = parseUnits(
        computedStyle.borderTopRightRadius,
        rect.height
    );
    if (borderTopRightRadius) {
        rectNode.topRightRadius = borderTopRightRadius.value;
    }
    const borderBottomRightRadius = parseUnits(
        computedStyle.borderBottomRightRadius,
        rect.height
    );
    if (borderBottomRightRadius) {
        rectNode.bottomRightRadius = borderBottomRightRadius.value;
    }
    const borderBottomLeftRadius = parseUnits(
        computedStyle.borderBottomLeftRadius,
        rect.height
    );
    if (borderBottomLeftRadius) {
        rectNode.bottomLeftRadius = borderBottomLeftRadius.value;
    }

    const result = rectNode;

    if (!pseudo && getComputedStyle(el, 'before').content !== 'none') {
        result.before = elementToFigma(el, 'before') as WithMeta<FrameNode>;
        if (result.before) {
            result.before.name = '::before';
        }
    }

    if (!pseudo && getComputedStyle(el, 'after').content !== 'none') {
        result.after = elementToFigma(el, 'after') as WithMeta<FrameNode>;
        if (result.after) {
            result.after.name = '::after';
        }
    }

    if (isElemType(el, ElemTypes.Input) || isElemType(el, ElemTypes.Textarea)) {
        result.textValue = textToFigma(el, { fromTextInput: true });
    }

    return result;
};
