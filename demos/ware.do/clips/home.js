export default {

    styles: /*css*/`
        home-clip {
            color: #fff;
            background-color: #333;
        }
    `,

    async render(options = {}) {
        // super.render(options)
        return /*html*/`
            <div data-clip="home">[HOME-CLIP]</div>
        `
    }

}