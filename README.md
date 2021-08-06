# HTML-FIGMA

**!!! WORK IN PROGRESS**

Convert DOM node to Figma node.

Inspired https://github.com/BuilderIO/figma-html

```npm i html-figma```

USAGE:

Browser:
```js
import { htmlTofigma } from "html-figma/browser";

const element = document.getElementById('#element-to-export');

const layersMeta = await htmlTofigma(element);
```

Figma:
```js
import { addLayersToFrame } from "html-figma/figma";

const rootNode = figma.currentPage;

await addLayersToFrame(layersMeta, rootNode);
```