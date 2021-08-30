# html-figma

**WORK IN PROGRESS**

![](https://s3-alpha-sig.figma.com/plugins/1005496056687344906/20022/399cc0cb-16e8-404b-b546-414cada784c8-cover?Expires=1630886400&Signature=Nbz0-5O19TeWqidtT42D9wSso8wXEqrhkY8oQ9cBE9aehp4plxzeEXTuHXlBEOi6~85psa1Fr~t6ofvgT1T2QzZLnqaCm6DOjHqdOtG05qXaniN8ptD0zNPWvzCWvEaTLcJvbEZ3hufcITGEOiO~kDg94r~zXKxDkOrKhnFS4YyBfIwd-wm54oHipTvbjhVqnSZwDUGk6ycFuv13ZWD5qAe8-p8qnkWZtu5K~bluHDMPPsD8iKzYoYYjJEBOU4M3NvP~gtNltqJxFTk8bvI3AUtsDKgdyvJY7aJwb1SGEqGq9B1MYxB0EKsIXg6cjgeeyHYgJJVpTWYheHB92b3Hgw__&Key-Pair-Id=APKAINTVSUGEWH5XD5UA)

Converts DOM nodes to Figma nodes.

Inspired by [figma-html](https://github.com/BuilderIO/figma-html).

*DEMO*: https://www.figma.com/community/plugin/1005496056687344906/html-to-figma-DEV-plugin

Example: `/dev-plugin`

```npm i html-figma```

## USAGE

### Browser
```js
import { htmlTofigma } from 'html-figma/browser';

const element = document.getElementById('#element-to-export');

const layersMeta = await htmlTofigma(element);
```

### Figma
```js
import { addLayersToFrame } from 'html-figma/figma';

const rootNode = figma.currentPage;

await addLayersToFrame(layersMeta, rootNode);
```
