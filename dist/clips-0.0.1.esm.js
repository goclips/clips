const HTML_ESCAPES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
};

var escape = {

    /**
     * Escapa los caracteres especiales en HTML.
     * @param {*} x Valor especificado. 
     * @returns {string} Cadena escapada.
     */
    html: (x) => String(x).replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]),

    /**
     * Escapa los caracteres especiales en literales de plantilla.
     * @param {string} str Cadena especificada. 
     * @returns {string} Cadena escapada.
     */
    literal: (str) => str
        .replace(/\\/g, "\\\\")
        .replace(/`/g, "\\`")
        .replace(/\$\{/g, "\\${")
        .replace(/\r/g, "\\r")

};

// clips.js


/**
 * Prefijo para especificar referencias a clips en inclusiones.
 * 
 * @private
 * @type {string}
 */
const _clipPrefix = 'clip:';

/**
 * Expresión para verificar si una cadena solo contiene espacios.
 * 
 * @private
 * @type {RegExp}
 */
// const _whitespaceRegexp = /^\s*$/;

/**
 * Maps root elements to clips.
 * 
 * @private
 * @type {WeakMap<HTMLElement, Clip>}
 */
const _roots = new WeakMap();

/**
 * Stores private state for clips.
 * 
 * @private
 * @type {WeakMap<Clip, {
 *     root: HTMLElement|null,
 *     listeners: Map,
 *     loadStarted: false,
 *     loadTime: 0 
 * }>}
 */
const _states = new WeakMap();

/**
 * Shared style element containing the styles of registered clips.
 *
 * @private
 * @type {HTMLStyleElement|undefined}
 */
let _styleElement;


/**
 * Base class for clips.
 */
class Clip {

    /**
     * Available inclusion positions.
     *
     * @enum {string}
     */
    static Position = Object.freeze({
        start: 'start',
        end: 'end',
        before: 'before',
        after: 'after',
        replace: 'replace'
    })
    
    /**
     * Creates a Clip instance.
     *
     * @param {Object} [options={}] Creation options.
     */
    constructor(options = {}) {
        _states.set(this, {
            root: null,
            listeners: new Map(),
            loadStarted: false,
            loadTime: 0
        });

        this.create(options);
    }

    /**
     * Clip root element.
     *
     * @type {Element|null}
     * @readonly
     */
    get root() {
        return _states.get(this).root
    }

    /**
     * Clip type name.
     *
     * @type {string}
     * @readonly
     */
    get clipName() {
        return this.constructor.name
    }

    /**
     * Closest ancestor clip.
     *
     * @type {Clip|null}
     * @readonly
     */
    get parentClip() {
        for (let element = this.root?.parentElement; element; element = element.parentElement) {
            const clip = _roots.get(element);

            if (clip) {
                return clip
            }
        }

        return null
    }

    /**
     * Immediate child clips, excluding their descendants.
     *
     * @type {Clip[]}
     * @readonly
     */
    get childClips() {
        const clips = [];

        const collect = element => {
            const clip = _roots.get(element);

            if (clip) {
                clips.push(clip);
                return
            }

            for (const child of element.children) {
                collect(child);
            }
        };

        const root = this.root;

        if (root) {
            for (const child of root.children) {
                collect(child);
            }
        }

        return clips
    }

    /**
     * Number of immediate child clips.
     *
     * @type {number}
     * @readonly
     */
    get childCount() {
        return this.childClips.length
    }

    /**
     * Timestamp of the last successful data load, or zero if none has completed.
     *
     * @type {number}
     * @readonly
     */
    get loadTime() {
        return _states.get(this).loadTime
    }

    /**
     * Initializes the clip instance. Called by the constructor.
     * 
     * @param {Object} options Creation options.
     * @returns {void}
     */
    create(options) {}

    /**
     * Includes the clip relative to the specified target element.
     *
     * @param {Element} target Target element.
     * @param {Object} [options={}] Additional options.
     * @param {Clip.Position} [options.position=Clip.Position.end] Position relative to the target element.
     * @returns {Promise<Clip>} Resolves to this clip after ready() completes.
     */
    async include(target, options = {}) {
        options = { ...options };

        const state = _states.get(this);
        const previous = state.includePromise ?? Promise.resolve();

        return await (state.includePromise = previous.catch(() => {}).then(() => 
            _include.call(this, target, options)));
    }

    /**
     * Renders the clip.
     *
     * @param {RenderContext} ctx Rendering context.
     * @param {Object} [options] Additional rendering options.
     * @returns {DocumentFragment|Element|string|Promise<DocumentFragment|Element|string>} Rendered content.
     */
    async render(ctx, options) {
        // TODO: Creo que la implementación por defecto debería intentar renderizar la plantilla por defecto.
        return /*html*/`<div data-clip="${this.clipName}"></div>`
        // return _renderTemplate(this)
    }

    /**
     * Initializes the generated content and adds the necessary event listeners. Called on every inclusion.
     *
     * @param {Object} [options] Additional options.
     * @param {boolean} [options.fresh=false] Whether the root element was newly created.
     * @returns {void|Promise<void>}
     */
    ready(options) {}

    /**
     * Loads additional data.
     *
     * @param {Object} options Additional options.
     * @returns {*|Promise<*>} Data passed to update().
     */
    async load(options) {}

    /**
     * Updates the clip content after loading additional data.
     *
     * @param {Object} options Additional options.
     * @param {*} options.data Loaded data.
     * @returns {void|Promise<void>}
     */
    async update(options) {}

    /**
     * Initiates the reload of the clip.
     *
     * @param {Object} options Additional options.
     * @returns {Promise<void>}
     */
    async reload(options) {
        // ...
    }

    /**
     * Clears the clip content so it can be rendered again.
     *
     * @param {Object} options Additional options.
     */
    clear(options) {
        // ...
    }

    /**
     * Shows or hides the clip.
     *
     * @param {boolean} [show] Whether to show the clip. If omitted, toggles its visibility.
     */
    toggle(show) {
        // ...
    }

    /**
     * Checks whether the clip is visible.
     *
     * @returns {boolean} Whether the clip is visible.
     */
    isVisible() {
        // ...
    }

    /**
     * Removes the clip from the DOM.
     */
    remove() {
        // ...
    }

    /**
     * Destroys the clip and releases its resources.
     */
    destroy() {
        // ...
    }

    /**
     * Registers an event listener.
     *
     * @param {string} type Event type.
     * @param {function(ClipEvent): void} listener Event listener.
     * @returns {Clip} This clip.
     */
    on(type, listener) {
        if (typeof type !== 'string' || type.length === 0) {
            throw new TypeError('Invalid event type: a non-empty string is required.')
        }

        if (typeof listener !== 'function') {
            throw new TypeError('Invalid event listener: a function is required.')
        }

        const state = _states.get(this);

        let listeners = state.listeners.get(type);

        if (!listeners) {
            state.listeners.set(type, listeners = new Set());
        }

        listeners.add(listener);

        return this
    }

    /**
     * Removes an event listener.
     *
     * @param {string} type Event type.
     * @param {function(ClipEvent): void} listener Event listener.
     * @returns {Clip} This clip.
     */
    off(type, listener) {
        if (typeof type !== 'string' || type.length === 0) {
            throw new TypeError('Invalid event type: a non-empty string is required.')
        }

        if (typeof listener !== 'function') {
            throw new TypeError('Invalid event listener: a function is required.')
        }

        const state = _states.get(this);
        const listeners = state.listeners.get(type);

        if (listeners) {
            listeners.delete(listener);

            if (listeners.size === 0) {
                state.listeners.delete(type);
            }
        }

        return this
    }

    /**
     * Fires an event synchronously.
     *
     * @param {string|ClipEvent|{type: string, detail?: *}} event Event to fire.
     * @param {Object} [options={}] Dispatch options.
     * @param {boolean|'post'} [options.spread=false]
     * Whether to propagate to descendants: true for preorder, 'post' for postorder.
     * @returns {Clip} This clip.
     */
    fire(event, { spread = false } = {}) {
        // Se normaliza el evento.
        if (!(event instanceof ClipEvent)) {
            if (typeof event === 'string') {
                event = new ClipEvent(event);
            } else if (typeof event === 'object' && event !== null && typeof event.type === 'string') {
                event = new ClipEvent(event.type, event.detail);
            } else {
                throw new TypeError(
                    'Invalid event: expected a type string, a ClipEvent, or an object with a string "type" property.'
                )
            }
        }

        // Se validan las opciones adicionales.
        if (spread !== false && spread !== true && spread !== 'post') {
            throw new TypeError('Invalid event spread: expected false, true, or "post".')
        }

        const eventState = _eventStates.get(event);

        // Se impide emitir la misma instancia del evento mientras se está procesando.
        if (eventState.target !== null) {
            throw new ClipError('The event is already being dispatched.')
        }

        const dispatch = clip => {
            // Se propaga en postorden.
            if (spread === 'post') {
                for (const child of clip.childClips) {
                    dispatch(child);
                }
            }

            // Se ejecutan los listeners de este clip.
            const state = _states.get(clip);
            const listeners = state.listeners.get(event.type);

            if (listeners) {
                const previousTarget = eventState.currentTarget;
                eventState.currentTarget = clip;

                try {
                    for (const listener of [...listeners]) {
                        try {
                            listener.call(clip, event);
                        } catch (err) {
                            console.error(
                                `Error calling event listener "${event.type}" in clip "${clip.clipName}":`,
                                err
                            );
                        }
                    }
                } finally {
                    eventState.currentTarget = previousTarget;
                }
            }

            // Se propaga en preorden.
            if (spread === true) {
                for (const child of clip.childClips) {
                    dispatch(child);
                }
            }
        };

        eventState.target = this;

        try {
            dispatch(this);
        } finally {
            eventState.target = null;
            eventState.currentTarget = null;
        }

        return this
    }

}


/**
 * Performs the clip inclusion.
 *
 * @private
 * @this {Clip}
 * @see Clip#include
 */
async function _include(target, options = {}) {
    // Se valida el destino.
    if (!target || (target.nodeType !== Node.ELEMENT_NODE && target.nodeType !== Node.COMMENT_NODE)) {
        throw new TypeError('Invalid target: must be an Element or Comment.')
    }

    // Se valida la posición especificada y se retira la opción para evitar arrastrarla.
    const position = options.position ?? Clip.Position.end;
    if (!Object.values(Clip.Position).includes(position)) {
        throw new RangeError(`Invalid position: ${String(position)}.`)
    }
    delete options.position;

    // Los comentarios no pueden contener nodos.
    if (target.nodeType === Node.COMMENT_NODE && (position === Clip.Position.start || position === Clip.Position.end)) {
        throw new TypeError('Invalid position: start and end require an Element target.')
    }

    // Se comprueba las posiciones que requieren que el elemento destino esté contenido en otro elemento.
    if ([Clip.Position.before, Clip.Position.after, Clip.Position.replace].includes(position) && !target.parentNode) {
        throw new ClipError(`Invalid target: must have a parent node for position "${position}".`)
    }

    // Se recupera el estado del clip.
    const state = _states.get(this);

    // Se genera la raíz si todavía no existe.    
    let root = state.root, fresh = false;
    if (!root) {
        const ctx = new RenderContext(this);
        
        let result;
        try {
            result = await this.render(ctx, options);
        } catch (cause) {
            throw new ClipError(`Unable to render clip "${this.clipName}".`, { cause });
        }

        if (result == null) {
            throw new ClipError(`Missing render output for clip "${this.clipName}".`)
        }

        if (result.nodeType === Node.ELEMENT_NODE) {
            root = result;
        } else {
            if (typeof result === 'string') {
                ctx.print(result);
                result = await ctx.resolve();
            }

            if (result.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
                for (const node of result.childNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (root) {
                            throw new ClipError('Multiple root elements are not allowed.')
                        }
                        root = node;
                    } else if (node.nodeType === Node.TEXT_NODE) {
                        if (node.data.trim().length > 0) {
                            throw new ClipError('Text outside the root element is not allowed.')
                        }
                    } else if (node.nodeType !== Node.COMMENT_NODE) {
                        throw new ClipError(`Unsupported node type (${node.nodeType}) outside the root element.`)
                    }
                }
            }
        }

        if (!root) {
            throw new ClipError('Missing clip root: render() must return an Element, ' + 
                'or a DocumentFragment/HTML string containing a single root element.')
        }

        // Se comprueba que el mismo elemento no esté asociado a otro clip.
        const clip = _roots.get(root);
        if (clip && clip !== this) {
            throw new ClipError('Clip root already belongs to another clip.')
        }

        // Se identifica el elemento raíz del clip.
        root.setAttribute('data-clip', this.clipName);

        // Se indica que la raíz es de reciente creación.
        fresh = true;
    }

    // El destino puede haber cambiado durante el renderizado.
    if ([Clip.Position.before, Clip.Position.after, Clip.Position.replace].includes(position) && !target.parentNode) {
        throw new ClipError('The target element must have a parent for this inclusion position.')
    }

    // Se rechazan destinos dentro de la propia raíz.
    if (root.contains(target)) {
        throw new ClipError('The target element cannot be contained within the clip root.')
    }

    if (fresh) {
        // Se vincula el elemento raíz con la instancia del clip. 
        _roots.set(root, this);

        // Se guarda el elemento raíz en el estado interno de la instancia.
        state.root = root;

        // Referencia para depuración.
        // TODO: Darle un pensada a la nomenclatura de la propiedad.
        Object.defineProperty(root, '__clip', {
            value: this,
            configurable: true
        });
    } 

    // Se guarda si la raíz estaba conectada antes de incluirla en el destino.
    const wasConnected = root.isConnected;

    // Receptores de eventos.
    const eventTargets = {
        detach: [], attach: []        
    };

    // Se inserta la raíz.
    switch (position) {
        case Clip.Position.after:
            target.after(root);
            break

        case Clip.Position.before:
            target.before(root);
            break

        case Clip.Position.replace:
            const connected = target.isConnected;

            if (target.contains(root)) {
                target.before(root);
                target.remove();
            } else {
                target.replaceWith(root);
            }

            if (connected) {
                const collect = element => {
                    for (const child of [...element.children]) {
                        collect(child);
                    }
                    
                    const clip = _roots.get(element);
                    if (clip) {
                        eventTargets.detach.push(clip);
                    }
                };

                collect(target);
            }
            break

        case Clip.Position.start:
            target.prepend(root);
            break

        case Clip.Position.end:
            target.append(root);
            break
    }

    // Se determina si emitir el evento "attach" o "detach" sobre el clip incluído y los clips contenidos.
    const isConnected = root.isConnected;
    if (isConnected !== wasConnected) {
        const collect = element => {
            const clip = _roots.get(element);

            if (clip && isConnected) {
                eventTargets.attach.push(clip);
            }

            for (const child of element.children) {
                collect(child);
            }

            if (clip && !isConnected) {
                eventTargets.detach.push(clip);
            }
        };

        collect(root);
    }

    // Se emiten los eventos correspondientes.
    for (const event of Object.keys(eventTargets)) {
        for (const clip of eventTargets[event]) {
            // TODO: Evaluar que pasa si la propagación del evento falla.
            clip.fire(event);
        }    
    }

    // Se llama al ready en cada inclusión.
    try {
        await this.ready({ ...options, fresh, reload: false });
    } catch (err) {
        throw new ClipError(`Unable to ready clip "${this.clipName}".`, { cause: err })
    }

    // Se inicia la carga de datos adicionales.
    if (!state.loadStarted) {
        state.loadStarted = true;

        void (async () => {
            let data;
            try {
                data = await this.load({ ...options, reload: false });
                state.loadTime = Date.now();            
            } catch (cause) {
                throw new ClipError(`Unable to load data for clip "${this.clipName}".`, { cause })
            }

            try {
                await this.update({ ...options, data, reload: false });
            } catch (cause) {
                throw new ClipError(`Unable to update clip "${this.clipName}".`, { cause })
            }
        })().catch(err => {
            console.error(err);
        });
    }
    
    // Se devuelve la propia instancia.
    return this
}


/* CLIP EVENT
 * ================================================================================================================== */
/**
 * Internal event states.
 * 
 * @private
 * @type {WeakMap<ClipEvent, {
 *     target: Clip|null,
 *     currentTarget: Clip|null
 * }>}
 */
const _eventStates = new WeakMap();

/**
 * Event dispatched by a clip.
 */
class ClipEvent {

    /**
     * Creates a clip event.
     *
     * @param {string} type Event type.
     * @param {*} [detail] Event data.
     */
    constructor(type, detail) {
        if (typeof type !== 'string' || type.length === 0) {
            throw new TypeError('Invalid event type: a non-empty string is required.')
        }

        _eventStates.set(this, {
            target: null,
            currentTarget: null
        });

        Object.defineProperties(this, {
            type: {
                value: type,
                enumerable: true
            },
            detail: {
                value: detail,
                enumerable: true
            }
        });
    }

