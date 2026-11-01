export default {

    styles: /*css*/`
        [data-clip="home"] {
            color: #f00;
            background-color: #888;
        }
    `,

    async render(ctx, options = {}) {
        return /*html*/`
            <div data-clip="home">
                ${ctx.include('clip:head')}
                ${ctx.include('clip:today')}
            </div>
        `
    }

}