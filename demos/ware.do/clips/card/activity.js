export default {

    extends: 'card',

    styles: /*css*/`
        [data-clip="activity-card"] {
            color: #00f;
            background-color: #666;
        }
    `,

    async render(ctx, options = {}) {
        return /*html*/`
            <div data-clip="activity-card card">[ACTIVITY-CARD]</div>
        `
    }

}