import { getImageFills, parseUnits } from '../utils';
import { LayerNode, SvgNode, Unit } from '../types';
import fileType from 'file-type';
import { context } from './utils';

export function getAggregateRectOfElements(elements: Element[]) {
    if (!elements.length) {
        return null;
    }

    const top = getBoundingClientRect(
        getDirectionMostOfElements('top', elements)!
    ).top;
    const left = getBoundingClientRect(
        getDirectionMostOfElements('left', elements)!
    ).left;
    const bottom = getBoundingClientRect(
        getDirectionMostOfElements('bottom', elements)!
    ).bottom;
    const right = getBoundingClientRect(
        getDirectionMostOfElements('right', elements)!
    ).right;
    const width = right - left;
    const height = bottom - top;
    return {
        top,
        left,
        bottom,
        right,
        width,
        height,
    };
}
export function getBoundingClientRect(
    el: Element,
    pseudo?: string
): ClientRect {
    const { getComputedStyle } = context.window;

    const computed = getComputedStyle(el, pseudo);
    const display = computed.display;
    if (pseudo) {
        return getBoundingClientRectPseudo(el, pseudo, computed);
    }
    // if (display && display.includes('inline') && el.children.length) {
    //     const elRect = el.getBoundingClientRect();
    //     const aggregateRect = getAggregateRectOfElements(
    //         Array.from(el.children)
    //     )!;

    //     if (elRect.width > aggregateRect.width) {
    //         return {
    //             ...aggregateRect,
    //             width: elRect.width,
    //             left: elRect.left,
    //             right: elRect.right,
    //         };
    //     }
    //     return aggregateRect;
    // }

    return el.getBoundingClientRect();
}

export function getBoundingClientRectPseudo(
    el: Element,
    pseudo: string,
    style: CSSStyleDeclaration
): ClientRect {
    const dest: Record<string, string> = {};
    const copy = document.createElement('span');

    for (let i = 0, l = style.length; i < l; i++) {
        const prop = style[i];

        // @ts-ignore
        copy.style[prop] = style.getPropertyValue(prop) || style[prop];
    }

    pseudo === 'after' ? el.append(copy) : el.prepend(copy);

    const rect = copy.getBoundingClientRect();
    el.removeChild(copy);

    return rect;
}

export function getDirectionMostOfElements(
    direction: 'left' | 'right' | 'top' | 'bottom',
    elements: Element[]
) {
    if (elements.length === 1) {
        return elements[0];
    }
    return elements.reduce((memo, value: Element) => {
        if (!memo) {
            return value;
        }

        if (direction === 'left' || direction === 'top') {
            if (
                getBoundingClientRect(value)[direction] <
                getBoundingClientRect(memo)[direction]
            ) {
                return value;
            }
        } else {
            if (
                getBoundingClientRect(value)[direction] >
                getBoundingClientRect(memo)[direction]
            ) {
                return value;
            }
        }
        return memo;
    }, null as Element | null);
}

export function getAppliedComputedStyles(
    element: Element,
    pseudo?: string
): { [key: string]: string } {
    // @ts-ignore
    const { getComputedStyle, HTMLElement, SVGElement } = context.window;

    if (!(element instanceof HTMLElement || element instanceof SVGElement)) {
        return {};
    }

    const styles = getComputedStyle(element, pseudo);

    const list = [
        'opacity',
        'backgroundColor',
        'border',
        'borderTop',
        'borderLeft',
        'borderRight',
        'borderBottom',
        'borderRadius',
        'backgroundImage',
        'borderColor',
        'boxShadow',
    ];

    const color = styles.color;

    const defaults: any = {
        transform: 'none',
        opacity: '1',
        borderRadius: '0px',
        backgroundImage: 'none',
        backgroundPosition: '0% 0%',
        backgroundSize: 'auto',
        backgroundColor: 'rgba(0, 0, 0, 0)',
        backgroundAttachment: 'scroll',
        border: '0px none ' + color,
        borderTop: '0px none ' + color,
        borderBottom: '0px none ' + color,
        borderLeft: '0px none ' + color,
        borderRight: '0px none ' + color,
        borderWidth: '0px',
        borderColor: color,
        borderStyle: 'none',
        boxShadow: 'none',
        fontWeight: '400',
        textAlign: 'start',
        justifyContent: 'normal',
        alignItems: 'normal',
        alignSelf: 'auto',
        flexGrow: '0',
        textDecoration: 'none solid ' + color,
        lineHeight: 'normal',
        letterSpacing: 'normal',
        backgroundRepeat: 'repeat',
        zIndex: 'auto', // TODO
    };

    function pick<T extends { [key: string]: V }, V = any>(
        object: T,
        paths: (keyof T)[]
    ) {
        const newObject: Partial<T> = {};
        paths.forEach((path) => {
            if (object[path]) {
                if (object[path] !== defaults[path]) {
                    newObject[path] = object[path];
                }
            }
        });
        return newObject;
    }

    return pick(styles, list as any) as any;
}

