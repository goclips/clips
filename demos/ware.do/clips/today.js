export default {

    styles: /*css*/`
        [data-clip="today"] {
            color: #00f;
            background-color: #666;
        }
        [data-clip="today"] > .card {
            
        }
    `,

    async render(ctx, options = {}) {
        return /*html*/`
            <div data-clip="today">
                ${ctx.each(options.data, item => ctx.include('clip:card/activity', { item, ...options }))}
            </div>
        `
    }

}