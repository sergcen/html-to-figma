import { MetaTextNode, PlainLayerNode } from '../types';
import {
    fastClone,
    parseUnits,
    getRgb,
    defaultPlaceholderColor,
} from '../utils';
import { getLineHeight, isHidden } from './dom-utils';
import { context } from './utils';

export const textToFigma = (node: Element, { fromTextInput = false } = {}) => {
    const textValue = (
        node.textContent ||
        (node as HTMLInputElement).value ||
        (node as HTMLInputElement).placeholder
    )?.trim();

    if (!textValue) return;

    const { getComputedStyle } = context.window;

    const parent = node.parentElement as Element;

    if (isHidden(parent)) {
        return;
    }
    const computedStyles = getComputedStyle(fromTextInput ? node : parent);
    const range = context.document.createRange();
    range.selectNode(node);
    const rect = fastClone(range.getBoundingClientRect());

    const lineHeight = getLineHeight(node as HTMLElement, computedStyles);

    range.detach();
    if (lineHeight && lineHeight.value && rect.height < lineHeight.value) {
        const delta = lineHeight.value - rect.height;
        rect.top -= delta / 2;
        rect.height = lineHeight.value;
    }
    if (rect.height < 1 || rect.width < 1) {
        return;
    }
    let x = Math.round(rect.left);
    let y = Math.round(rect.top);
    let width = Math.round(rect.width);
    let height = Math.round(rect.height);

    if (fromTextInput) {
        const borderLeftWidth =
            parseUnits(computedStyles.borderLeftWidth)?.value || 0;
        const borderRightWidth =
            parseUnits(computedStyles.borderRightWidth)?.value || 0;

        const paddingLeft = parseUnits(computedStyles.paddingLeft)?.value || 0;
        const paddingRight =
            parseUnits(computedStyles.paddingRight)?.value || 0;
        const paddingTop = parseUnits(computedStyles.paddingTop)?.value || 0;
        const paddingBottom =
            parseUnits(computedStyles.paddingBottom)?.value || 0;

        x = x + borderLeftWidth + (fromTextInput ? paddingLeft : 0);
        y = y + paddingTop;
        width = width - borderRightWidth - paddingRight;
        height = height - paddingTop - paddingBottom;
    }

    const textNode = {
        x,
        y,
        width,
        height,
        ref: node,
        type: 'TEXT',
        characters: textValue?.replace(/\s+/g, ' ') || '',
    } as MetaTextNode;

    const fills: SolidPaint[] = [];
    let rgb = getRgb(computedStyles.color);
    const isPlaceholder =
        fromTextInput &&
        !(node as HTMLInputElement).value &&
        (node as HTMLInputElement).placeholder;
    rgb = isPlaceholder ? defaultPlaceholderColor : rgb;

    if (rgb) {
        fills.push({
            type: 'SOLID',
            color: {
                r: rgb.r,
                g: rgb.g,
                b: rgb.b,
            },
            blendMode: 'NORMAL',
            visible: true,
            opacity: rgb.a || 1,
        } as SolidPaint);
    }

    if (fills.length) {
        textNode.fills = fills;
    }
    const letterSpacing = parseUnits(computedStyles.letterSpacing);
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
        textNode.fontFamily = computedStyles.fontFamily;
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

    return textNode;
};
