export default {

    extends: 'card',

    styles: /*css*/`
        .activity-card {
            color: #fff;
            background-color: #8884;
            font-size: 16px;
            padding: 8px;
            // border-radius: 4px;
            box-shadow: 4px 4px 0 var(--c2);
        }

        .activity-card__check {
            float: left;
            width: 16px;
            height: 16px;
            // border-radius: 4px;
            background: #fff4;
        }

        .activity-card__desc {
            display: block;
            margin-left: 24px;
        }
    `,

    async render(ctx, options = {}) {
        return /*html*/`
            <div class="activity-card card">
                <div class="activity-card__check"></div>
                <div class="activity-card__desc">${ctx.escape(options.data.description)}</div>
            </div>
        `
    }

}