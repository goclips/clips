export default {

    styles: /*css*/`
        [data-clip="head"] {
            color: #00f;
            background-color: #666;
        }
    `,

    async render(ctx, options = {}) {
        return /*html*/`
            <div data-clip="head">[HEAD]</div>
        `
    }

}