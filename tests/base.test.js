
describe('Convert to figma', () => {
    let htmlToFigma;
    beforeAll(async () => {
        htmlToFigma = async (name) => {
            await page.goto(`http://localhost:3000#name=${name}`);

            return page.$eval(`#${name}`, (el) => window.__htmlToFigma(el));
        }
    });

    it('button with padding', async () => {
        expect(await htmlToFigma('button-padding')).toMatchSnapshot();
    });
});
