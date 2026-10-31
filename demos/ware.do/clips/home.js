export default {

    styles: /*css*/`
        [data-clip="home"] {
            color: #f00;
            background-color: #888;
        }
    `,

    async render(ctx, options = {}) {
        options.data = [1, 2, 3, 4, 5, 6, 7, 8]
        return /*html*/`
            <div data-clip="home">
                ${ctx.include('clip:head', options)}
                ${ctx.include('clip:today', options)}
            </div>
        `
    }

}