    /**
     * Clip that initiated the current dispatch.
     *
     * @type {Clip|null}
     * @readonly
     */
    get target() {
        return _eventStates.get(this).target
    }

    /**
     * Clip whose listeners are currently being called.
     *
     * @type {Clip|null}
     * @readonly
     */
    get currentTarget() {
        return _eventStates.get(this).currentTarget
    }

}


/* ================================================================================================================== */
/**
 * Clip Error.
 */
class ClipError extends Error {

    // Códigos de error:
    static alreadyDefined   = 'already_defined'
    static rootRequired     = 'root_required'
    static loadFailed       = 'load_failed'
    static notDefined       = 'not_defined'
    static notFound         = 'not_found'

    /**
     * Constructor.
     * @param {string} message Descripción del error.
     * @param {{ code?: string, cause?: Error | Error[] }} [options] Opciones adicionales.
     */
    constructor(message, { code = null, cause } = {}) {
        super(String(message), cause !== undefined ? { cause } : undefined);

        this.name = 'ClipError';
        this.code = code;

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ClipError);
        }
    }
}


/* RENDER CONTEXT
 * ================================================================================================================== */
/**
 * Builds HTML output and resolves nested clip and template inclusions.
 *
 * Each context belongs to a clip and represents a single rendering operation. Inclusion markers must appear exactly 
 * once in the generated HTML.
 */
class RenderContext {

    /**
     * HTML output chunks.
     *
     * @type {string[]}
     */
    #out = []

    /**
     * Clip associated with this rendering operation.
     *
     * @type {Clip}
     */
    #clip = null

    /**
     * Pending inclusions, in registration order.
     *
     * @type {Array<{name: string, options: Object}>}
     */
    #includes = []

    /**
     * Whether resolution has started.
     *
     * @type {boolean}
     */
    #resolveStarted = false

    /**
     * Creates a rendering context associated with a clip.
     *
     * @param {Clip} clip Associated clip.
     */
    constructor(clip) {
        this.#clip = clip;
    }

    /**
     * Registers an inclusion and returns its HTML comment marker.
     *
     * Names beginning with the clip prefix identify clips. Other names identify templates.
     *
     * The returned marker must be incorporated into the HTML output. Inclusion options are shallow-copied when registered.
     *
     * @param {string} name Clip or template name.
     * @param {Object} [options={}] Inclusion options.
     * @returns {string} HTML comment marker.
     */
    include(name, options) {
        this.#assertResolveNotStarted();

        const index = this.#includes.length;
        this.#includes.push({ name, options });

        return `<!--[clip-slot:${index}]-->`
    }

    /**
     * Appends a value to the HTML output.
     *
     * The value is converted to a string before optionally being escaped.
     *
     * @param {*} value Value to append.
     * @param {boolean} [esc=false] Whether to escape HTML special characters.
     * @returns {void}
     */
    print(value, esc = false) {
        this.#assertResolveNotStarted();

        value = String(value);
        this.#out.push(esc ? this.escape(value) : value);
    }
    
    /**
     * Parses the accumulated HTML and resolves all registered inclusions.
     *
     * Inclusion markers are located before resolving any inclusion.
     * Inclusions are then resolved sequentially in registration order.
     *
     * The resulting nodes belong to a detached DocumentFragment.
     *
     * @returns {Promise<DocumentFragment>} Rendered HTML fragment.
     * @throws {Error} If an inclusion marker is invalid, duplicated or missing.
     */
    async resolve() {
        if (this.#resolveStarted) {
            throw new ClipError('Render context resolution has already started.')
        }

        this.#resolveStarted = true;

        const template = document.createElement('template');
        template.innerHTML = this.#out.join('');

        const slots = new Map();

        const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_COMMENT);

        while (walker.nextNode()) {
            const node = walker.currentNode;
            const match = /^\[clip-slot:(0|[1-9]\d*)\]$/.exec(node.data);

            if (!match) {
                continue
            }

            const index = Number(match[1]);

            if (index >= this.#includes.length || slots.has(index)) {
                throw new ClipError(`Invalid include slot: ${node.data}`)
            }

            slots.set(index, node);
        }

        if (slots.size !== this.#includes.length) {
            throw new ClipError(`Includes mismatch: ${slots.size} vs ${this.#includes.length}`)
        }

        for (let i = 0; i < this.#includes.length; i++) {
            const { name, options } = this.#includes[i];

            if (name.startsWith(_clipPrefix)) {
                const clip = await clips.create(name.substring(_clipPrefix.length), options);

                await clip.include(slots.get(i), { ...options, position: Clip.Position.replace });
            } else {
                const fragment = await clips.render(this.#clip, name, options);

                slots.get(i).replaceWith(fragment);
            }
        }

        return template.content
    }

    #assertResolveNotStarted() {
        if (this.#resolveStarted) {
            throw new ClipError('Cannot modify a render context after resolution has started.')
        }
    }

    /**
     * Concatenates the results of a synchronous callback over an iterable.
     *
     * The callback receives each item and its zero-based iteration index,
     * with the associated clip as its this value.
     * Null and undefined results are omitted. Results are not HTML-escaped.
     * Null or undefined items are treated as an empty iterable.
     *
     * @param {Iterable<*>|null|undefined} items Items to iterate over.
     * @param {function(*, number): *} callback Synchronous rendering callback.
     * @returns {string} Concatenated callback results.
     */
    each(items, callback) {
        const out = [];
        
        let index = 0;
        for (const item of items ?? []) {
            const value = callback.call(this.#clip, item, index++);

            if (value != null) {
                out.push(value);
            }
        }

        return out.join('')
    }

    /**
     * Converts a value to a string and escapes HTML special characters.
     *
     * @param {*} value Value to escape.
     * @returns {string} Escaped string.
     */
    escape(value) {
        return escape.html(value)
    }

}


/* CLIPS OBJECT
 * ================================================================================================================== */

/**
 * Formato del nombre de los clips (path-like), uno o varios segmentos separados 
 * por "/", cada segmento: [A-Za-z0-9_-]+
 * 
 * @private
 * @type {RegExp}
 * @constant
 */ 
const _clipNameRegexp = /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/;

/**
 * Longitud máxima permitida para los nombres de clip.
 * 
 * @private
 * @type {number}
 * @constant
 */
const _clipNameMaxLength = 256;

/**
 * Ajustes de configuración.
 * @type {Object}
 * @private
 * @constant
 */
const _settings = {

    /**
     * Indica si activar el modo de depuración.
     * @type {boolean}
     * @default false
     */
    debug: false,

    /**
     * Ruta base donde se ubica la definición de los clips.
     * @type {string}
     * @default '/clips'
     */
    basePath: '/clips',

    /**
     * Indica si los estilos están pre-empaquetados.
     * @type {boolean}
     * @default false
     */
    stylesBundled: false,

    /**
     * Indica si las plantillas están pre-empaquetadas.
     * @type {boolean}
     * @default false
     */
    templatesBundled: false
};

/**
 * Clips registrados por nombre.
 * 
 * @private
 * @type {Map<string, typeof Clip>}
 */
const _clipTypes = new Map();


/**
 * TODO: Falta documentación.
 * 
 * @namespace
 */
const clips = {

    /**
     * Actualiza los ajustes de configuración especificados.
     * @param {Object} settings Ajustes de configuración.
     * @param {boolean} [settings.debug] Indica si activar el modo debug.
     * @param {string}  [settings.basePath] Ruta base donde se localiza la definición de los clips.
     * @param {boolean} [settings.stylesBundled] Indica si los estilos están pre-empaquetados.
     * @param {boolean} [settings.templatesBundled] Indica si las plantillas están pre-empaquetadas.
     */
    setup(settings) {
        Object.assign(_settings, settings);
    },
    
    /**
     * Defines a new clip type.
     *
     * @param {string} name Unique clip name.
     * @param {Object} proto Clip prototype.
     * @returns {Promise<typeof Clip>} Resolves to the new clip constructor.
     */
    async define(name, proto) {
        // Se valida el nombre.
        if (typeof name !== 'string') {
            throw new TypeError('Invalid clip name: string required.')
        }

        name = name.trim();

        if (!name) {
            throw new TypeError('Invalid clip name: empty string.')
        }

        if (name.length > _clipNameMaxLength) {
            throw new RangeError(`Invalid clip name: too long (${name.length} > ${_clipNameMaxLength}).`)
        }

        if (!_clipNameRegexp.test(name)) {
            throw new TypeError('Invalid clip name: expected path-like string without leading or trailing slash.')
        }

        // Se permite una promesa pendiente, pero no un tipo ya definido.
        const previous = _clipTypes.get(name);

        if (previous?.prototype instanceof Clip) {
            throw new ClipError(`Clip "${name}" already defined.`, {
                code: ClipError.alreadyDefined
            })
        }

        // Se valida el objeto prototipo.
        if (proto === null || typeof proto !== 'object') {
            throw new TypeError('Invalid prototype: object required.')
        }

        // Se resuelve el tipo base del clip.
        let BaseClip = Clip;

        if (proto.extends != null) {
            let ext = proto.extends;

            if (typeof ext !== 'string') {
                throw new TypeError(`Invalid extends: string required.`)
            }

            ext = ext.trim();

            if (!ext) {
                throw new TypeError(`Invalid extends: empty string.`)
            }

            if (ext === name) {
                throw new TypeError('Invalid extends: a clip cannot extend itself.')
            }

            BaseClip = await _getClipType(ext);

            if (!BaseClip) {
                throw new ClipError(`Invalid extends: clip "${ext}" not defined.`, { code: ClipError.notDefined })
            }
        }

        // Se admite un objeto plano o uno previamente vinculado a esta clase base.
        const parent = Object.getPrototypeOf(proto);

        if (parent !== Object.prototype && parent !== BaseClip.prototype) {
            throw new TypeError('Invalid prototype: plain object or object linked to the base clip prototype required.')
        }

        // Se crea la clase del nuevo clip.
        const C = class extends BaseClip {};

        // Se establece el prototipo base para permitir el uso de super.
        Object.setPrototypeOf(proto, BaseClip.prototype);

        // Se obtienen los descriptores, excluyendo "constructor", "extends" y "styles".
        const desc = Object.getOwnPropertyDescriptors(proto);
        delete desc.constructor;
        delete desc.extends;
        delete desc.styles;

        // Se incorporan los miembros al prototipo de la clase.
        Object.defineProperties(C.prototype, desc);

        // Se asigna a la clase el nombre del tipo de clip.
        Object.defineProperty(C, 'name', {
            value: name,
            configurable: true
        });

        // Se importan la estilos vinculados al clip.
        await _importClipStyles(name, proto.styles);

        // Se comprueba que la entrada no haya cambiado durante la definición.
        if (_clipTypes.get(name) !== previous) {
            throw new ClipError(`Clip "${name}" already defined.`, {
                code: ClipError.alreadyDefined
            })
        }

        // Se registra y devuelve el constructor del nuevo clip.
        _clipTypes.set(name, C);
        
        // Se devuelve el constructor del nuevo clip.
        return C;
    },

    /**
     * Crea una nueva instancia del tipo de clip especificado por nombre.
     * @param {string} name Nombre del tipo de clip especificado.
     * @param {ClipOptions} [options] Opciones de creación del clip.
     * @return {Clip} Instancia del clip creada.
     */
    async create(name, options = {}) {
        if (typeof name !== "string" || !(name = name.trim())) {
            throw new TypeError('Invalid clip name: non-empty string required.')
        }
        let clip = await _getClipType(name);
        if (!clip) {
            throw new ClipError(`Clip "${name}" is not defined.`, { code: ClipError.notDefined })
        }
        return new clip(options)
    },

    /**
     * Incluye un clip o una plantilla en el elemento o selector especificado.
     * @param {string} name Nombre del clip o plantilla especificado.
     * @param {Element} target Elemento especificado. 
     * @param {Object} [options] Opciones adicionales.
     * @see Clip#create
     * @see Clip#include
     */
    async include(name, target, options) {
        return (await this.create(name, options)).include(target, options); 
    }

};

/**
 * Comprueba si el tipo del clip especificado está cargado. Si no está registrado lo intenta cargar.
 * 
 * @private
 * @param {string} name Nombre del clip.
 * @returns {Promise<typeof Clip>} Tipo del clip cargado.
 */
async function _getClipType(name) {
    const type = _clipTypes.get(name);

    if (type) {
        return type
    }

    const promise = _importClip(name);

    _clipTypes.set(name, promise);

    try {
        return await promise

    } catch (err) {
        if (_clipTypes.get(name) === promise) {
            _clipTypes.delete(name);
        }

        throw err
    }
}

/**
 * Carga el manejador de un clip especificado por nombre.
 * 
 * @private
 * @param {string} name Nombre del clip.
 * @returns {Promise<typeof Clip>} Tipo del clip cargado.
 */
async function _importClip(name) {
    // TODO: Introducir aquí posibles mapeos para bundles.
    /*
        _settings.bundles?.forEach(bundle => {
            if (bundle.pattern.test(name)) {
                loadBundle(bundle.path);
            }
        });
    */

    const errors = [];

    for (const path of [
            `${_settings.basePath}/${name}.js`,
            `${_settings.basePath}/${name}/index.js`]) {
                
        let proto;

        try {
            ({ default: proto } = await import(path));
        } catch (cause) {
            errors.push(new ClipError(`Failed to import clip "${name}" from "${path}".`, {
                code: ClipError.loadFailed,
                cause
            }));
            continue
        }

        // Si la definición cargada no es válida, no se intenta la siguiente ruta.
        if (proto === null || typeof proto !== 'object') {
            throw new ClipError(`Invalid clip "${name}" in "${path}": default export must be an object.`, {
                code: ClipError.loadFailed
            })
        }

        // Se registra y devuelve el tipo cargado.
        return clips.define(name, proto)
    }

    throw new ClipError(`All import attempts for clip "${name}" failed.`, {
        code: ClipError.loadFailed,
        cause: errors
    })
}


/**
 * Imports styles for the specified clip.
 *
 * @private
 * @param {string} name Clip name.
 * @param {string|Function|HTMLStyleElement|CSSStyleSheet} [styles]
 * Styles or a synchronous or asynchronous function that returns them.
 * If omitted or undefined, attempts to load the default stylesheet unless styles are bundled.
 * @returns {Promise<void>} Resolves when style loading and insertion are complete.
 */
async function _importClipStyles(name, styles) {
    // Los estilos se pueden definir como propiedad o como función.
    if (typeof styles === 'function') {
        styles = await styles();
    }
    // Si se definen como HTMLStyleElement, se añaden directamente al head.
    if (styles instanceof HTMLStyleElement) {
        document.head.appendChild(styles);
        return
    }
    // Si se definen como CSSStyleSheet, se añaden a las hojas de estilo adoptadas.
    if (styles instanceof CSSStyleSheet) {
        if (!document.adoptedStyleSheets.includes(styles)) {
            document.adoptedStyleSheets = [...document.adoptedStyleSheets, styles];
        }
        return
    }

    // Si el clip no define estilos en código y no están empaquetados, se intenta cargar la hoja de estilos por defecto 
    // ubicada en la misma ubicación que el clip.
    if (styles == null && !_settings.stylesBundled) {
        // TODO: Más que un flag que nos indique si los estilos están empaquetados o no, lo que realmente necesitamos es 
        // una definición de bundles con la especificación de nombres o patrones de clips incluidos en cada bundle, de 
        // forma que podamos introducir aquí la lógica de carga adecuada.
        const path = `${_settings.basePath}/${name}/${Clip.defaultStylesName}.css`;

        let res;

        try {
            res = await fetch(path);

            if (res.ok) {
                styles = await res.text();
            }
        } catch (err) {
            throw new ClipError(`Failed to fetch styles for clip "${name}" from "${path}": ${err.message}`, {
                code: ClipError.loadFailed,
                cause: err
            })
        }

        if (!res.ok) {
            if (res.status !== 404 && res.status !== 410) {
                throw new ClipError(`Failed to load styles for clip "${name}" from "${path}": ${res.statusText} (${res.status})`, {
                    code: ClipError.loadFailed
                })
            }

            if (_settings.debug) {
                console.warn(`No styles found for clip "${name}" at "${path}".`);
            }
        }
            
    }

    if (styles == null) {
        return
    }

    if (typeof styles !== 'string') {
        throw new TypeError(`Invalid styles for clip "${name}": string, HTMLStyleElement or CSSStyleSheet required.`)
    }

    styles = styles.trim();

    if (!styles) {
        return
    }

    if (!_styleElement) {
        _styleElement = document.createElement('style');
        _styleElement.id = 'clips-styles';
        _styleElement.setAttribute('data-source', 'clips');
        document.head.appendChild(_styleElement);
    }

    _styleElement.textContent += `\n/* ${name} */\n${styles}\n`;
}

