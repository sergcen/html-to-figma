
interface FigmaToHtmlContext { 
    window: Window;
    document: Document
}

export const context: FigmaToHtmlContext = { 
    window,
    document
};

export const setContext = (window: Window) => {
    context.document = window.document;
    context.window = window;
};
