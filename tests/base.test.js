
describe('Convert to figma', () => {
    let htmlToFigma;
    beforeAll(async () => {
        htmlToFigma = async (name) => {
            await page.goto(`http://localhost:3000/stubs/${name}.html`);
            await page.addScriptTag({ url: '../index.js' });

            return page.$eval(`#container`, (el) => window.__htmlToFigma(el));
        }
    });

    it('button with padding', async () => {
        expect(await htmlToFigma('base-button')).toMatchSnapshot();
    });

    it('buttons with :before :after', async () => {
        expect(await htmlToFigma('button-before-after')).toMatchSnapshot();
    });

    it('input and placeholder', async () => {
        expect(await htmlToFigma('input')).toMatchSnapshot();
    });

    it('shadows', async () => {
        expect(await htmlToFigma('shadows')).toMatchSnapshot();
    });

    it('opacity', async () => {
        expect(await htmlToFigma('opacity')).toMatchSnapshot();
    });
});
