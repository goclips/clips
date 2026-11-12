import clips from '../clips.js';


/**
 * Tipo de clip base para la definición de vistas que se pueden abrir dentro de un viewport.
 * @class ViewClip
 */
clips.define('view', {

    /** @see Clip#create */
    create(options) {
        // ...
    },

    /** @type {string} */
    styles: /*css*/`
        .view {
            display: block;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            box-sizing: border-box;            
        }
    `

});
