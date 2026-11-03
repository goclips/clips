export default {

    styles: /*css*/`
        [data-clip="today"] {
            padding: 16px;
        }

        .today__head {
            margin-bottom: 12px;
        }

        .today__head > .today__title {
            color: var(--c2);
            font-size: 16px;
            font-weight: 600;
            text-transform: uppercase;
        }

        .today__date {
            font-size: 16px;
            color: #aaa;
        }

        .today__body {}

        .today__body .activity-card {
            margin-bottom: 12px;
        }

    `,

    async render(ctx, options = {}) {
        const today = new Date()
        const dateFormat = new Intl.DateTimeFormat(undefined, {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
        return /*html*/`
            <div data-clip="today">
                <div class="today__head">
                    <div class="today__title">${ctx.escape('Today')}</div>
                    <div class="today__date">${ctx.escape(dateFormat.format(today))}</div>
                </div>
                <div class="today__body"></div>
            </div>
        `
    },

    async load(options) {
        const res = await fetch('data/today.json')
        if (res.ok) {
            return await res.json()
        }
    },

    update(options) {
        const body = this.root.querySelector('.today__body')
        body.replaceChildren()
        for (const data of options.data) {
            clips.include('card/activity', body, { data })
        }
    }



}