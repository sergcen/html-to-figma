import { parseUnits } from "../utils";

interface ExtendedWindow extends Window {
    HTMLInputElement: HTMLInputElement
}
interface FigmaToHtmlContext { 
    window: ExtendedWindow;
    document: Document
}

export const context: FigmaToHtmlContext = { 
    // @ts-expect-error
    window,
    document
};

export const setContext = (window: Window) => {
    context.document = window.document;
    // @ts-expect-error
    context.window = window;
};

export const replaceSvgFill = (svg: string, fillColor: string) => {
    const endTagIndex = svg.indexOf('>');
    const mainTag = svg.slice(1, endTagIndex);
    const fillAttr = `fill="${fillColor}"`;
    const mainTagWithFill = mainTag.includes('fill=') ? mainTag.replace(/fill\=(.*?)\s/, `fill="${fillColor}" `) : mainTag + fillAttr;

    return `<${mainTagWithFill}>${svg.slice(endTagIndex)}`;
}