export function textNodesUnder(el: Element) {
    let n: Node | null = null;
    const a: Node[] = [];
    const walk = context.document.createTreeWalker(
        el,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    while ((n = walk.nextNode())) {
        a.push(n);
    }
    return a;
}

export const getUrl = (url: string) => {
    if (!url) {
        return '';
    }
    let final = url.trim();
    if (final.startsWith('//')) {
        final = 'https:' + final;
    }

    if (final.startsWith('/')) {
        final = 'https://' + window.location.host + final;
    }

    return final;
};

export const prepareUrl = (url: string) => {
    if (url.startsWith('data:')) {
        return url;
    }
    const urlParsed = new URL(url);

    return urlParsed.toString();
};

export function isHidden(element: Element, pseudo?: string) {
    const { getComputedStyle } = context.window;

    let el: Element | null = element;
    do {
        const computed = getComputedStyle(el, pseudo);
        if (
            computed.opacity === '0' ||
            computed.display === 'none' ||
            computed.visibility === 'hidden'
        ) {
            return true;
        }
        // Some sites hide things by having overflow: hidden and height: 0, e.g. dropdown menus that animate height in
        if (
            computed.overflow !== 'visible' &&
            el.getBoundingClientRect().height < 1
        ) {
            return true;
        }
    } while ((el = el.parentElement));
    return false;
}

const BASE64_MARKER = ';base64,';
function convertDataURIToBinary(dataURI: string) {
    const base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
    const base64 = dataURI.substring(base64Index);
    const raw = window.atob(base64);
    const rawLength = raw.length;
    const array = new Uint8Array(new ArrayBuffer(rawLength));

    for (let i = 0; i < rawLength; i++) {
        array[i] = raw.charCodeAt(i);
    }
    return array;
}

const convertToSvg = (value: string, layer: LayerNode) => {
    const layerSvg = layer as SvgNode;
    layerSvg.type = 'SVG';
    layerSvg.svg = value;

    if (typeof layerSvg.fills !== 'symbol') {
        layerSvg.fills = layerSvg?.fills?.filter(
            (item) => item.type !== 'IMAGE'
        );
    }
};

// TODO: CACHE!
// const imageCache: { [key: string]: Uint8Array | undefined } = {};
export async function processImages(layer: LayerNode) {
    const images = getImageFills(layer as RectangleNode);

    return images
        ? Promise.all(
              images.map(async (image: any) => {
                  try {
                      if (image) {
                          const url = image.url;
                          if (url.startsWith('data:')) {
                              const type = url.split(/[:,;]/)[1];
                              if (type.includes('svg')) {
                                  const svgValue = decodeURIComponent(
                                      url.split(',')[1]
                                  );
                                  convertToSvg(svgValue, layer);
                                  return Promise.resolve();
                              } else {
                                  if (url.includes(BASE64_MARKER)) {
                                      image.intArr =
                                          convertDataURIToBinary(url);
                                      delete image.url;
                                  } else {
                                      console.info(
                                          'Found data url that could not be converted',
                                          url
                                      );
                                  }
                                  return;
                              }
                          }

                          const isSvg = url.endsWith('.svg');

                          // Proxy returned content through Builder so we can access cross origin for
                          // pulling in photos, etc
                          const res = await fetch(url);

                          const contentType = res.headers.get('content-type');
                          if (
                              isSvg ||
                              (contentType && contentType.includes('svg'))
                          ) {
                              const text = await res.text();
                              convertToSvg(text, layer);
                          } else {
                              const arrayBuffer = await res.arrayBuffer();
                              const type = fileType(arrayBuffer);
                              if (
                                  type &&
                                  (type.ext.includes('svg') ||
                                      type.mime.includes('svg'))
                              ) {
                                  convertToSvg(await res.text(), layer);
                                  return;
                              } else {
                                  const intArr = new Uint8Array(arrayBuffer);
                                  delete image.url;
                                  image.intArr = intArr;
                              }
                          }
                      }
                  } catch (err) {
                      console.warn('Could not fetch image', layer, err);
                  }
              })
          )
        : Promise.resolve([]);
}

export const getShadowEls = (el: Element): Element[] =>
    Array.from(
        el.shadowRoot?.querySelectorAll('*') || ([] as Element[])
    ).reduce((memo, el) => {
        memo.push(el);
        memo.push(...getShadowEls(el));
        return memo;
    }, [] as Element[]);

export enum ElemTypes {
    Textarea,
    Input,
    Image,
    Picture,
    Video,
    SVG,
    SubSVG,
    Element
}

export const getElemType = (el: Element): ElemTypes | undefined => {
    // @ts-expect-error
    if (el instanceof context.window.HTMLInputElement) {
        return ElemTypes.Input;
    }
    // @ts-expect-error
    if (el instanceof context.window.HTMLTextAreaElement) {
        return ElemTypes.Textarea;
    }
    // @ts-expect-error
    if (el instanceof context.window.HTMLPictureElement) {
        return ElemTypes.Picture;
    }
    // @ts-expect-error
    if (el instanceof context.window.HTMLImageElement) {
        return ElemTypes.Image;
    }
    // @ts-expect-error
    if (el instanceof context.window.HTMLVideoElement) {
        return ElemTypes.Video;
    }
    // @ts-expect-error
    if (el instanceof context.window.SVGSVGElement) {
        return ElemTypes.SVG;
    }
    // @ts-expect-error
    if (el instanceof context.window.SVGElement) {
        return ElemTypes.SubSVG;
    }

    // @ts-expect-error
    if (el instanceof context.window.HTMLElement) {
        return ElemTypes.Element;
    }
};

export const isElemType = (el: Element, type: ElemTypes): boolean => {
    return getElemType(el) === type;
}

export const getLineHeight = (el: HTMLElement, computedStyles: CSSStyleDeclaration): Unit | null => {
    const computedLineHeight = parseUnits(computedStyles.lineHeight);

    if (computedLineHeight) {
        return computedLineHeight;
    }

    if (isElemType(el, ElemTypes.Input)) {
        return parseUnits(computedStyles.height);
    }

    const fontSize = parseUnits(computedStyles.fontSize)?.value;
    if (!fontSize) return null;

    return { value: Math.floor(fontSize * 1.2), unit: 'PIXELS' }
}
