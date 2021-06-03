export interface Unit {
    unit: "PIXELS";
    value: number;
}

export interface SvgNode extends DefaultShapeMixin, ConstraintMixin {
    type: "SVG";
    svg: string;
}
export type WithRef<T> = Partial<T> & Partial<ConstraintMixin> & { 
    ref?: SceneNode | Element | HTMLElement, 
    fontFamily?: string
};
export type LayerNode = WithRef<RectangleNode | TextNode | FrameNode | SvgNode | GroupNode>;
