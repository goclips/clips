export default {

    extends: 'card',

    styles: /*css*/`
        [data-clip="card/activity"] {
            color: #fff;
            background-color: #3339;
            padding: 8px;
            border-radius: 8px;
            margin: 8px;
        }
    `,

    async render(ctx, options = {}) {
        return /*html*/`
            <div data-clip="activity-card" class="card">${ctx.escape(options.data.description)}</div>
        `
    }

}