// Global scope
if (window) {
    window.clips = clips;
}

export { clips as default };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpcHMtMC4wLjEuZXNtLmpzIiwic291cmNlcyI6WyIuLi91dGlsL2VzY2FwZS5qcyIsIi4uL2NsaXBzLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImNvbnN0IEhUTUxfRVNDQVBFUyA9IHtcclxuICAgICcmJzogJyZhbXA7JyxcclxuICAgICc8JzogJyZsdDsnLFxyXG4gICAgJz4nOiAnJmd0OycsXHJcbiAgICAnXCInOiAnJnF1b3Q7JyxcclxuICAgIFwiJ1wiOiAnJiMzOTsnXHJcbn07XHJcblxyXG5leHBvcnQgZGVmYXVsdCB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBFc2NhcGEgbG9zIGNhcmFjdGVyZXMgZXNwZWNpYWxlcyBlbiBIVE1MLlxyXG4gICAgICogQHBhcmFtIHsqfSB4IFZhbG9yIGVzcGVjaWZpY2Fkby4gXHJcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBDYWRlbmEgZXNjYXBhZGEuXHJcbiAgICAgKi9cclxuICAgIGh0bWw6ICh4KSA9PiBTdHJpbmcoeCkucmVwbGFjZSgvWyY8PlwiJ10vZywgKGNoKSA9PiBIVE1MX0VTQ0FQRVNbY2hdKSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIEVzY2FwYSBsb3MgY2FyYWN0ZXJlcyBlc3BlY2lhbGVzIGVuIGxpdGVyYWxlcyBkZSBwbGFudGlsbGEuXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc3RyIENhZGVuYSBlc3BlY2lmaWNhZGEuIFxyXG4gICAgICogQHJldHVybnMge3N0cmluZ30gQ2FkZW5hIGVzY2FwYWRhLlxyXG4gICAgICovXHJcbiAgICBsaXRlcmFsOiAoc3RyKSA9PiBzdHJcclxuICAgICAgICAucmVwbGFjZSgvXFxcXC9nLCBcIlxcXFxcXFxcXCIpXHJcbiAgICAgICAgLnJlcGxhY2UoL2AvZywgXCJcXFxcYFwiKVxyXG4gICAgICAgIC5yZXBsYWNlKC9cXCRcXHsvZywgXCJcXFxcJHtcIilcclxuICAgICAgICAucmVwbGFjZSgvXFxyL2csIFwiXFxcXHJcIilcclxuXHJcbn07IiwiLy8gY2xpcHMuanNcclxuXHJcbi8vIGltcG9ydCBlanMgZnJvbSAnLi91dGlsL2Vqcy5qcydcclxuaW1wb3J0IGVzY2FwZSBmcm9tICcuL3V0aWwvZXNjYXBlLmpzJ1xyXG5cclxuLyoqXHJcbiAqIFByZWZpam8gcGFyYSBlc3BlY2lmaWNhciByZWZlcmVuY2lhcyBhIGNsaXBzIGVuIGluY2x1c2lvbmVzLlxyXG4gKiBcclxuICogQHByaXZhdGVcclxuICogQHR5cGUge3N0cmluZ31cclxuICovXHJcbmNvbnN0IF9jbGlwUHJlZml4ID0gJ2NsaXA6JztcclxuXHJcbi8qKlxyXG4gKiBFeHByZXNpw7NuIHBhcmEgdmVyaWZpY2FyIHNpIHVuYSBjYWRlbmEgc29sbyBjb250aWVuZSBlc3BhY2lvcy5cclxuICogXHJcbiAqIEBwcml2YXRlXHJcbiAqIEB0eXBlIHtSZWdFeHB9XHJcbiAqL1xyXG4vLyBjb25zdCBfd2hpdGVzcGFjZVJlZ2V4cCA9IC9eXFxzKiQvO1xyXG5cclxuLyoqXHJcbiAqIE1hcHMgcm9vdCBlbGVtZW50cyB0byBjbGlwcy5cclxuICogXHJcbiAqIEBwcml2YXRlXHJcbiAqIEB0eXBlIHtXZWFrTWFwPEhUTUxFbGVtZW50LCBDbGlwPn1cclxuICovXHJcbmNvbnN0IF9yb290cyA9IG5ldyBXZWFrTWFwKClcclxuXHJcbi8qKlxyXG4gKiBTdG9yZXMgcHJpdmF0ZSBzdGF0ZSBmb3IgY2xpcHMuXHJcbiAqIFxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAdHlwZSB7V2Vha01hcDxDbGlwLCB7XHJcbiAqICAgICByb290OiBIVE1MRWxlbWVudHxudWxsLFxyXG4gKiAgICAgbGlzdGVuZXJzOiBNYXAsXHJcbiAqICAgICBsb2FkU3RhcnRlZDogZmFsc2UsXHJcbiAqICAgICBsb2FkVGltZTogMCBcclxuICogfT59XHJcbiAqL1xyXG5jb25zdCBfc3RhdGVzID0gbmV3IFdlYWtNYXAoKVxyXG5cclxuLyoqXHJcbiAqIFNoYXJlZCBzdHlsZSBlbGVtZW50IGNvbnRhaW5pbmcgdGhlIHN0eWxlcyBvZiByZWdpc3RlcmVkIGNsaXBzLlxyXG4gKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAdHlwZSB7SFRNTFN0eWxlRWxlbWVudHx1bmRlZmluZWR9XHJcbiAqL1xyXG5sZXQgX3N0eWxlRWxlbWVudFxyXG5cclxuXHJcbi8qKlxyXG4gKiBCYXNlIGNsYXNzIGZvciBjbGlwcy5cclxuICovXHJcbmNsYXNzIENsaXAge1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQXZhaWxhYmxlIGluY2x1c2lvbiBwb3NpdGlvbnMuXHJcbiAgICAgKlxyXG4gICAgICogQGVudW0ge3N0cmluZ31cclxuICAgICAqL1xyXG4gICAgc3RhdGljIFBvc2l0aW9uID0gT2JqZWN0LmZyZWV6ZSh7XHJcbiAgICAgICAgc3RhcnQ6ICdzdGFydCcsXHJcbiAgICAgICAgZW5kOiAnZW5kJyxcclxuICAgICAgICBiZWZvcmU6ICdiZWZvcmUnLFxyXG4gICAgICAgIGFmdGVyOiAnYWZ0ZXInLFxyXG4gICAgICAgIHJlcGxhY2U6ICdyZXBsYWNlJ1xyXG4gICAgfSlcclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiBDcmVhdGVzIGEgQ2xpcCBpbnN0YW5jZS5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnM9e31dIENyZWF0aW9uIG9wdGlvbnMuXHJcbiAgICAgKi9cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnMgPSB7fSkge1xyXG4gICAgICAgIF9zdGF0ZXMuc2V0KHRoaXMsIHtcclxuICAgICAgICAgICAgcm9vdDogbnVsbCxcclxuICAgICAgICAgICAgbGlzdGVuZXJzOiBuZXcgTWFwKCksXHJcbiAgICAgICAgICAgIGxvYWRTdGFydGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgbG9hZFRpbWU6IDBcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICB0aGlzLmNyZWF0ZShvcHRpb25zKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2xpcCByb290IGVsZW1lbnQuXHJcbiAgICAgKlxyXG4gICAgICogQHR5cGUge0VsZW1lbnR8bnVsbH1cclxuICAgICAqIEByZWFkb25seVxyXG4gICAgICovXHJcbiAgICBnZXQgcm9vdCgpIHtcclxuICAgICAgICByZXR1cm4gX3N0YXRlcy5nZXQodGhpcykucm9vdFxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2xpcCB0eXBlIG5hbWUuXHJcbiAgICAgKlxyXG4gICAgICogQHR5cGUge3N0cmluZ31cclxuICAgICAqIEByZWFkb25seVxyXG4gICAgICovXHJcbiAgICBnZXQgY2xpcE5hbWUoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uc3RydWN0b3IubmFtZVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2xvc2VzdCBhbmNlc3RvciBjbGlwLlxyXG4gICAgICpcclxuICAgICAqIEB0eXBlIHtDbGlwfG51bGx9XHJcbiAgICAgKiBAcmVhZG9ubHlcclxuICAgICAqL1xyXG4gICAgZ2V0IHBhcmVudENsaXAoKSB7XHJcbiAgICAgICAgZm9yIChsZXQgZWxlbWVudCA9IHRoaXMucm9vdD8ucGFyZW50RWxlbWVudDsgZWxlbWVudDsgZWxlbWVudCA9IGVsZW1lbnQucGFyZW50RWxlbWVudCkge1xyXG4gICAgICAgICAgICBjb25zdCBjbGlwID0gX3Jvb3RzLmdldChlbGVtZW50KVxyXG5cclxuICAgICAgICAgICAgaWYgKGNsaXApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBjbGlwXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBudWxsXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBJbW1lZGlhdGUgY2hpbGQgY2xpcHMsIGV4Y2x1ZGluZyB0aGVpciBkZXNjZW5kYW50cy5cclxuICAgICAqXHJcbiAgICAgKiBAdHlwZSB7Q2xpcFtdfVxyXG4gICAgICogQHJlYWRvbmx5XHJcbiAgICAgKi9cclxuICAgIGdldCBjaGlsZENsaXBzKCkge1xyXG4gICAgICAgIGNvbnN0IGNsaXBzID0gW11cclxuXHJcbiAgICAgICAgY29uc3QgY29sbGVjdCA9IGVsZW1lbnQgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBjbGlwID0gX3Jvb3RzLmdldChlbGVtZW50KVxyXG5cclxuICAgICAgICAgICAgaWYgKGNsaXApIHtcclxuICAgICAgICAgICAgICAgIGNsaXBzLnB1c2goY2xpcClcclxuICAgICAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIGVsZW1lbnQuY2hpbGRyZW4pIHtcclxuICAgICAgICAgICAgICAgIGNvbGxlY3QoY2hpbGQpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHJvb3QgPSB0aGlzLnJvb3RcclxuXHJcbiAgICAgICAgaWYgKHJvb3QpIHtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiByb290LmNoaWxkcmVuKSB7XHJcbiAgICAgICAgICAgICAgICBjb2xsZWN0KGNoaWxkKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gY2xpcHNcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIE51bWJlciBvZiBpbW1lZGlhdGUgY2hpbGQgY2xpcHMuXHJcbiAgICAgKlxyXG4gICAgICogQHR5cGUge251bWJlcn1cclxuICAgICAqIEByZWFkb25seVxyXG4gICAgICovXHJcbiAgICBnZXQgY2hpbGRDb3VudCgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5jaGlsZENsaXBzLmxlbmd0aFxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGltZXN0YW1wIG9mIHRoZSBsYXN0IHN1Y2Nlc3NmdWwgZGF0YSBsb2FkLCBvciB6ZXJvIGlmIG5vbmUgaGFzIGNvbXBsZXRlZC5cclxuICAgICAqXHJcbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxyXG4gICAgICogQHJlYWRvbmx5XHJcbiAgICAgKi9cclxuICAgIGdldCBsb2FkVGltZSgpIHtcclxuICAgICAgICByZXR1cm4gX3N0YXRlcy5nZXQodGhpcykubG9hZFRpbWVcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEluaXRpYWxpemVzIHRoZSBjbGlwIGluc3RhbmNlLiBDYWxsZWQgYnkgdGhlIGNvbnN0cnVjdG9yLlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBDcmVhdGlvbiBvcHRpb25zLlxyXG4gICAgICogQHJldHVybnMge3ZvaWR9XHJcbiAgICAgKi9cclxuICAgIGNyZWF0ZShvcHRpb25zKSB7fVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSW5jbHVkZXMgdGhlIGNsaXAgcmVsYXRpdmUgdG8gdGhlIHNwZWNpZmllZCB0YXJnZXQgZWxlbWVudC5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge0VsZW1lbnR9IHRhcmdldCBUYXJnZXQgZWxlbWVudC5cclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucz17fV0gQWRkaXRpb25hbCBvcHRpb25zLlxyXG4gICAgICogQHBhcmFtIHtDbGlwLlBvc2l0aW9ufSBbb3B0aW9ucy5wb3NpdGlvbj1DbGlwLlBvc2l0aW9uLmVuZF0gUG9zaXRpb24gcmVsYXRpdmUgdG8gdGhlIHRhcmdldCBlbGVtZW50LlxyXG4gICAgICogQHJldHVybnMge1Byb21pc2U8Q2xpcD59IFJlc29sdmVzIHRvIHRoaXMgY2xpcCBhZnRlciByZWFkeSgpIGNvbXBsZXRlcy5cclxuICAgICAqL1xyXG4gICAgYXN5bmMgaW5jbHVkZSh0YXJnZXQsIG9wdGlvbnMgPSB7fSkge1xyXG4gICAgICAgIG9wdGlvbnMgPSB7IC4uLm9wdGlvbnMgfVxyXG5cclxuICAgICAgICBjb25zdCBzdGF0ZSA9IF9zdGF0ZXMuZ2V0KHRoaXMpO1xyXG4gICAgICAgIGNvbnN0IHByZXZpb3VzID0gc3RhdGUuaW5jbHVkZVByb21pc2UgPz8gUHJvbWlzZS5yZXNvbHZlKCk7XHJcblxyXG4gICAgICAgIHJldHVybiBhd2FpdCAoc3RhdGUuaW5jbHVkZVByb21pc2UgPSBwcmV2aW91cy5jYXRjaCgoKSA9PiB7fSkudGhlbigoKSA9PiBcclxuICAgICAgICAgICAgX2luY2x1ZGUuY2FsbCh0aGlzLCB0YXJnZXQsIG9wdGlvbnMpKSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZW5kZXJzIHRoZSBjbGlwLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7UmVuZGVyQ29udGV4dH0gY3R4IFJlbmRlcmluZyBjb250ZXh0LlxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBBZGRpdGlvbmFsIHJlbmRlcmluZyBvcHRpb25zLlxyXG4gICAgICogQHJldHVybnMge0RvY3VtZW50RnJhZ21lbnR8RWxlbWVudHxzdHJpbmd8UHJvbWlzZTxEb2N1bWVudEZyYWdtZW50fEVsZW1lbnR8c3RyaW5nPn0gUmVuZGVyZWQgY29udGVudC5cclxuICAgICAqL1xyXG4gICAgYXN5bmMgcmVuZGVyKGN0eCwgb3B0aW9ucykge1xyXG4gICAgICAgIC8vIFRPRE86IENyZW8gcXVlIGxhIGltcGxlbWVudGFjacOzbiBwb3IgZGVmZWN0byBkZWJlcsOtYSBpbnRlbnRhciByZW5kZXJpemFyIGxhIHBsYW50aWxsYSBwb3IgZGVmZWN0by5cclxuICAgICAgICByZXR1cm4gLypodG1sKi9gPGRpdiBkYXRhLWNsaXA9XCIke3RoaXMuY2xpcE5hbWV9XCI+PC9kaXY+YFxyXG4gICAgICAgIC8vIHJldHVybiBfcmVuZGVyVGVtcGxhdGUodGhpcylcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEluaXRpYWxpemVzIHRoZSBnZW5lcmF0ZWQgY29udGVudCBhbmQgYWRkcyB0aGUgbmVjZXNzYXJ5IGV2ZW50IGxpc3RlbmVycy4gQ2FsbGVkIG9uIGV2ZXJ5IGluY2x1c2lvbi5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIEFkZGl0aW9uYWwgb3B0aW9ucy5cclxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMuZnJlc2g9ZmFsc2VdIFdoZXRoZXIgdGhlIHJvb3QgZWxlbWVudCB3YXMgbmV3bHkgY3JlYXRlZC5cclxuICAgICAqIEByZXR1cm5zIHt2b2lkfFByb21pc2U8dm9pZD59XHJcbiAgICAgKi9cclxuICAgIHJlYWR5KG9wdGlvbnMpIHt9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBMb2FkcyBhZGRpdGlvbmFsIGRhdGEuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgQWRkaXRpb25hbCBvcHRpb25zLlxyXG4gICAgICogQHJldHVybnMgeyp8UHJvbWlzZTwqPn0gRGF0YSBwYXNzZWQgdG8gdXBkYXRlKCkuXHJcbiAgICAgKi9cclxuICAgIGFzeW5jIGxvYWQob3B0aW9ucykge31cclxuXHJcbiAgICAvKipcclxuICAgICAqIFVwZGF0ZXMgdGhlIGNsaXAgY29udGVudCBhZnRlciBsb2FkaW5nIGFkZGl0aW9uYWwgZGF0YS5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBBZGRpdGlvbmFsIG9wdGlvbnMuXHJcbiAgICAgKiBAcGFyYW0geyp9IG9wdGlvbnMuZGF0YSBMb2FkZWQgZGF0YS5cclxuICAgICAqIEByZXR1cm5zIHt2b2lkfFByb21pc2U8dm9pZD59XHJcbiAgICAgKi9cclxuICAgIGFzeW5jIHVwZGF0ZShvcHRpb25zKSB7fVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSW5pdGlhdGVzIHRoZSByZWxvYWQgb2YgdGhlIGNsaXAuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgQWRkaXRpb25hbCBvcHRpb25zLlxyXG4gICAgICogQHJldHVybnMge1Byb21pc2U8dm9pZD59XHJcbiAgICAgKi9cclxuICAgIGFzeW5jIHJlbG9hZChvcHRpb25zKSB7XHJcbiAgICAgICAgLy8gLi4uXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDbGVhcnMgdGhlIGNsaXAgY29udGVudCBzbyBpdCBjYW4gYmUgcmVuZGVyZWQgYWdhaW4uXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgQWRkaXRpb25hbCBvcHRpb25zLlxyXG4gICAgICovXHJcbiAgICBjbGVhcihvcHRpb25zKSB7XHJcbiAgICAgICAgLy8gLi4uXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBTaG93cyBvciBoaWRlcyB0aGUgY2xpcC5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtzaG93XSBXaGV0aGVyIHRvIHNob3cgdGhlIGNsaXAuIElmIG9taXR0ZWQsIHRvZ2dsZXMgaXRzIHZpc2liaWxpdHkuXHJcbiAgICAgKi9cclxuICAgIHRvZ2dsZShzaG93KSB7XHJcbiAgICAgICAgLy8gLi4uXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDaGVja3Mgd2hldGhlciB0aGUgY2xpcCBpcyB2aXNpYmxlLlxyXG4gICAgICpcclxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBXaGV0aGVyIHRoZSBjbGlwIGlzIHZpc2libGUuXHJcbiAgICAgKi9cclxuICAgIGlzVmlzaWJsZSgpIHtcclxuICAgICAgICAvLyAuLi5cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFJlbW92ZXMgdGhlIGNsaXAgZnJvbSB0aGUgRE9NLlxyXG4gICAgICovXHJcbiAgICByZW1vdmUoKSB7XHJcbiAgICAgICAgLy8gLi4uXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBEZXN0cm95cyB0aGUgY2xpcCBhbmQgcmVsZWFzZXMgaXRzIHJlc291cmNlcy5cclxuICAgICAqL1xyXG4gICAgZGVzdHJveSgpIHtcclxuICAgICAgICAvLyAuLi5cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFJlZ2lzdGVycyBhbiBldmVudCBsaXN0ZW5lci5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZSBFdmVudCB0eXBlLlxyXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbihDbGlwRXZlbnQpOiB2b2lkfSBsaXN0ZW5lciBFdmVudCBsaXN0ZW5lci5cclxuICAgICAqIEByZXR1cm5zIHtDbGlwfSBUaGlzIGNsaXAuXHJcbiAgICAgKi9cclxuICAgIG9uKHR5cGUsIGxpc3RlbmVyKSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiB0eXBlICE9PSAnc3RyaW5nJyB8fCB0eXBlLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGV2ZW50IHR5cGU6IGEgbm9uLWVtcHR5IHN0cmluZyBpcyByZXF1aXJlZC4nKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGV2ZW50IGxpc3RlbmVyOiBhIGZ1bmN0aW9uIGlzIHJlcXVpcmVkLicpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBzdGF0ZSA9IF9zdGF0ZXMuZ2V0KHRoaXMpXHJcblxyXG4gICAgICAgIGxldCBsaXN0ZW5lcnMgPSBzdGF0ZS5saXN0ZW5lcnMuZ2V0KHR5cGUpXHJcblxyXG4gICAgICAgIGlmICghbGlzdGVuZXJzKSB7XHJcbiAgICAgICAgICAgIHN0YXRlLmxpc3RlbmVycy5zZXQodHlwZSwgbGlzdGVuZXJzID0gbmV3IFNldCgpKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGlzdGVuZXJzLmFkZChsaXN0ZW5lcilcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXNcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFJlbW92ZXMgYW4gZXZlbnQgbGlzdGVuZXIuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgRXZlbnQgdHlwZS5cclxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb24oQ2xpcEV2ZW50KTogdm9pZH0gbGlzdGVuZXIgRXZlbnQgbGlzdGVuZXIuXHJcbiAgICAgKiBAcmV0dXJucyB7Q2xpcH0gVGhpcyBjbGlwLlxyXG4gICAgICovXHJcbiAgICBvZmYodHlwZSwgbGlzdGVuZXIpIHtcclxuICAgICAgICBpZiAodHlwZW9mIHR5cGUgIT09ICdzdHJpbmcnIHx8IHR5cGUubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgZXZlbnQgdHlwZTogYSBub24tZW1wdHkgc3RyaW5nIGlzIHJlcXVpcmVkLicpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgZXZlbnQgbGlzdGVuZXI6IGEgZnVuY3Rpb24gaXMgcmVxdWlyZWQuJylcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHN0YXRlID0gX3N0YXRlcy5nZXQodGhpcylcclxuICAgICAgICBjb25zdCBsaXN0ZW5lcnMgPSBzdGF0ZS5saXN0ZW5lcnMuZ2V0KHR5cGUpXHJcblxyXG4gICAgICAgIGlmIChsaXN0ZW5lcnMpIHtcclxuICAgICAgICAgICAgbGlzdGVuZXJzLmRlbGV0ZShsaXN0ZW5lcilcclxuXHJcbiAgICAgICAgICAgIGlmIChsaXN0ZW5lcnMuc2l6ZSA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgc3RhdGUubGlzdGVuZXJzLmRlbGV0ZSh0eXBlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdGhpc1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogRmlyZXMgYW4gZXZlbnQgc3luY2hyb25vdXNseS5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xDbGlwRXZlbnR8e3R5cGU6IHN0cmluZywgZGV0YWlsPzogKn19IGV2ZW50IEV2ZW50IHRvIGZpcmUuXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnM9e31dIERpc3BhdGNoIG9wdGlvbnMuXHJcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW58J3Bvc3QnfSBbb3B0aW9ucy5zcHJlYWQ9ZmFsc2VdXHJcbiAgICAgKiBXaGV0aGVyIHRvIHByb3BhZ2F0ZSB0byBkZXNjZW5kYW50czogdHJ1ZSBmb3IgcHJlb3JkZXIsICdwb3N0JyBmb3IgcG9zdG9yZGVyLlxyXG4gICAgICogQHJldHVybnMge0NsaXB9IFRoaXMgY2xpcC5cclxuICAgICAqL1xyXG4gICAgZmlyZShldmVudCwgeyBzcHJlYWQgPSBmYWxzZSB9ID0ge30pIHtcclxuICAgICAgICAvLyBTZSBub3JtYWxpemEgZWwgZXZlbnRvLlxyXG4gICAgICAgIGlmICghKGV2ZW50IGluc3RhbmNlb2YgQ2xpcEV2ZW50KSkge1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIGV2ZW50ID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICAgICAgZXZlbnQgPSBuZXcgQ2xpcEV2ZW50KGV2ZW50KVxyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBldmVudCA9PT0gJ29iamVjdCcgJiYgZXZlbnQgIT09IG51bGwgJiYgdHlwZW9mIGV2ZW50LnR5cGUgPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgICAgICAgICBldmVudCA9IG5ldyBDbGlwRXZlbnQoZXZlbnQudHlwZSwgZXZlbnQuZGV0YWlsKVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcclxuICAgICAgICAgICAgICAgICAgICAnSW52YWxpZCBldmVudDogZXhwZWN0ZWQgYSB0eXBlIHN0cmluZywgYSBDbGlwRXZlbnQsIG9yIGFuIG9iamVjdCB3aXRoIGEgc3RyaW5nIFwidHlwZVwiIHByb3BlcnR5LidcclxuICAgICAgICAgICAgICAgIClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gU2UgdmFsaWRhbiBsYXMgb3BjaW9uZXMgYWRpY2lvbmFsZXMuXHJcbiAgICAgICAgaWYgKHNwcmVhZCAhPT0gZmFsc2UgJiYgc3ByZWFkICE9PSB0cnVlICYmIHNwcmVhZCAhPT0gJ3Bvc3QnKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgZXZlbnQgc3ByZWFkOiBleHBlY3RlZCBmYWxzZSwgdHJ1ZSwgb3IgXCJwb3N0XCIuJylcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGV2ZW50U3RhdGUgPSBfZXZlbnRTdGF0ZXMuZ2V0KGV2ZW50KVxyXG5cclxuICAgICAgICAvLyBTZSBpbXBpZGUgZW1pdGlyIGxhIG1pc21hIGluc3RhbmNpYSBkZWwgZXZlbnRvIG1pZW50cmFzIHNlIGVzdMOhIHByb2Nlc2FuZG8uXHJcbiAgICAgICAgaWYgKGV2ZW50U3RhdGUudGFyZ2V0ICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBDbGlwRXJyb3IoJ1RoZSBldmVudCBpcyBhbHJlYWR5IGJlaW5nIGRpc3BhdGNoZWQuJylcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGRpc3BhdGNoID0gY2xpcCA9PiB7XHJcbiAgICAgICAgICAgIC8vIFNlIHByb3BhZ2EgZW4gcG9zdG9yZGVuLlxyXG4gICAgICAgICAgICBpZiAoc3ByZWFkID09PSAncG9zdCcpIHtcclxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgY2xpcC5jaGlsZENsaXBzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZGlzcGF0Y2goY2hpbGQpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIFNlIGVqZWN1dGFuIGxvcyBsaXN0ZW5lcnMgZGUgZXN0ZSBjbGlwLlxyXG4gICAgICAgICAgICBjb25zdCBzdGF0ZSA9IF9zdGF0ZXMuZ2V0KGNsaXApXHJcbiAgICAgICAgICAgIGNvbnN0IGxpc3RlbmVycyA9IHN0YXRlLmxpc3RlbmVycy5nZXQoZXZlbnQudHlwZSlcclxuXHJcbiAgICAgICAgICAgIGlmIChsaXN0ZW5lcnMpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHByZXZpb3VzVGFyZ2V0ID0gZXZlbnRTdGF0ZS5jdXJyZW50VGFyZ2V0XHJcbiAgICAgICAgICAgICAgICBldmVudFN0YXRlLmN1cnJlbnRUYXJnZXQgPSBjbGlwXHJcblxyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGxpc3RlbmVyIG9mIFsuLi5saXN0ZW5lcnNdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaXN0ZW5lci5jYWxsKGNsaXAsIGV2ZW50KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYEVycm9yIGNhbGxpbmcgZXZlbnQgbGlzdGVuZXIgXCIke2V2ZW50LnR5cGV9XCIgaW4gY2xpcCBcIiR7Y2xpcC5jbGlwTmFtZX1cIjpgLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVyclxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSBmaW5hbGx5IHtcclxuICAgICAgICAgICAgICAgICAgICBldmVudFN0YXRlLmN1cnJlbnRUYXJnZXQgPSBwcmV2aW91c1RhcmdldFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBTZSBwcm9wYWdhIGVuIHByZW9yZGVuLlxyXG4gICAgICAgICAgICBpZiAoc3ByZWFkID09PSB0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIGNsaXAuY2hpbGRDbGlwcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGRpc3BhdGNoKGNoaWxkKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBldmVudFN0YXRlLnRhcmdldCA9IHRoaXNcclxuXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgZGlzcGF0Y2godGhpcylcclxuICAgICAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgICAgICBldmVudFN0YXRlLnRhcmdldCA9IG51bGxcclxuICAgICAgICAgICAgZXZlbnRTdGF0ZS5jdXJyZW50VGFyZ2V0ID0gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXNcclxuICAgIH1cclxuXHJcbn1cclxuXHJcblxyXG4vKipcclxuICogUGVyZm9ybXMgdGhlIGNsaXAgaW5jbHVzaW9uLlxyXG4gKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAdGhpcyB7Q2xpcH1cclxuICogQHNlZSBDbGlwI2luY2x1ZGVcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIF9pbmNsdWRlKHRhcmdldCwgb3B0aW9ucyA9IHt9KSB7XHJcbiAgICAvLyBTZSB2YWxpZGEgZWwgZGVzdGluby5cclxuICAgIGlmICghdGFyZ2V0IHx8ICh0YXJnZXQubm9kZVR5cGUgIT09IE5vZGUuRUxFTUVOVF9OT0RFICYmIHRhcmdldC5ub2RlVHlwZSAhPT0gTm9kZS5DT01NRU5UX05PREUpKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCB0YXJnZXQ6IG11c3QgYmUgYW4gRWxlbWVudCBvciBDb21tZW50LicpXHJcbiAgICB9XHJcblxyXG4gICAgLy8gU2UgdmFsaWRhIGxhIHBvc2ljacOzbiBlc3BlY2lmaWNhZGEgeSBzZSByZXRpcmEgbGEgb3BjacOzbiBwYXJhIGV2aXRhciBhcnJhc3RyYXJsYS5cclxuICAgIGNvbnN0IHBvc2l0aW9uID0gb3B0aW9ucy5wb3NpdGlvbiA/PyBDbGlwLlBvc2l0aW9uLmVuZFxyXG4gICAgaWYgKCFPYmplY3QudmFsdWVzKENsaXAuUG9zaXRpb24pLmluY2x1ZGVzKHBvc2l0aW9uKSkge1xyXG4gICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKGBJbnZhbGlkIHBvc2l0aW9uOiAke1N0cmluZyhwb3NpdGlvbil9LmApXHJcbiAgICB9XHJcbiAgICBkZWxldGUgb3B0aW9ucy5wb3NpdGlvblxyXG5cclxuICAgIC8vIExvcyBjb21lbnRhcmlvcyBubyBwdWVkZW4gY29udGVuZXIgbm9kb3MuXHJcbiAgICBpZiAodGFyZ2V0Lm5vZGVUeXBlID09PSBOb2RlLkNPTU1FTlRfTk9ERSAmJiAocG9zaXRpb24gPT09IENsaXAuUG9zaXRpb24uc3RhcnQgfHwgcG9zaXRpb24gPT09IENsaXAuUG9zaXRpb24uZW5kKSkge1xyXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgcG9zaXRpb246IHN0YXJ0IGFuZCBlbmQgcmVxdWlyZSBhbiBFbGVtZW50IHRhcmdldC4nKVxyXG4gICAgfVxyXG5cclxuICAgIC8vIFNlIGNvbXBydWViYSBsYXMgcG9zaWNpb25lcyBxdWUgcmVxdWllcmVuIHF1ZSBlbCBlbGVtZW50byBkZXN0aW5vIGVzdMOpIGNvbnRlbmlkbyBlbiBvdHJvIGVsZW1lbnRvLlxyXG4gICAgaWYgKFtDbGlwLlBvc2l0aW9uLmJlZm9yZSwgQ2xpcC5Qb3NpdGlvbi5hZnRlciwgQ2xpcC5Qb3NpdGlvbi5yZXBsYWNlXS5pbmNsdWRlcyhwb3NpdGlvbikgJiYgIXRhcmdldC5wYXJlbnROb2RlKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IENsaXBFcnJvcihgSW52YWxpZCB0YXJnZXQ6IG11c3QgaGF2ZSBhIHBhcmVudCBub2RlIGZvciBwb3NpdGlvbiBcIiR7cG9zaXRpb259XCIuYClcclxuICAgIH1cclxuXHJcbiAgICAvLyBTZSByZWN1cGVyYSBlbCBlc3RhZG8gZGVsIGNsaXAuXHJcbiAgICBjb25zdCBzdGF0ZSA9IF9zdGF0ZXMuZ2V0KHRoaXMpXHJcblxyXG4gICAgLy8gU2UgZ2VuZXJhIGxhIHJhw616IHNpIHRvZGF2w61hIG5vIGV4aXN0ZS4gICAgXHJcbiAgICBsZXQgcm9vdCA9IHN0YXRlLnJvb3QsIGZyZXNoID0gZmFsc2VcclxuICAgIGlmICghcm9vdCkge1xyXG4gICAgICAgIGNvbnN0IGN0eCA9IG5ldyBSZW5kZXJDb250ZXh0KHRoaXMpXHJcbiAgICAgICAgXHJcbiAgICAgICAgbGV0IHJlc3VsdFxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHJlc3VsdCA9IGF3YWl0IHRoaXMucmVuZGVyKGN0eCwgb3B0aW9ucylcclxuICAgICAgICB9IGNhdGNoIChjYXVzZSkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgQ2xpcEVycm9yKGBVbmFibGUgdG8gcmVuZGVyIGNsaXAgXCIke3RoaXMuY2xpcE5hbWV9XCIuYCwgeyBjYXVzZSB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChyZXN1bHQgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgQ2xpcEVycm9yKGBNaXNzaW5nIHJlbmRlciBvdXRwdXQgZm9yIGNsaXAgXCIke3RoaXMuY2xpcE5hbWV9XCIuYClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChyZXN1bHQubm9kZVR5cGUgPT09IE5vZGUuRUxFTUVOVF9OT0RFKSB7XHJcbiAgICAgICAgICAgIHJvb3QgPSByZXN1bHQ7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiByZXN1bHQgPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgICAgICAgICBjdHgucHJpbnQocmVzdWx0KVxyXG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gYXdhaXQgY3R4LnJlc29sdmUoKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAocmVzdWx0Lm5vZGVUeXBlID09PSBOb2RlLkRPQ1VNRU5UX0ZSQUdNRU5UX05PREUpIHtcclxuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiByZXN1bHQuY2hpbGROb2Rlcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlLm5vZGVUeXBlID09PSBOb2RlLkVMRU1FTlRfTk9ERSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocm9vdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IENsaXBFcnJvcignTXVsdGlwbGUgcm9vdCBlbGVtZW50cyBhcmUgbm90IGFsbG93ZWQuJylcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByb290ID0gbm9kZVxyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobm9kZS5ub2RlVHlwZSA9PT0gTm9kZS5URVhUX05PREUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUuZGF0YS50cmltKCkubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IENsaXBFcnJvcignVGV4dCBvdXRzaWRlIHRoZSByb290IGVsZW1lbnQgaXMgbm90IGFsbG93ZWQuJylcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobm9kZS5ub2RlVHlwZSAhPT0gTm9kZS5DT01NRU5UX05PREUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IENsaXBFcnJvcihgVW5zdXBwb3J0ZWQgbm9kZSB0eXBlICgke25vZGUubm9kZVR5cGV9KSBvdXRzaWRlIHRoZSByb290IGVsZW1lbnQuYClcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghcm9vdCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgQ2xpcEVycm9yKCdNaXNzaW5nIGNsaXAgcm9vdDogcmVuZGVyKCkgbXVzdCByZXR1cm4gYW4gRWxlbWVudCwgJyArIFxyXG4gICAgICAgICAgICAgICAgJ29yIGEgRG9jdW1lbnRGcmFnbWVudC9IVE1MIHN0cmluZyBjb250YWluaW5nIGEgc2luZ2xlIHJvb3QgZWxlbWVudC4nKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gU2UgY29tcHJ1ZWJhIHF1ZSBlbCBtaXNtbyBlbGVtZW50byBubyBlc3TDqSBhc29jaWFkbyBhIG90cm8gY2xpcC5cclxuICAgICAgICBjb25zdCBjbGlwID0gX3Jvb3RzLmdldChyb290KVxyXG4gICAgICAgIGlmIChjbGlwICYmIGNsaXAgIT09IHRoaXMpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IENsaXBFcnJvcignQ2xpcCByb290IGFscmVhZHkgYmVsb25ncyB0byBhbm90aGVyIGNsaXAuJylcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFNlIGlkZW50aWZpY2EgZWwgZWxlbWVudG8gcmHDrXogZGVsIGNsaXAuXHJcbiAgICAgICAgcm9vdC5zZXRBdHRyaWJ1dGUoJ2RhdGEtY2xpcCcsIHRoaXMuY2xpcE5hbWUpXHJcblxyXG4gICAgICAgIC8vIFNlIGluZGljYSBxdWUgbGEgcmHDrXogZXMgZGUgcmVjaWVudGUgY3JlYWNpw7NuLlxyXG4gICAgICAgIGZyZXNoID0gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIC8vIEVsIGRlc3Rpbm8gcHVlZGUgaGFiZXIgY2FtYmlhZG8gZHVyYW50ZSBlbCByZW5kZXJpemFkby5cclxuICAgIGlmIChbQ2xpcC5Qb3NpdGlvbi5iZWZvcmUsIENsaXAuUG9zaXRpb24uYWZ0ZXIsIENsaXAuUG9zaXRpb24ucmVwbGFjZV0uaW5jbHVkZXMocG9zaXRpb24pICYmICF0YXJnZXQucGFyZW50Tm9kZSkge1xyXG4gICAgICAgIHRocm93IG5ldyBDbGlwRXJyb3IoJ1RoZSB0YXJnZXQgZWxlbWVudCBtdXN0IGhhdmUgYSBwYXJlbnQgZm9yIHRoaXMgaW5jbHVzaW9uIHBvc2l0aW9uLicpXHJcbiAgICB9XHJcblxyXG4gICAgLy8gU2UgcmVjaGF6YW4gZGVzdGlub3MgZGVudHJvIGRlIGxhIHByb3BpYSByYcOtei5cclxuICAgIGlmIChyb290LmNvbnRhaW5zKHRhcmdldCkpIHtcclxuICAgICAgICB0aHJvdyBuZXcgQ2xpcEVycm9yKCdUaGUgdGFyZ2V0IGVsZW1lbnQgY2Fubm90IGJlIGNvbnRhaW5lZCB3aXRoaW4gdGhlIGNsaXAgcm9vdC4nKVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChmcmVzaCkge1xyXG4gICAgICAgIC8vIFNlIHZpbmN1bGEgZWwgZWxlbWVudG8gcmHDrXogY29uIGxhIGluc3RhbmNpYSBkZWwgY2xpcC4gXHJcbiAgICAgICAgX3Jvb3RzLnNldChyb290LCB0aGlzKVxyXG5cclxuICAgICAgICAvLyBTZSBndWFyZGEgZWwgZWxlbWVudG8gcmHDrXogZW4gZWwgZXN0YWRvIGludGVybm8gZGUgbGEgaW5zdGFuY2lhLlxyXG4gICAgICAgIHN0YXRlLnJvb3QgPSByb290XHJcblxyXG4gICAgICAgIC8vIFJlZmVyZW5jaWEgcGFyYSBkZXB1cmFjacOzbi5cclxuICAgICAgICAvLyBUT0RPOiBEYXJsZSB1biBwZW5zYWRhIGEgbGEgbm9tZW5jbGF0dXJhIGRlIGxhIHByb3BpZWRhZC5cclxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkocm9vdCwgJ19fY2xpcCcsIHtcclxuICAgICAgICAgICAgdmFsdWU6IHRoaXMsXHJcbiAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxyXG4gICAgICAgIH0pXHJcbiAgICB9IFxyXG5cclxuICAgIC8vIFNlIGd1YXJkYSBzaSBsYSByYcOteiBlc3RhYmEgY29uZWN0YWRhIGFudGVzIGRlIGluY2x1aXJsYSBlbiBlbCBkZXN0aW5vLlxyXG4gICAgY29uc3Qgd2FzQ29ubmVjdGVkID0gcm9vdC5pc0Nvbm5lY3RlZFxyXG5cclxuICAgIC8vIFJlY2VwdG9yZXMgZGUgZXZlbnRvcy5cclxuICAgIGNvbnN0IGV2ZW50VGFyZ2V0cyA9IHtcclxuICAgICAgICBkZXRhY2g6IFtdLCBhdHRhY2g6IFtdICAgICAgICBcclxuICAgIH1cclxuXHJcbiAgICAvLyBTZSBpbnNlcnRhIGxhIHJhw616LlxyXG4gICAgc3dpdGNoIChwb3NpdGlvbikge1xyXG4gICAgICAgIGNhc2UgQ2xpcC5Qb3NpdGlvbi5hZnRlcjpcclxuICAgICAgICAgICAgdGFyZ2V0LmFmdGVyKHJvb3QpXHJcbiAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgIGNhc2UgQ2xpcC5Qb3NpdGlvbi5iZWZvcmU6XHJcbiAgICAgICAgICAgIHRhcmdldC5iZWZvcmUocm9vdClcclxuICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgY2FzZSBDbGlwLlBvc2l0aW9uLnJlcGxhY2U6XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbm5lY3RlZCA9IHRhcmdldC5pc0Nvbm5lY3RlZFxyXG5cclxuICAgICAgICAgICAgaWYgKHRhcmdldC5jb250YWlucyhyb290KSkge1xyXG4gICAgICAgICAgICAgICAgdGFyZ2V0LmJlZm9yZShyb290KVxyXG4gICAgICAgICAgICAgICAgdGFyZ2V0LnJlbW92ZSgpXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0YXJnZXQucmVwbGFjZVdpdGgocm9vdClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGNvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY29sbGVjdCA9IGVsZW1lbnQgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgWy4uLmVsZW1lbnQuY2hpbGRyZW5dKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbGxlY3QoY2hpbGQpXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNsaXAgPSBfcm9vdHMuZ2V0KGVsZW1lbnQpXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNsaXApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRUYXJnZXRzLmRldGFjaC5wdXNoKGNsaXApXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGNvbGxlY3QodGFyZ2V0KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICBjYXNlIENsaXAuUG9zaXRpb24uc3RhcnQ6XHJcbiAgICAgICAgICAgIHRhcmdldC5wcmVwZW5kKHJvb3QpXHJcbiAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgIGNhc2UgQ2xpcC5Qb3NpdGlvbi5lbmQ6XHJcbiAgICAgICAgICAgIHRhcmdldC5hcHBlbmQocm9vdClcclxuICAgICAgICAgICAgYnJlYWtcclxuICAgIH1cclxuXHJcbiAgICAvLyBTZSBkZXRlcm1pbmEgc2kgZW1pdGlyIGVsIGV2ZW50byBcImF0dGFjaFwiIG8gXCJkZXRhY2hcIiBzb2JyZSBlbCBjbGlwIGluY2x1w61kbyB5IGxvcyBjbGlwcyBjb250ZW5pZG9zLlxyXG4gICAgY29uc3QgaXNDb25uZWN0ZWQgPSByb290LmlzQ29ubmVjdGVkXHJcbiAgICBpZiAoaXNDb25uZWN0ZWQgIT09IHdhc0Nvbm5lY3RlZCkge1xyXG4gICAgICAgIGNvbnN0IGNvbGxlY3QgPSBlbGVtZW50ID0+IHtcclxuICAgICAgICAgICAgY29uc3QgY2xpcCA9IF9yb290cy5nZXQoZWxlbWVudClcclxuXHJcbiAgICAgICAgICAgIGlmIChjbGlwICYmIGlzQ29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgICAgICBldmVudFRhcmdldHMuYXR0YWNoLnB1c2goY2xpcCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgZWxlbWVudC5jaGlsZHJlbikge1xyXG4gICAgICAgICAgICAgICAgY29sbGVjdChjaGlsZClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGNsaXAgJiYgIWlzQ29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgICAgICBldmVudFRhcmdldHMuZGV0YWNoLnB1c2goY2xpcCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbGxlY3Qocm9vdClcclxuICAgIH1cclxuXHJcbiAgICAvLyBTZSBlbWl0ZW4gbG9zIGV2ZW50b3MgY29ycmVzcG9uZGllbnRlcy5cclxuICAgIGZvciAoY29uc3QgZXZlbnQgb2YgT2JqZWN0LmtleXMoZXZlbnRUYXJnZXRzKSkge1xyXG4gICAgICAgIGZvciAoY29uc3QgY2xpcCBvZiBldmVudFRhcmdldHNbZXZlbnRdKSB7XHJcbiAgICAgICAgICAgIC8vIFRPRE86IEV2YWx1YXIgcXVlIHBhc2Egc2kgbGEgcHJvcGFnYWNpw7NuIGRlbCBldmVudG8gZmFsbGEuXHJcbiAgICAgICAgICAgIGNsaXAuZmlyZShldmVudCk7XHJcbiAgICAgICAgfSAgICBcclxuICAgIH1cclxuXHJcbiAgICAvLyBTZSBsbGFtYSBhbCByZWFkeSBlbiBjYWRhIGluY2x1c2nDs24uXHJcbiAgICB0cnkge1xyXG4gICAgICAgIGF3YWl0IHRoaXMucmVhZHkoeyAuLi5vcHRpb25zLCBmcmVzaCwgcmVsb2FkOiBmYWxzZSB9KVxyXG4gICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IENsaXBFcnJvcihgVW5hYmxlIHRvIHJlYWR5IGNsaXAgXCIke3RoaXMuY2xpcE5hbWV9XCIuYCwgeyBjYXVzZTogZXJyIH0pXHJcbiAgICB9XHJcblxyXG4gICAgLy8gU2UgaW5pY2lhIGxhIGNhcmdhIGRlIGRhdG9zIGFkaWNpb25hbGVzLlxyXG4gICAgaWYgKCFzdGF0ZS5sb2FkU3RhcnRlZCkge1xyXG4gICAgICAgIHN0YXRlLmxvYWRTdGFydGVkID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgdm9pZCAoYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICBsZXQgZGF0YVxyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgZGF0YSA9IGF3YWl0IHRoaXMubG9hZCh7IC4uLm9wdGlvbnMsIHJlbG9hZDogZmFsc2UgfSlcclxuICAgICAgICAgICAgICAgIHN0YXRlLmxvYWRUaW1lID0gRGF0ZS5ub3coKSAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB9IGNhdGNoIChjYXVzZSkge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IENsaXBFcnJvcihgVW5hYmxlIHRvIGxvYWQgZGF0YSBmb3IgY2xpcCBcIiR7dGhpcy5jbGlwTmFtZX1cIi5gLCB7IGNhdXNlIH0pXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnVwZGF0ZSh7IC4uLm9wdGlvbnMsIGRhdGEsIHJlbG9hZDogZmFsc2UgfSlcclxuICAgICAgICAgICAgfSBjYXRjaCAoY2F1c2UpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBDbGlwRXJyb3IoYFVuYWJsZSB0byB1cGRhdGUgY2xpcCBcIiR7dGhpcy5jbGlwTmFtZX1cIi5gLCB7IGNhdXNlIH0pXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KSgpLmNhdGNoKGVyciA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvLyBTZSBkZXZ1ZWx2ZSBsYSBwcm9waWEgaW5zdGFuY2lhLlxyXG4gICAgcmV0dXJuIHRoaXNcclxufVxyXG5cclxuXHJcbi8qIENMSVAgRVZFTlRcclxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXHJcbi8qKlxyXG4gKiBJbnRlcm5hbCBldmVudCBzdGF0ZXMuXHJcbiAqIFxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAdHlwZSB7V2Vha01hcDxDbGlwRXZlbnQsIHtcclxuICogICAgIHRhcmdldDogQ2xpcHxudWxsLFxyXG4gKiAgICAgY3VycmVudFRhcmdldDogQ2xpcHxudWxsXHJcbiAqIH0+fVxyXG4gKi9cclxuY29uc3QgX2V2ZW50U3RhdGVzID0gbmV3IFdlYWtNYXAoKVxyXG5cclxuLyoqXHJcbiAqIEV2ZW50IGRpc3BhdGNoZWQgYnkgYSBjbGlwLlxyXG4gKi9cclxuY2xhc3MgQ2xpcEV2ZW50IHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIENyZWF0ZXMgYSBjbGlwIGV2ZW50LlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIEV2ZW50IHR5cGUuXHJcbiAgICAgKiBAcGFyYW0geyp9IFtkZXRhaWxdIEV2ZW50IGRhdGEuXHJcbiAgICAgKi9cclxuICAgIGNvbnN0cnVjdG9yKHR5cGUsIGRldGFpbCkge1xyXG4gICAgICAgIGlmICh0eXBlb2YgdHlwZSAhPT0gJ3N0cmluZycgfHwgdHlwZS5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBldmVudCB0eXBlOiBhIG5vbi1lbXB0eSBzdHJpbmcgaXMgcmVxdWlyZWQuJylcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIF9ldmVudFN0YXRlcy5zZXQodGhpcywge1xyXG4gICAgICAgICAgICB0YXJnZXQ6IG51bGwsXHJcbiAgICAgICAgICAgIGN1cnJlbnRUYXJnZXQ6IG51bGxcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XHJcbiAgICAgICAgICAgIHR5cGU6IHtcclxuICAgICAgICAgICAgICAgIHZhbHVlOiB0eXBlLFxyXG4gICAgICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBkZXRhaWw6IHtcclxuICAgICAgICAgICAgICAgIHZhbHVlOiBkZXRhaWwsXHJcbiAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2xpcCB0aGF0IGluaXRpYXRlZCB0aGUgY3VycmVudCBkaXNwYXRjaC5cclxuICAgICAqXHJcbiAgICAgKiBAdHlwZSB7Q2xpcHxudWxsfVxyXG4gICAgICogQHJlYWRvbmx5XHJcbiAgICAgKi9cclxuICAgIGdldCB0YXJnZXQoKSB7XHJcbiAgICAgICAgcmV0dXJuIF9ldmVudFN0YXRlcy5nZXQodGhpcykudGFyZ2V0XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDbGlwIHdob3NlIGxpc3RlbmVycyBhcmUgY3VycmVudGx5IGJlaW5nIGNhbGxlZC5cclxuICAgICAqXHJcbiAgICAgKiBAdHlwZSB7Q2xpcHxudWxsfVxyXG4gICAgICogQHJlYWRvbmx5XHJcbiAgICAgKi9cclxuICAgIGdldCBjdXJyZW50VGFyZ2V0KCkge1xyXG4gICAgICAgIHJldHVybiBfZXZlbnRTdGF0ZXMuZ2V0KHRoaXMpLmN1cnJlbnRUYXJnZXRcclxuICAgIH1cclxuXHJcbn1cclxuXHJcblxyXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cclxuLyoqXHJcbiAqIENsaXAgRXJyb3IuXHJcbiAqL1xyXG5jbGFzcyBDbGlwRXJyb3IgZXh0ZW5kcyBFcnJvciB7XHJcblxyXG4gICAgLy8gQ8OzZGlnb3MgZGUgZXJyb3I6XHJcbiAgICBzdGF0aWMgYWxyZWFkeURlZmluZWQgICA9ICdhbHJlYWR5X2RlZmluZWQnXHJcbiAgICBzdGF0aWMgcm9vdFJlcXVpcmVkICAgICA9ICdyb290X3JlcXVpcmVkJ1xyXG4gICAgc3RhdGljIGxvYWRGYWlsZWQgICAgICAgPSAnbG9hZF9mYWlsZWQnXHJcbiAgICBzdGF0aWMgbm90RGVmaW5lZCAgICAgICA9ICdub3RfZGVmaW5lZCdcclxuICAgIHN0YXRpYyBub3RGb3VuZCAgICAgICAgID0gJ25vdF9mb3VuZCdcclxuXHJcbiAgICAvKipcclxuICAgICAqIENvbnN0cnVjdG9yLlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgRGVzY3JpcGNpw7NuIGRlbCBlcnJvci5cclxuICAgICAqIEBwYXJhbSB7eyBjb2RlPzogc3RyaW5nLCBjYXVzZT86IEVycm9yIHwgRXJyb3JbXSB9fSBbb3B0aW9uc10gT3BjaW9uZXMgYWRpY2lvbmFsZXMuXHJcbiAgICAgKi9cclxuICAgIGNvbnN0cnVjdG9yKG1lc3NhZ2UsIHsgY29kZSA9IG51bGwsIGNhdXNlIH0gPSB7fSkge1xyXG4gICAgICAgIHN1cGVyKFN0cmluZyhtZXNzYWdlKSwgY2F1c2UgIT09IHVuZGVmaW5lZCA/IHsgY2F1c2UgfSA6IHVuZGVmaW5lZClcclxuXHJcbiAgICAgICAgdGhpcy5uYW1lID0gJ0NsaXBFcnJvcidcclxuICAgICAgICB0aGlzLmNvZGUgPSBjb2RlXHJcblxyXG4gICAgICAgIGlmIChFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSkge1xyXG4gICAgICAgICAgICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCBDbGlwRXJyb3IpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5cclxuLyogUkVOREVSIENPTlRFWFRcclxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXHJcbi8qKlxyXG4gKiBCdWlsZHMgSFRNTCBvdXRwdXQgYW5kIHJlc29sdmVzIG5lc3RlZCBjbGlwIGFuZCB0ZW1wbGF0ZSBpbmNsdXNpb25zLlxyXG4gKlxyXG4gKiBFYWNoIGNvbnRleHQgYmVsb25ncyB0byBhIGNsaXAgYW5kIHJlcHJlc2VudHMgYSBzaW5nbGUgcmVuZGVyaW5nIG9wZXJhdGlvbi4gSW5jbHVzaW9uIG1hcmtlcnMgbXVzdCBhcHBlYXIgZXhhY3RseSBcclxuICogb25jZSBpbiB0aGUgZ2VuZXJhdGVkIEhUTUwuXHJcbiAqL1xyXG5jbGFzcyBSZW5kZXJDb250ZXh0IHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEhUTUwgb3V0cHV0IGNodW5rcy5cclxuICAgICAqXHJcbiAgICAgKiBAdHlwZSB7c3RyaW5nW119XHJcbiAgICAgKi9cclxuICAgICNvdXQgPSBbXVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2xpcCBhc3NvY2lhdGVkIHdpdGggdGhpcyByZW5kZXJpbmcgb3BlcmF0aW9uLlxyXG4gICAgICpcclxuICAgICAqIEB0eXBlIHtDbGlwfVxyXG4gICAgICovXHJcbiAgICAjY2xpcCA9IG51bGxcclxuXHJcbiAgICAvKipcclxuICAgICAqIFBlbmRpbmcgaW5jbHVzaW9ucywgaW4gcmVnaXN0cmF0aW9uIG9yZGVyLlxyXG4gICAgICpcclxuICAgICAqIEB0eXBlIHtBcnJheTx7bmFtZTogc3RyaW5nLCBvcHRpb25zOiBPYmplY3R9Pn1cclxuICAgICAqL1xyXG4gICAgI2luY2x1ZGVzID0gW11cclxuXHJcbiAgICAvKipcclxuICAgICAqIFdoZXRoZXIgcmVzb2x1dGlvbiBoYXMgc3RhcnRlZC5cclxuICAgICAqXHJcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cclxuICAgICAqL1xyXG4gICAgI3Jlc29sdmVTdGFydGVkID0gZmFsc2VcclxuXHJcbiAgICAvKipcclxuICAgICAqIENyZWF0ZXMgYSByZW5kZXJpbmcgY29udGV4dCBhc3NvY2lhdGVkIHdpdGggYSBjbGlwLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7Q2xpcH0gY2xpcCBBc3NvY2lhdGVkIGNsaXAuXHJcbiAgICAgKi9cclxuICAgIGNvbnN0cnVjdG9yKGNsaXApIHtcclxuICAgICAgICB0aGlzLiNjbGlwID0gY2xpcFxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmVnaXN0ZXJzIGFuIGluY2x1c2lvbiBhbmQgcmV0dXJucyBpdHMgSFRNTCBjb21tZW50IG1hcmtlci5cclxuICAgICAqXHJcbiAgICAgKiBOYW1lcyBiZWdpbm5pbmcgd2l0aCB0aGUgY2xpcCBwcmVmaXggaWRlbnRpZnkgY2xpcHMuIE90aGVyIG5hbWVzIGlkZW50aWZ5IHRlbXBsYXRlcy5cclxuICAgICAqXHJcbiAgICAgKiBUaGUgcmV0dXJuZWQgbWFya2VyIG11c3QgYmUgaW5jb3Jwb3JhdGVkIGludG8gdGhlIEhUTUwgb3V0cHV0LiBJbmNsdXNpb24gb3B0aW9ucyBhcmUgc2hhbGxvdy1jb3BpZWQgd2hlbiByZWdpc3RlcmVkLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIENsaXAgb3IgdGVtcGxhdGUgbmFtZS5cclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucz17fV0gSW5jbHVzaW9uIG9wdGlvbnMuXHJcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIGNvbW1lbnQgbWFya2VyLlxyXG4gICAgICovXHJcbiAgICBpbmNsdWRlKG5hbWUsIG9wdGlvbnMpIHtcclxuICAgICAgICB0aGlzLiNhc3NlcnRSZXNvbHZlTm90U3RhcnRlZCgpXHJcblxyXG4gICAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy4jaW5jbHVkZXMubGVuZ3RoXHJcbiAgICAgICAgdGhpcy4jaW5jbHVkZXMucHVzaCh7IG5hbWUsIG9wdGlvbnMgfSlcclxuXHJcbiAgICAgICAgcmV0dXJuIGA8IS0tW2NsaXAtc2xvdDoke2luZGV4fV0tLT5gXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBcHBlbmRzIGEgdmFsdWUgdG8gdGhlIEhUTUwgb3V0cHV0LlxyXG4gICAgICpcclxuICAgICAqIFRoZSB2YWx1ZSBpcyBjb252ZXJ0ZWQgdG8gYSBzdHJpbmcgYmVmb3JlIG9wdGlvbmFsbHkgYmVpbmcgZXNjYXBlZC5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0geyp9IHZhbHVlIFZhbHVlIHRvIGFwcGVuZC5cclxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2VzYz1mYWxzZV0gV2hldGhlciB0byBlc2NhcGUgSFRNTCBzcGVjaWFsIGNoYXJhY3RlcnMuXHJcbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cclxuICAgICAqL1xyXG4gICAgcHJpbnQodmFsdWUsIGVzYyA9IGZhbHNlKSB7XHJcbiAgICAgICAgdGhpcy4jYXNzZXJ0UmVzb2x2ZU5vdFN0YXJ0ZWQoKVxyXG5cclxuICAgICAgICB2YWx1ZSA9IFN0cmluZyh2YWx1ZSlcclxuICAgICAgICB0aGlzLiNvdXQucHVzaChlc2MgPyB0aGlzLmVzY2FwZSh2YWx1ZSkgOiB2YWx1ZSlcclxuICAgIH1cclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiBQYXJzZXMgdGhlIGFjY3VtdWxhdGVkIEhUTUwgYW5kIHJlc29sdmVzIGFsbCByZWdpc3RlcmVkIGluY2x1c2lvbnMuXHJcbiAgICAgKlxyXG4gICAgICogSW5jbHVzaW9uIG1hcmtlcnMgYXJlIGxvY2F0ZWQgYmVmb3JlIHJlc29sdmluZyBhbnkgaW5jbHVzaW9uLlxyXG4gICAgICogSW5jbHVzaW9ucyBhcmUgdGhlbiByZXNvbHZlZCBzZXF1ZW50aWFsbHkgaW4gcmVnaXN0cmF0aW9uIG9yZGVyLlxyXG4gICAgICpcclxuICAgICAqIFRoZSByZXN1bHRpbmcgbm9kZXMgYmVsb25nIHRvIGEgZGV0YWNoZWQgRG9jdW1lbnRGcmFnbWVudC5cclxuICAgICAqXHJcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZTxEb2N1bWVudEZyYWdtZW50Pn0gUmVuZGVyZWQgSFRNTCBmcmFnbWVudC5cclxuICAgICAqIEB0aHJvd3Mge0Vycm9yfSBJZiBhbiBpbmNsdXNpb24gbWFya2VyIGlzIGludmFsaWQsIGR1cGxpY2F0ZWQgb3IgbWlzc2luZy5cclxuICAgICAqL1xyXG4gICAgYXN5bmMgcmVzb2x2ZSgpIHtcclxuICAgICAgICBpZiAodGhpcy4jcmVzb2x2ZVN0YXJ0ZWQpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IENsaXBFcnJvcignUmVuZGVyIGNvbnRleHQgcmVzb2x1dGlvbiBoYXMgYWxyZWFkeSBzdGFydGVkLicpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLiNyZXNvbHZlU3RhcnRlZCA9IHRydWVcclxuXHJcbiAgICAgICAgY29uc3QgdGVtcGxhdGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZW1wbGF0ZScpXHJcbiAgICAgICAgdGVtcGxhdGUuaW5uZXJIVE1MID0gdGhpcy4jb3V0LmpvaW4oJycpXHJcblxyXG4gICAgICAgIGNvbnN0IHNsb3RzID0gbmV3IE1hcCgpXHJcblxyXG4gICAgICAgIGNvbnN0IHdhbGtlciA9IGRvY3VtZW50LmNyZWF0ZVRyZWVXYWxrZXIodGVtcGxhdGUuY29udGVudCwgTm9kZUZpbHRlci5TSE9XX0NPTU1FTlQpXHJcblxyXG4gICAgICAgIHdoaWxlICh3YWxrZXIubmV4dE5vZGUoKSkge1xyXG4gICAgICAgICAgICBjb25zdCBub2RlID0gd2Fsa2VyLmN1cnJlbnROb2RlXHJcbiAgICAgICAgICAgIGNvbnN0IG1hdGNoID0gL15cXFtjbGlwLXNsb3Q6KDB8WzEtOV1cXGQqKVxcXSQvLmV4ZWMobm9kZS5kYXRhKVxyXG5cclxuICAgICAgICAgICAgaWYgKCFtYXRjaCkge1xyXG4gICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBOdW1iZXIobWF0Y2hbMV0pXHJcblxyXG4gICAgICAgICAgICBpZiAoaW5kZXggPj0gdGhpcy4jaW5jbHVkZXMubGVuZ3RoIHx8IHNsb3RzLmhhcyhpbmRleCkpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBDbGlwRXJyb3IoYEludmFsaWQgaW5jbHVkZSBzbG90OiAke25vZGUuZGF0YX1gKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBzbG90cy5zZXQoaW5kZXgsIG5vZGUpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoc2xvdHMuc2l6ZSAhPT0gdGhpcy4jaW5jbHVkZXMubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBDbGlwRXJyb3IoYEluY2x1ZGVzIG1pc21hdGNoOiAke3Nsb3RzLnNpemV9IHZzICR7dGhpcy4jaW5jbHVkZXMubGVuZ3RofWApXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuI2luY2x1ZGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHsgbmFtZSwgb3B0aW9ucyB9ID0gdGhpcy4jaW5jbHVkZXNbaV1cclxuXHJcbiAgICAgICAgICAgIGlmIChuYW1lLnN0YXJ0c1dpdGgoX2NsaXBQcmVmaXgpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjbGlwID0gYXdhaXQgY2xpcHMuY3JlYXRlKG5hbWUuc3Vic3RyaW5nKF9jbGlwUHJlZml4Lmxlbmd0aCksIG9wdGlvbnMpXHJcblxyXG4gICAgICAgICAgICAgICAgYXdhaXQgY2xpcC5pbmNsdWRlKHNsb3RzLmdldChpKSwgeyAuLi5vcHRpb25zLCBwb3NpdGlvbjogQ2xpcC5Qb3NpdGlvbi5yZXBsYWNlIH0pXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBmcmFnbWVudCA9IGF3YWl0IGNsaXBzLnJlbmRlcih0aGlzLiNjbGlwLCBuYW1lLCBvcHRpb25zKVxyXG5cclxuICAgICAgICAgICAgICAgIHNsb3RzLmdldChpKS5yZXBsYWNlV2l0aChmcmFnbWVudClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHRlbXBsYXRlLmNvbnRlbnRcclxuICAgIH1cclxuXHJcbiAgICAjYXNzZXJ0UmVzb2x2ZU5vdFN0YXJ0ZWQoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuI3Jlc29sdmVTdGFydGVkKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBDbGlwRXJyb3IoJ0Nhbm5vdCBtb2RpZnkgYSByZW5kZXIgY29udGV4dCBhZnRlciByZXNvbHV0aW9uIGhhcyBzdGFydGVkLicpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ29uY2F0ZW5hdGVzIHRoZSByZXN1bHRzIG9mIGEgc3luY2hyb25vdXMgY2FsbGJhY2sgb3ZlciBhbiBpdGVyYWJsZS5cclxuICAgICAqXHJcbiAgICAgKiBUaGUgY2FsbGJhY2sgcmVjZWl2ZXMgZWFjaCBpdGVtIGFuZCBpdHMgemVyby1iYXNlZCBpdGVyYXRpb24gaW5kZXgsXHJcbiAgICAgKiB3aXRoIHRoZSBhc3NvY2lhdGVkIGNsaXAgYXMgaXRzIHRoaXMgdmFsdWUuXHJcbiAgICAgKiBOdWxsIGFuZCB1bmRlZmluZWQgcmVzdWx0cyBhcmUgb21pdHRlZC4gUmVzdWx0cyBhcmUgbm90IEhUTUwtZXNjYXBlZC5cclxuICAgICAqIE51bGwgb3IgdW5kZWZpbmVkIGl0ZW1zIGFyZSB0cmVhdGVkIGFzIGFuIGVtcHR5IGl0ZXJhYmxlLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7SXRlcmFibGU8Kj58bnVsbHx1bmRlZmluZWR9IGl0ZW1zIEl0ZW1zIHRvIGl0ZXJhdGUgb3Zlci5cclxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb24oKiwgbnVtYmVyKTogKn0gY2FsbGJhY2sgU3luY2hyb25vdXMgcmVuZGVyaW5nIGNhbGxiYWNrLlxyXG4gICAgICogQHJldHVybnMge3N0cmluZ30gQ29uY2F0ZW5hdGVkIGNhbGxiYWNrIHJlc3VsdHMuXHJcbiAgICAgKi9cclxuICAgIGVhY2goaXRlbXMsIGNhbGxiYWNrKSB7XHJcbiAgICAgICAgY29uc3Qgb3V0ID0gW11cclxuICAgICAgICBcclxuICAgICAgICBsZXQgaW5kZXggPSAwXHJcbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zID8/IFtdKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gY2FsbGJhY2suY2FsbCh0aGlzLiNjbGlwLCBpdGVtLCBpbmRleCsrKVxyXG5cclxuICAgICAgICAgICAgaWYgKHZhbHVlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIG91dC5wdXNoKHZhbHVlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gb3V0LmpvaW4oJycpXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDb252ZXJ0cyBhIHZhbHVlIHRvIGEgc3RyaW5nIGFuZCBlc2NhcGVzIEhUTUwgc3BlY2lhbCBjaGFyYWN0ZXJzLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7Kn0gdmFsdWUgVmFsdWUgdG8gZXNjYXBlLlxyXG4gICAgICogQHJldHVybnMge3N0cmluZ30gRXNjYXBlZCBzdHJpbmcuXHJcbiAgICAgKi9cclxuICAgIGVzY2FwZSh2YWx1ZSkge1xyXG4gICAgICAgIHJldHVybiBlc2NhcGUuaHRtbCh2YWx1ZSlcclxuICAgIH1cclxuXHJcbn1cclxuXHJcblxyXG4vKiBDTElQUyBPQkpFQ1RcclxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXHJcblxyXG4vKipcclxuICogRm9ybWF0byBkZWwgbm9tYnJlIGRlIGxvcyBjbGlwcyAocGF0aC1saWtlKSwgdW5vIG8gdmFyaW9zIHNlZ21lbnRvcyBzZXBhcmFkb3MgXHJcbiAqIHBvciBcIi9cIiwgY2FkYSBzZWdtZW50bzogW0EtWmEtejAtOV8tXStcclxuICogXHJcbiAqIEBwcml2YXRlXHJcbiAqIEB0eXBlIHtSZWdFeHB9XHJcbiAqIEBjb25zdGFudFxyXG4gKi8gXHJcbmNvbnN0IF9jbGlwTmFtZVJlZ2V4cCA9IC9eW0EtWmEtejAtOV8tXSsoPzpcXC9bQS1aYS16MC05Xy1dKykqJC87XHJcblxyXG4vKipcclxuICogTG9uZ2l0dWQgbcOheGltYSBwZXJtaXRpZGEgcGFyYSBsb3Mgbm9tYnJlcyBkZSBjbGlwLlxyXG4gKiBcclxuICogQHByaXZhdGVcclxuICogQHR5cGUge251bWJlcn1cclxuICogQGNvbnN0YW50XHJcbiAqL1xyXG5jb25zdCBfY2xpcE5hbWVNYXhMZW5ndGggPSAyNTY7XHJcblxyXG4vKipcclxuICogQWp1c3RlcyBkZSBjb25maWd1cmFjacOzbi5cclxuICogQHR5cGUge09iamVjdH1cclxuICogQHByaXZhdGVcclxuICogQGNvbnN0YW50XHJcbiAqL1xyXG5jb25zdCBfc2V0dGluZ3MgPSB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBJbmRpY2Egc2kgYWN0aXZhciBlbCBtb2RvIGRlIGRlcHVyYWNpw7NuLlxyXG4gICAgICogQHR5cGUge2Jvb2xlYW59XHJcbiAgICAgKiBAZGVmYXVsdCBmYWxzZVxyXG4gICAgICovXHJcbiAgICBkZWJ1ZzogZmFsc2UsXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSdXRhIGJhc2UgZG9uZGUgc2UgdWJpY2EgbGEgZGVmaW5pY2nDs24gZGUgbG9zIGNsaXBzLlxyXG4gICAgICogQHR5cGUge3N0cmluZ31cclxuICAgICAqIEBkZWZhdWx0ICcvY2xpcHMnXHJcbiAgICAgKi9cclxuICAgIGJhc2VQYXRoOiAnL2NsaXBzJyxcclxuXHJcbiAgICAvKipcclxuICAgICAqIEluZGljYSBzaSBsb3MgZXN0aWxvcyBlc3TDoW4gcHJlLWVtcGFxdWV0YWRvcy5cclxuICAgICAqIEB0eXBlIHtib29sZWFufVxyXG4gICAgICogQGRlZmF1bHQgZmFsc2VcclxuICAgICAqL1xyXG4gICAgc3R5bGVzQnVuZGxlZDogZmFsc2UsXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBJbmRpY2Egc2kgbGFzIHBsYW50aWxsYXMgZXN0w6FuIHByZS1lbXBhcXVldGFkYXMuXHJcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cclxuICAgICAqIEBkZWZhdWx0IGZhbHNlXHJcbiAgICAgKi9cclxuICAgIHRlbXBsYXRlc0J1bmRsZWQ6IGZhbHNlXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDbGlwcyByZWdpc3RyYWRvcyBwb3Igbm9tYnJlLlxyXG4gKiBcclxuICogQHByaXZhdGVcclxuICogQHR5cGUge01hcDxzdHJpbmcsIHR5cGVvZiBDbGlwPn1cclxuICovXHJcbmNvbnN0IF9jbGlwVHlwZXMgPSBuZXcgTWFwKClcclxuXHJcblxyXG4vKipcclxuICogVE9ETzogRmFsdGEgZG9jdW1lbnRhY2nDs24uXHJcbiAqIFxyXG4gKiBAbmFtZXNwYWNlXHJcbiAqL1xyXG5jb25zdCBjbGlwcyA9IHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEFjdHVhbGl6YSBsb3MgYWp1c3RlcyBkZSBjb25maWd1cmFjacOzbiBlc3BlY2lmaWNhZG9zLlxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIEFqdXN0ZXMgZGUgY29uZmlndXJhY2nDs24uXHJcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtzZXR0aW5ncy5kZWJ1Z10gSW5kaWNhIHNpIGFjdGl2YXIgZWwgbW9kbyBkZWJ1Zy5cclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSAgW3NldHRpbmdzLmJhc2VQYXRoXSBSdXRhIGJhc2UgZG9uZGUgc2UgbG9jYWxpemEgbGEgZGVmaW5pY2nDs24gZGUgbG9zIGNsaXBzLlxyXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbc2V0dGluZ3Muc3R5bGVzQnVuZGxlZF0gSW5kaWNhIHNpIGxvcyBlc3RpbG9zIGVzdMOhbiBwcmUtZW1wYXF1ZXRhZG9zLlxyXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbc2V0dGluZ3MudGVtcGxhdGVzQnVuZGxlZF0gSW5kaWNhIHNpIGxhcyBwbGFudGlsbGFzIGVzdMOhbiBwcmUtZW1wYXF1ZXRhZGFzLlxyXG4gICAgICovXHJcbiAgICBzZXR1cChzZXR0aW5ncykge1xyXG4gICAgICAgIE9iamVjdC5hc3NpZ24oX3NldHRpbmdzLCBzZXR0aW5ncyk7XHJcbiAgICB9LFxyXG4gICAgXHJcbiAgICAvKipcclxuICAgICAqIERlZmluZXMgYSBuZXcgY2xpcCB0eXBlLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIFVuaXF1ZSBjbGlwIG5hbWUuXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcHJvdG8gQ2xpcCBwcm90b3R5cGUuXHJcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZTx0eXBlb2YgQ2xpcD59IFJlc29sdmVzIHRvIHRoZSBuZXcgY2xpcCBjb25zdHJ1Y3Rvci5cclxuICAgICAqL1xyXG4gICAgYXN5bmMgZGVmaW5lKG5hbWUsIHByb3RvKSB7XHJcbiAgICAgICAgLy8gU2UgdmFsaWRhIGVsIG5vbWJyZS5cclxuICAgICAgICBpZiAodHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgY2xpcCBuYW1lOiBzdHJpbmcgcmVxdWlyZWQuJylcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG5hbWUgPSBuYW1lLnRyaW0oKVxyXG5cclxuICAgICAgICBpZiAoIW5hbWUpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBjbGlwIG5hbWU6IGVtcHR5IHN0cmluZy4nKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG5hbWUubGVuZ3RoID4gX2NsaXBOYW1lTWF4TGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKGBJbnZhbGlkIGNsaXAgbmFtZTogdG9vIGxvbmcgKCR7bmFtZS5sZW5ndGh9ID4gJHtfY2xpcE5hbWVNYXhMZW5ndGh9KS5gKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFfY2xpcE5hbWVSZWdleHAudGVzdChuYW1lKSkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGNsaXAgbmFtZTogZXhwZWN0ZWQgcGF0aC1saWtlIHN0cmluZyB3aXRob3V0IGxlYWRpbmcgb3IgdHJhaWxpbmcgc2xhc2guJylcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFNlIHBlcm1pdGUgdW5hIHByb21lc2EgcGVuZGllbnRlLCBwZXJvIG5vIHVuIHRpcG8geWEgZGVmaW5pZG8uXHJcbiAgICAgICAgY29uc3QgcHJldmlvdXMgPSBfY2xpcFR5cGVzLmdldChuYW1lKVxyXG5cclxuICAgICAgICBpZiAocHJldmlvdXM/LnByb3RvdHlwZSBpbnN0YW5jZW9mIENsaXApIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IENsaXBFcnJvcihgQ2xpcCBcIiR7bmFtZX1cIiBhbHJlYWR5IGRlZmluZWQuYCwge1xyXG4gICAgICAgICAgICAgICAgY29kZTogQ2xpcEVycm9yLmFscmVhZHlEZWZpbmVkXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBTZSB2YWxpZGEgZWwgb2JqZXRvIHByb3RvdGlwby5cclxuICAgICAgICBpZiAocHJvdG8gPT09IG51bGwgfHwgdHlwZW9mIHByb3RvICE9PSAnb2JqZWN0Jykge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIHByb3RvdHlwZTogb2JqZWN0IHJlcXVpcmVkLicpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBTZSByZXN1ZWx2ZSBlbCB0aXBvIGJhc2UgZGVsIGNsaXAuXHJcbiAgICAgICAgbGV0IEJhc2VDbGlwID0gQ2xpcFxyXG5cclxuICAgICAgICBpZiAocHJvdG8uZXh0ZW5kcyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGxldCBleHQgPSBwcm90by5leHRlbmRzXHJcblxyXG4gICAgICAgICAgICBpZiAodHlwZW9mIGV4dCAhPT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYEludmFsaWQgZXh0ZW5kczogc3RyaW5nIHJlcXVpcmVkLmApXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGV4dCA9IGV4dC50cmltKClcclxuXHJcbiAgICAgICAgICAgIGlmICghZXh0KSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBJbnZhbGlkIGV4dGVuZHM6IGVtcHR5IHN0cmluZy5gKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoZXh0ID09PSBuYW1lKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGV4dGVuZHM6IGEgY2xpcCBjYW5ub3QgZXh0ZW5kIGl0c2VsZi4nKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBCYXNlQ2xpcCA9IGF3YWl0IF9nZXRDbGlwVHlwZShleHQpXHJcblxyXG4gICAgICAgICAgICBpZiAoIUJhc2VDbGlwKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgQ2xpcEVycm9yKGBJbnZhbGlkIGV4dGVuZHM6IGNsaXAgXCIke2V4dH1cIiBub3QgZGVmaW5lZC5gLCB7IGNvZGU6IENsaXBFcnJvci5ub3REZWZpbmVkIH0pXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFNlIGFkbWl0ZSB1biBvYmpldG8gcGxhbm8gbyB1bm8gcHJldmlhbWVudGUgdmluY3VsYWRvIGEgZXN0YSBjbGFzZSBiYXNlLlxyXG4gICAgICAgIGNvbnN0IHBhcmVudCA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihwcm90bylcclxuXHJcbiAgICAgICAgaWYgKHBhcmVudCAhPT0gT2JqZWN0LnByb3RvdHlwZSAmJiBwYXJlbnQgIT09IEJhc2VDbGlwLnByb3RvdHlwZSkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIHByb3RvdHlwZTogcGxhaW4gb2JqZWN0IG9yIG9iamVjdCBsaW5rZWQgdG8gdGhlIGJhc2UgY2xpcCBwcm90b3R5cGUgcmVxdWlyZWQuJylcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFNlIGNyZWEgbGEgY2xhc2UgZGVsIG51ZXZvIGNsaXAuXHJcbiAgICAgICAgY29uc3QgQyA9IGNsYXNzIGV4dGVuZHMgQmFzZUNsaXAge31cclxuXHJcbiAgICAgICAgLy8gU2UgZXN0YWJsZWNlIGVsIHByb3RvdGlwbyBiYXNlIHBhcmEgcGVybWl0aXIgZWwgdXNvIGRlIHN1cGVyLlxyXG4gICAgICAgIE9iamVjdC5zZXRQcm90b3R5cGVPZihwcm90bywgQmFzZUNsaXAucHJvdG90eXBlKVxyXG5cclxuICAgICAgICAvLyBTZSBvYnRpZW5lbiBsb3MgZGVzY3JpcHRvcmVzLCBleGNsdXllbmRvIFwiY29uc3RydWN0b3JcIiwgXCJleHRlbmRzXCIgeSBcInN0eWxlc1wiLlxyXG4gICAgICAgIGNvbnN0IGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyhwcm90bylcclxuICAgICAgICBkZWxldGUgZGVzYy5jb25zdHJ1Y3RvclxyXG4gICAgICAgIGRlbGV0ZSBkZXNjLmV4dGVuZHNcclxuICAgICAgICBkZWxldGUgZGVzYy5zdHlsZXNcclxuXHJcbiAgICAgICAgLy8gU2UgaW5jb3Jwb3JhbiBsb3MgbWllbWJyb3MgYWwgcHJvdG90aXBvIGRlIGxhIGNsYXNlLlxyXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKEMucHJvdG90eXBlLCBkZXNjKVxyXG5cclxuICAgICAgICAvLyBTZSBhc2lnbmEgYSBsYSBjbGFzZSBlbCBub21icmUgZGVsIHRpcG8gZGUgY2xpcC5cclxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoQywgJ25hbWUnLCB7XHJcbiAgICAgICAgICAgIHZhbHVlOiBuYW1lLFxyXG4gICAgICAgICAgICBjb25maWd1cmFibGU6IHRydWVcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICAvLyBTZSBpbXBvcnRhbiBsYSBlc3RpbG9zIHZpbmN1bGFkb3MgYWwgY2xpcC5cclxuICAgICAgICBhd2FpdCBfaW1wb3J0Q2xpcFN0eWxlcyhuYW1lLCBwcm90by5zdHlsZXMpO1xyXG5cclxuICAgICAgICAvLyBTZSBjb21wcnVlYmEgcXVlIGxhIGVudHJhZGEgbm8gaGF5YSBjYW1iaWFkbyBkdXJhbnRlIGxhIGRlZmluaWNpw7NuLlxyXG4gICAgICAgIGlmIChfY2xpcFR5cGVzLmdldChuYW1lKSAhPT0gcHJldmlvdXMpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IENsaXBFcnJvcihgQ2xpcCBcIiR7bmFtZX1cIiBhbHJlYWR5IGRlZmluZWQuYCwge1xyXG4gICAgICAgICAgICAgICAgY29kZTogQ2xpcEVycm9yLmFscmVhZHlEZWZpbmVkXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBTZSByZWdpc3RyYSB5IGRldnVlbHZlIGVsIGNvbnN0cnVjdG9yIGRlbCBudWV2byBjbGlwLlxyXG4gICAgICAgIF9jbGlwVHlwZXMuc2V0KG5hbWUsIEMpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFNlIGRldnVlbHZlIGVsIGNvbnN0cnVjdG9yIGRlbCBudWV2byBjbGlwLlxyXG4gICAgICAgIHJldHVybiBDO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIENyZWEgdW5hIG51ZXZhIGluc3RhbmNpYSBkZWwgdGlwbyBkZSBjbGlwIGVzcGVjaWZpY2FkbyBwb3Igbm9tYnJlLlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgTm9tYnJlIGRlbCB0aXBvIGRlIGNsaXAgZXNwZWNpZmljYWRvLlxyXG4gICAgICogQHBhcmFtIHtDbGlwT3B0aW9uc30gW29wdGlvbnNdIE9wY2lvbmVzIGRlIGNyZWFjacOzbiBkZWwgY2xpcC5cclxuICAgICAqIEByZXR1cm4ge0NsaXB9IEluc3RhbmNpYSBkZWwgY2xpcCBjcmVhZGEuXHJcbiAgICAgKi9cclxuICAgIGFzeW5jIGNyZWF0ZShuYW1lLCBvcHRpb25zID0ge30pIHtcclxuICAgICAgICBpZiAodHlwZW9mIG5hbWUgIT09IFwic3RyaW5nXCIgfHwgIShuYW1lID0gbmFtZS50cmltKCkpKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgY2xpcCBuYW1lOiBub24tZW1wdHkgc3RyaW5nIHJlcXVpcmVkLicpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxldCBjbGlwID0gYXdhaXQgX2dldENsaXBUeXBlKG5hbWUpXHJcbiAgICAgICAgaWYgKCFjbGlwKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBDbGlwRXJyb3IoYENsaXAgXCIke25hbWV9XCIgaXMgbm90IGRlZmluZWQuYCwgeyBjb2RlOiBDbGlwRXJyb3Iubm90RGVmaW5lZCB9KVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbmV3IGNsaXAob3B0aW9ucylcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBJbmNsdXllIHVuIGNsaXAgbyB1bmEgcGxhbnRpbGxhIGVuIGVsIGVsZW1lbnRvIG8gc2VsZWN0b3IgZXNwZWNpZmljYWRvLlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgTm9tYnJlIGRlbCBjbGlwIG8gcGxhbnRpbGxhIGVzcGVjaWZpY2Fkby5cclxuICAgICAqIEBwYXJhbSB7RWxlbWVudH0gdGFyZ2V0IEVsZW1lbnRvIGVzcGVjaWZpY2Fkby4gXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIE9wY2lvbmVzIGFkaWNpb25hbGVzLlxyXG4gICAgICogQHNlZSBDbGlwI2NyZWF0ZVxyXG4gICAgICogQHNlZSBDbGlwI2luY2x1ZGVcclxuICAgICAqL1xyXG4gICAgYXN5bmMgaW5jbHVkZShuYW1lLCB0YXJnZXQsIG9wdGlvbnMpIHtcclxuICAgICAgICByZXR1cm4gKGF3YWl0IHRoaXMuY3JlYXRlKG5hbWUsIG9wdGlvbnMpKS5pbmNsdWRlKHRhcmdldCwgb3B0aW9ucyk7IFxyXG4gICAgfVxyXG5cclxufVxyXG5cclxuLyoqXHJcbiAqIENvbXBydWViYSBzaSBlbCB0aXBvIGRlbCBjbGlwIGVzcGVjaWZpY2FkbyBlc3TDoSBjYXJnYWRvLiBTaSBubyBlc3TDoSByZWdpc3RyYWRvIGxvIGludGVudGEgY2FyZ2FyLlxyXG4gKiBcclxuICogQHByaXZhdGVcclxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgTm9tYnJlIGRlbCBjbGlwLlxyXG4gKiBAcmV0dXJucyB7UHJvbWlzZTx0eXBlb2YgQ2xpcD59IFRpcG8gZGVsIGNsaXAgY2FyZ2Fkby5cclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIF9nZXRDbGlwVHlwZShuYW1lKSB7XHJcbiAgICBjb25zdCB0eXBlID0gX2NsaXBUeXBlcy5nZXQobmFtZSlcclxuXHJcbiAgICBpZiAodHlwZSkge1xyXG4gICAgICAgIHJldHVybiB0eXBlXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcHJvbWlzZSA9IF9pbXBvcnRDbGlwKG5hbWUpXHJcblxyXG4gICAgX2NsaXBUeXBlcy5zZXQobmFtZSwgcHJvbWlzZSlcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAgIHJldHVybiBhd2FpdCBwcm9taXNlXHJcblxyXG4gICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgaWYgKF9jbGlwVHlwZXMuZ2V0KG5hbWUpID09PSBwcm9taXNlKSB7XHJcbiAgICAgICAgICAgIF9jbGlwVHlwZXMuZGVsZXRlKG5hbWUpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aHJvdyBlcnJcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIENhcmdhIGVsIG1hbmVqYWRvciBkZSB1biBjbGlwIGVzcGVjaWZpY2FkbyBwb3Igbm9tYnJlLlxyXG4gKiBcclxuICogQHByaXZhdGVcclxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgTm9tYnJlIGRlbCBjbGlwLlxyXG4gKiBAcmV0dXJucyB7UHJvbWlzZTx0eXBlb2YgQ2xpcD59IFRpcG8gZGVsIGNsaXAgY2FyZ2Fkby5cclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIF9pbXBvcnRDbGlwKG5hbWUpIHtcclxuICAgIC8vIFRPRE86IEludHJvZHVjaXIgYXF1w60gcG9zaWJsZXMgbWFwZW9zIHBhcmEgYnVuZGxlcy5cclxuICAgIC8qXHJcbiAgICAgICAgX3NldHRpbmdzLmJ1bmRsZXM/LmZvckVhY2goYnVuZGxlID0+IHtcclxuICAgICAgICAgICAgaWYgKGJ1bmRsZS5wYXR0ZXJuLnRlc3QobmFtZSkpIHtcclxuICAgICAgICAgICAgICAgIGxvYWRCdW5kbGUoYnVuZGxlLnBhdGgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAqL1xyXG5cclxuICAgIGNvbnN0IGVycm9ycyA9IFtdXHJcblxyXG4gICAgZm9yIChjb25zdCBwYXRoIG9mIFtcclxuICAgICAgICAgICAgYCR7X3NldHRpbmdzLmJhc2VQYXRofS8ke25hbWV9LmpzYCxcclxuICAgICAgICAgICAgYCR7X3NldHRpbmdzLmJhc2VQYXRofS8ke25hbWV9L2luZGV4LmpzYF0pIHtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgIGxldCBwcm90b1xyXG5cclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAoeyBkZWZhdWx0OiBwcm90byB9ID0gYXdhaXQgaW1wb3J0KHBhdGgpKVxyXG4gICAgICAgIH0gY2F0Y2ggKGNhdXNlKSB7XHJcbiAgICAgICAgICAgIGVycm9ycy5wdXNoKG5ldyBDbGlwRXJyb3IoYEZhaWxlZCB0byBpbXBvcnQgY2xpcCBcIiR7bmFtZX1cIiBmcm9tIFwiJHtwYXRofVwiLmAsIHtcclxuICAgICAgICAgICAgICAgIGNvZGU6IENsaXBFcnJvci5sb2FkRmFpbGVkLFxyXG4gICAgICAgICAgICAgICAgY2F1c2VcclxuICAgICAgICAgICAgfSkpXHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBTaSBsYSBkZWZpbmljacOzbiBjYXJnYWRhIG5vIGVzIHbDoWxpZGEsIG5vIHNlIGludGVudGEgbGEgc2lndWllbnRlIHJ1dGEuXHJcbiAgICAgICAgaWYgKHByb3RvID09PSBudWxsIHx8IHR5cGVvZiBwcm90byAhPT0gJ29iamVjdCcpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IENsaXBFcnJvcihgSW52YWxpZCBjbGlwIFwiJHtuYW1lfVwiIGluIFwiJHtwYXRofVwiOiBkZWZhdWx0IGV4cG9ydCBtdXN0IGJlIGFuIG9iamVjdC5gLCB7XHJcbiAgICAgICAgICAgICAgICBjb2RlOiBDbGlwRXJyb3IubG9hZEZhaWxlZFxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gU2UgcmVnaXN0cmEgeSBkZXZ1ZWx2ZSBlbCB0aXBvIGNhcmdhZG8uXHJcbiAgICAgICAgcmV0dXJuIGNsaXBzLmRlZmluZShuYW1lLCBwcm90bylcclxuICAgIH1cclxuXHJcbiAgICB0aHJvdyBuZXcgQ2xpcEVycm9yKGBBbGwgaW1wb3J0IGF0dGVtcHRzIGZvciBjbGlwIFwiJHtuYW1lfVwiIGZhaWxlZC5gLCB7XHJcbiAgICAgICAgY29kZTogQ2xpcEVycm9yLmxvYWRGYWlsZWQsXHJcbiAgICAgICAgY2F1c2U6IGVycm9yc1xyXG4gICAgfSlcclxufVxyXG5cclxuXHJcbi8qKlxyXG4gKiBJbXBvcnRzIHN0eWxlcyBmb3IgdGhlIHNwZWNpZmllZCBjbGlwLlxyXG4gKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBDbGlwIG5hbWUuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfEZ1bmN0aW9ufEhUTUxTdHlsZUVsZW1lbnR8Q1NTU3R5bGVTaGVldH0gW3N0eWxlc11cclxuICogU3R5bGVzIG9yIGEgc3luY2hyb25vdXMgb3IgYXN5bmNocm9ub3VzIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGVtLlxyXG4gKiBJZiBvbWl0dGVkIG9yIHVuZGVmaW5lZCwgYXR0ZW1wdHMgdG8gbG9hZCB0aGUgZGVmYXVsdCBzdHlsZXNoZWV0IHVubGVzcyBzdHlsZXMgYXJlIGJ1bmRsZWQuXHJcbiAqIEByZXR1cm5zIHtQcm9taXNlPHZvaWQ+fSBSZXNvbHZlcyB3aGVuIHN0eWxlIGxvYWRpbmcgYW5kIGluc2VydGlvbiBhcmUgY29tcGxldGUuXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBfaW1wb3J0Q2xpcFN0eWxlcyhuYW1lLCBzdHlsZXMpIHtcclxuICAgIC8vIExvcyBlc3RpbG9zIHNlIHB1ZWRlbiBkZWZpbmlyIGNvbW8gcHJvcGllZGFkIG8gY29tbyBmdW5jacOzbi5cclxuICAgIGlmICh0eXBlb2Ygc3R5bGVzID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgc3R5bGVzID0gYXdhaXQgc3R5bGVzKClcclxuICAgIH1cclxuICAgIC8vIFNpIHNlIGRlZmluZW4gY29tbyBIVE1MU3R5bGVFbGVtZW50LCBzZSBhw7FhZGVuIGRpcmVjdGFtZW50ZSBhbCBoZWFkLlxyXG4gICAgaWYgKHN0eWxlcyBpbnN0YW5jZW9mIEhUTUxTdHlsZUVsZW1lbnQpIHtcclxuICAgICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHN0eWxlcylcclxuICAgICAgICByZXR1cm5cclxuICAgIH1cclxuICAgIC8vIFNpIHNlIGRlZmluZW4gY29tbyBDU1NTdHlsZVNoZWV0LCBzZSBhw7FhZGVuIGEgbGFzIGhvamFzIGRlIGVzdGlsbyBhZG9wdGFkYXMuXHJcbiAgICBpZiAoc3R5bGVzIGluc3RhbmNlb2YgQ1NTU3R5bGVTaGVldCkge1xyXG4gICAgICAgIGlmICghZG9jdW1lbnQuYWRvcHRlZFN0eWxlU2hlZXRzLmluY2x1ZGVzKHN0eWxlcykpIHtcclxuICAgICAgICAgICAgZG9jdW1lbnQuYWRvcHRlZFN0eWxlU2hlZXRzID0gWy4uLmRvY3VtZW50LmFkb3B0ZWRTdHlsZVNoZWV0cywgc3R5bGVzXVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICAvLyBTaSBlbCBjbGlwIG5vIGRlZmluZSBlc3RpbG9zIGVuIGPDs2RpZ28geSBubyBlc3TDoW4gZW1wYXF1ZXRhZG9zLCBzZSBpbnRlbnRhIGNhcmdhciBsYSBob2phIGRlIGVzdGlsb3MgcG9yIGRlZmVjdG8gXHJcbiAgICAvLyB1YmljYWRhIGVuIGxhIG1pc21hIHViaWNhY2nDs24gcXVlIGVsIGNsaXAuXHJcbiAgICBpZiAoc3R5bGVzID09IG51bGwgJiYgIV9zZXR0aW5ncy5zdHlsZXNCdW5kbGVkKSB7XHJcbiAgICAgICAgLy8gVE9ETzogTcOhcyBxdWUgdW4gZmxhZyBxdWUgbm9zIGluZGlxdWUgc2kgbG9zIGVzdGlsb3MgZXN0w6FuIGVtcGFxdWV0YWRvcyBvIG5vLCBsbyBxdWUgcmVhbG1lbnRlIG5lY2VzaXRhbW9zIGVzIFxyXG4gICAgICAgIC8vIHVuYSBkZWZpbmljacOzbiBkZSBidW5kbGVzIGNvbiBsYSBlc3BlY2lmaWNhY2nDs24gZGUgbm9tYnJlcyBvIHBhdHJvbmVzIGRlIGNsaXBzIGluY2x1aWRvcyBlbiBjYWRhIGJ1bmRsZSwgZGUgXHJcbiAgICAgICAgLy8gZm9ybWEgcXVlIHBvZGFtb3MgaW50cm9kdWNpciBhcXXDrSBsYSBsw7NnaWNhIGRlIGNhcmdhIGFkZWN1YWRhLlxyXG4gICAgICAgIGNvbnN0IHBhdGggPSBgJHtfc2V0dGluZ3MuYmFzZVBhdGh9LyR7bmFtZX0vJHtDbGlwLmRlZmF1bHRTdHlsZXNOYW1lfS5jc3NgXHJcblxyXG4gICAgICAgIGxldCByZXNcclxuXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgcmVzID0gYXdhaXQgZmV0Y2gocGF0aClcclxuXHJcbiAgICAgICAgICAgIGlmIChyZXMub2spIHtcclxuICAgICAgICAgICAgICAgIHN0eWxlcyA9IGF3YWl0IHJlcy50ZXh0KClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgQ2xpcEVycm9yKGBGYWlsZWQgdG8gZmV0Y2ggc3R5bGVzIGZvciBjbGlwIFwiJHtuYW1lfVwiIGZyb20gXCIke3BhdGh9XCI6ICR7ZXJyLm1lc3NhZ2V9YCwge1xyXG4gICAgICAgICAgICAgICAgY29kZTogQ2xpcEVycm9yLmxvYWRGYWlsZWQsXHJcbiAgICAgICAgICAgICAgICBjYXVzZTogZXJyXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXJlcy5vaykge1xyXG4gICAgICAgICAgICBpZiAocmVzLnN0YXR1cyAhPT0gNDA0ICYmIHJlcy5zdGF0dXMgIT09IDQxMCkge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IENsaXBFcnJvcihgRmFpbGVkIHRvIGxvYWQgc3R5bGVzIGZvciBjbGlwIFwiJHtuYW1lfVwiIGZyb20gXCIke3BhdGh9XCI6ICR7cmVzLnN0YXR1c1RleHR9ICgke3Jlcy5zdGF0dXN9KWAsIHtcclxuICAgICAgICAgICAgICAgICAgICBjb2RlOiBDbGlwRXJyb3IubG9hZEZhaWxlZFxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKF9zZXR0aW5ncy5kZWJ1Zykge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGBObyBzdHlsZXMgZm91bmQgZm9yIGNsaXAgXCIke25hbWV9XCIgYXQgXCIke3BhdGh9XCIuYClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHN0eWxlcyA9PSBudWxsKSB7XHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHR5cGVvZiBzdHlsZXMgIT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgSW52YWxpZCBzdHlsZXMgZm9yIGNsaXAgXCIke25hbWV9XCI6IHN0cmluZywgSFRNTFN0eWxlRWxlbWVudCBvciBDU1NTdHlsZVNoZWV0IHJlcXVpcmVkLmApXHJcbiAgICB9XHJcblxyXG4gICAgc3R5bGVzID0gc3R5bGVzLnRyaW0oKVxyXG5cclxuICAgIGlmICghc3R5bGVzKSB7XHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFfc3R5bGVFbGVtZW50KSB7XHJcbiAgICAgICAgX3N0eWxlRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XHJcbiAgICAgICAgX3N0eWxlRWxlbWVudC5pZCA9ICdjbGlwcy1zdHlsZXMnO1xyXG4gICAgICAgIF9zdHlsZUVsZW1lbnQuc2V0QXR0cmlidXRlKCdkYXRhLXNvdXJjZScsICdjbGlwcycpO1xyXG4gICAgICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQoX3N0eWxlRWxlbWVudCk7XHJcbiAgICB9XHJcblxyXG4gICAgX3N0eWxlRWxlbWVudC50ZXh0Q29udGVudCArPSBgXFxuLyogJHtuYW1lfSAqL1xcbiR7c3R5bGVzfVxcbmA7XHJcbn1cclxuXHJcbi8vIEdsb2JhbCBzY29wZVxyXG5pZiAod2luZG93KSB7XHJcbiAgICB3aW5kb3cuY2xpcHMgPSBjbGlwc1xyXG59XHJcblxyXG4vLyBFeHBvcnRzXHJcbmV4cG9ydCBk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
