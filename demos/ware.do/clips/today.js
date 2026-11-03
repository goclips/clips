export default {

    styles: /*css*/`
        [data-clip="today"] {
            /* color: #00f;
            /* background-color: #666; */
            padding: 8px;
        }
        [data-clip="today"] > .card {

        }
    `,

    async render(ctx, options = {}) {
        return /*html*/`
            <div data-clip="today"></div>
        `
        /*
            <div data-clip="today">
                <div class="today__head">
                    <div data-clip="today__date">${ctx.escape(options.data.date)}</div>
                </div>
                <div class="today__body">
                    
                </div>
            </div>
         */

        // Ejemplo de uso de each:
        // <div data-clip="today">
        // ${ctx.each(options.data, item => ctx.include('clip:card/activity', { item, ...options }))}
        // </div>
    },

    async load(options) {
        const res = await fetch('data/today.json')
        if (res.ok) {
            return await res.json()
        }
    },

    update(options) {
        this.root.replaceChildren()
        for (const data of options.data) {
            clips.include('card/activity', this.root, { data })
        }
    }



}