export default {

    extends: 'card',

    styles: /*css*/`
        [data-clip="card/activity"] {
            color: #fff;
            background-color: #3338;
            padding: 8px;
            border-radius: 8px;
            margin: 8px;
        }
    `,

    async render(ctx, options = {}) {
        return /*html*/`
            <div class="card" data-clip="activity-card">${ctx.escape(options.data.description)}</div>
        `
    }

}