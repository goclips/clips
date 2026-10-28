export default {

    styles: /*css*/`
        [data-clip="home"] {
            color: #f00;
            background-color: #888;
        }
    `,

    async render(options = {}) {
        // super.render(options)
        return /*html*/`
            <div data-clip="home">[HOME-CLIP]</div>
        `
    }

}