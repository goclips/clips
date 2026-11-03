export default {

    styles: /*css*/`
        [data-clip="card"] {
            color: #00f;
            background-color: #666;
        }
    `,

    async render(ctx, options = {}) {
        return /*html*/`
            <div data-clip="card">[CARD]</div>
        `
    }

}