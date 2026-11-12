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

export { clips as default };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpcHMtMC4wLjEuZXNtLmpzIiwic291cmNlcyI6WyIuLi91dGlsL2VzY2FwZS5qcyIsIi4uL2NsaXBzLmpzIiwiLi4vYWRkLW9ucy92aWV3cy5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBIVE1MX0VTQ0FQRVMgPSB7XHJcbiAgICAnJic6ICcmYW1wOycsXHJcbiAgICAnPCc6ICcmbHQ7JyxcclxuICAgICc+JzogJyZndDsnLFxyXG4gICAgJ1wiJzogJyZxdW90OycsXHJcbiAgICBcIidcIjogJyYjMzk7J1xyXG59O1xyXG5cclxuZXhwb3J0IGRlZmF1bHQge1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogRXNjYXBhIGxvcyBjYXJhY3RlcmVzIGVzcGVjaWFsZXMgZW4gSFRNTC5cclxuICAgICAqIEBwYXJhbSB7Kn0geCBWYWxvciBlc3BlY2lmaWNhZG8uIFxyXG4gICAgICogQHJldHVybnMge3N0cmluZ30gQ2FkZW5hIGVzY2FwYWRhLlxyXG4gICAgICovXHJcbiAgICBodG1sOiAoeCkgPT4gU3RyaW5nKHgpLnJlcGxhY2UoL1smPD5cIiddL2csIChjaCkgPT4gSFRNTF9FU0NBUEVTW2NoXSksXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBFc2NhcGEgbG9zIGNhcmFjdGVyZXMgZXNwZWNpYWxlcyBlbiBsaXRlcmFsZXMgZGUgcGxhbnRpbGxhLlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHN0ciBDYWRlbmEgZXNwZWNpZmljYWRhLiBcclxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IENhZGVuYSBlc2NhcGFkYS5cclxuICAgICAqL1xyXG4gICAgbGl0ZXJhbDogKHN0cikgPT4gc3RyXHJcbiAgICAgICAgLnJlcGxhY2UoL1xcXFwvZywgXCJcXFxcXFxcXFwiKVxyXG4gICAgICAgIC5yZXBsYWNlKC9gL2csIFwiXFxcXGBcIilcclxuICAgICAgICAucmVwbGFjZSgvXFwkXFx7L2csIFwiXFxcXCR7XCIpXHJcbiAgICAgICAgLnJlcGxhY2UoL1xcci9nLCBcIlxcXFxyXCIpXHJcblxyXG59OyIsIi8vIGNsaXBzLmpzXHJcblxyXG4vLyBpbXBvcnQgZWpzIGZyb20gJy4vdXRpbC9lanMuanMnXHJcbmltcG9ydCBlc2NhcGUgZnJvbSAnLi91dGlsL2VzY2FwZS5qcydcclxuXHJcbi8qKlxyXG4gKiBQcmVmaWpvIHBhcmEgZXNwZWNpZmljYXIgcmVmZXJlbmNpYXMgYSBjbGlwcyBlbiBpbmNsdXNpb25lcy5cclxuICogXHJcbiAqIEBwcml2YXRlXHJcbiAqIEB0eXBlIHtzdHJpbmd9XHJcbiAqL1xyXG5jb25zdCBfY2xpcFByZWZpeCA9ICdjbGlwOic7XHJcblxyXG4vKipcclxuICogRXhwcmVzacOzbiBwYXJhIHZlcmlmaWNhciBzaSB1bmEgY2FkZW5hIHNvbG8gY29udGllbmUgZXNwYWNpb3MuXHJcbiAqIFxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAdHlwZSB7UmVnRXhwfVxyXG4gKi9cclxuLy8gY29uc3QgX3doaXRlc3BhY2VSZWdleHAgPSAvXlxccyokLztcclxuXHJcbi8qKlxyXG4gKiBNYXBzIHJvb3QgZWxlbWVudHMgdG8gY2xpcHMuXHJcbiAqIFxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAdHlwZSB7V2Vha01hcDxIVE1MRWxlbWVudCwgQ2xpcD59XHJcbiAqL1xyXG5jb25zdCBfcm9vdHMgPSBuZXcgV2Vha01hcCgpXHJcblxyXG4vKipcclxuICogU3RvcmVzIHByaXZhdGUgc3RhdGUgZm9yIGNsaXBzLlxyXG4gKiBcclxuICogQHByaXZhdGVcclxuICogQHR5cGUge1dlYWtNYXA8Q2xpcCwge1xyXG4gKiAgICAgcm9vdDogSFRNTEVsZW1lbnR8bnVsbCxcclxuICogICAgIGxpc3RlbmVyczogTWFwLFxyXG4gKiAgICAgbG9hZFN0YXJ0ZWQ6IGZhbHNlLFxyXG4gKiAgICAgbG9hZFRpbWU6IDAgXHJcbiAqIH0+fVxyXG4gKi9cclxuY29uc3QgX3N0YXRlcyA9IG5ldyBXZWFrTWFwKClcclxuXHJcbi8qKlxyXG4gKiBTaGFyZWQgc3R5bGUgZWxlbWVudCBjb250YWluaW5nIHRoZSBzdHlsZXMgb2YgcmVnaXN0ZXJlZCBjbGlwcy5cclxuICpcclxuICogQHByaXZhdGVcclxuICogQHR5cGUge0hUTUxTdHlsZUVsZW1lbnR8dW5kZWZpbmVkfVxyXG4gKi9cclxubGV0IF9zdHlsZUVsZW1lbnRcclxuXHJcblxyXG4vKipcclxuICogQmFzZSBjbGFzcyBmb3IgY2xpcHMuXHJcbiAqL1xyXG5jbGFzcyBDbGlwIHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEF2YWlsYWJsZSBpbmNsdXNpb24gcG9zaXRpb25zLlxyXG4gICAgICpcclxuICAgICAqIEBlbnVtIHtzdHJpbmd9XHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBQb3NpdGlvbiA9IE9iamVjdC5mcmVlemUoe1xyXG4gICAgICAgIHN0YXJ0OiAnc3RhcnQnLFxyXG4gICAgICAgIGVuZDogJ2VuZCcsXHJcbiAgICAgICAgYmVmb3JlOiAnYmVmb3JlJyxcclxuICAgICAgICBhZnRlcjogJ2FmdGVyJyxcclxuICAgICAgICByZXBsYWNlOiAncmVwbGFjZSdcclxuICAgIH0pXHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICogQ3JlYXRlcyBhIENsaXAgaW5zdGFuY2UuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zPXt9XSBDcmVhdGlvbiBvcHRpb25zLlxyXG4gICAgICovXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zID0ge30pIHtcclxuICAgICAgICBfc3RhdGVzLnNldCh0aGlzLCB7XHJcbiAgICAgICAgICAgIHJvb3Q6IG51bGwsXHJcbiAgICAgICAgICAgIGxpc3RlbmVyczogbmV3IE1hcCgpLFxyXG4gICAgICAgICAgICBsb2FkU3RhcnRlZDogZmFsc2UsXHJcbiAgICAgICAgICAgIGxvYWRUaW1lOiAwXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgdGhpcy5jcmVhdGUob3B0aW9ucylcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENsaXAgcm9vdCBlbGVtZW50LlxyXG4gICAgICpcclxuICAgICAqIEB0eXBlIHtFbGVtZW50fG51bGx9XHJcbiAgICAgKiBAcmVhZG9ubHlcclxuICAgICAqL1xyXG4gICAgZ2V0IHJvb3QoKSB7XHJcbiAgICAgICAgcmV0dXJuIF9zdGF0ZXMuZ2V0KHRoaXMpLnJvb3RcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENsaXAgdHlwZSBuYW1lLlxyXG4gICAgICpcclxuICAgICAqIEB0eXBlIHtzdHJpbmd9XHJcbiAgICAgKiBAcmVhZG9ubHlcclxuICAgICAqL1xyXG4gICAgZ2V0IGNsaXBOYW1lKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLm5hbWVcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENsb3Nlc3QgYW5jZXN0b3IgY2xpcC5cclxuICAgICAqXHJcbiAgICAgKiBAdHlwZSB7Q2xpcHxudWxsfVxyXG4gICAgICogQHJlYWRvbmx5XHJcbiAgICAgKi9cclxuICAgIGdldCBwYXJlbnRDbGlwKCkge1xyXG4gICAgICAgIGZvciAobGV0IGVsZW1lbnQgPSB0aGlzLnJvb3Q/LnBhcmVudEVsZW1lbnQ7IGVsZW1lbnQ7IGVsZW1lbnQgPSBlbGVtZW50LnBhcmVudEVsZW1lbnQpIHtcclxuICAgICAgICAgICAgY29uc3QgY2xpcCA9IF9yb290cy5nZXQoZWxlbWVudClcclxuXHJcbiAgICAgICAgICAgIGlmIChjbGlwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gY2xpcFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbnVsbFxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSW1tZWRpYXRlIGNoaWxkIGNsaXBzLCBleGNsdWRpbmcgdGhlaXIgZGVzY2VuZGFudHMuXHJcbiAgICAgKlxyXG4gICAgICogQHR5cGUge0NsaXBbXX1cclxuICAgICAqIEByZWFkb25seVxyXG4gICAgICovXHJcbiAgICBnZXQgY2hpbGRDbGlwcygpIHtcclxuICAgICAgICBjb25zdCBjbGlwcyA9IFtdXHJcblxyXG4gICAgICAgIGNvbnN0IGNvbGxlY3QgPSBlbGVtZW50ID0+IHtcclxuICAgICAgICAgICAgY29uc3QgY2xpcCA9IF9yb290cy5nZXQoZWxlbWVudClcclxuXHJcbiAgICAgICAgICAgIGlmIChjbGlwKSB7XHJcbiAgICAgICAgICAgICAgICBjbGlwcy5wdXNoKGNsaXApXHJcbiAgICAgICAgICAgICAgICByZXR1cm5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBlbGVtZW50LmNoaWxkcmVuKSB7XHJcbiAgICAgICAgICAgICAgICBjb2xsZWN0KGNoaWxkKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCByb290ID0gdGhpcy5yb290XHJcblxyXG4gICAgICAgIGlmIChyb290KSB7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygcm9vdC5jaGlsZHJlbikge1xyXG4gICAgICAgICAgICAgICAgY29sbGVjdChjaGlsZClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGNsaXBzXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBOdW1iZXIgb2YgaW1tZWRpYXRlIGNoaWxkIGNsaXBzLlxyXG4gICAgICpcclxuICAgICAqIEB0eXBlIHtudW1iZXJ9XHJcbiAgICAgKiBAcmVhZG9ubHlcclxuICAgICAqL1xyXG4gICAgZ2V0IGNoaWxkQ291bnQoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY2hpbGRDbGlwcy5sZW5ndGhcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFRpbWVzdGFtcCBvZiB0aGUgbGFzdCBzdWNjZXNzZnVsIGRhdGEgbG9hZCwgb3IgemVybyBpZiBub25lIGhhcyBjb21wbGV0ZWQuXHJcbiAgICAgKlxyXG4gICAgICogQHR5cGUge251bWJlcn1cclxuICAgICAqIEByZWFkb25seVxyXG4gICAgICovXHJcbiAgICBnZXQgbG9hZFRpbWUoKSB7XHJcbiAgICAgICAgcmV0dXJuIF9zdGF0ZXMuZ2V0KHRoaXMpLmxvYWRUaW1lXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgY2xpcCBpbnN0YW5jZS4gQ2FsbGVkIGJ5IHRoZSBjb25zdHJ1Y3Rvci5cclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgQ3JlYXRpb24gb3B0aW9ucy5cclxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxyXG4gICAgICovXHJcbiAgICBjcmVhdGUob3B0aW9ucykge31cclxuXHJcbiAgICAvKipcclxuICAgICAqIEluY2x1ZGVzIHRoZSBjbGlwIHJlbGF0aXZlIHRvIHRoZSBzcGVjaWZpZWQgdGFyZ2V0IGVsZW1lbnQuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtFbGVtZW50fSB0YXJnZXQgVGFyZ2V0IGVsZW1lbnQuXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnM9e31dIEFkZGl0aW9uYWwgb3B0aW9ucy5cclxuICAgICAqIEBwYXJhbSB7Q2xpcC5Qb3NpdGlvbn0gW29wdGlvbnMucG9zaXRpb249Q2xpcC5Qb3NpdGlvbi5lbmRdIFBvc2l0aW9uIHJlbGF0aXZlIHRvIHRoZSB0YXJnZXQgZWxlbWVudC5cclxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlPENsaXA+fSBSZXNvbHZlcyB0byB0aGlzIGNsaXAgYWZ0ZXIgcmVhZHkoKSBjb21wbGV0ZXMuXHJcbiAgICAgKi9cclxuICAgIGFzeW5jIGluY2x1ZGUodGFyZ2V0LCBvcHRpb25zID0ge30pIHtcclxuICAgICAgICBvcHRpb25zID0geyAuLi5vcHRpb25zIH1cclxuXHJcbiAgICAgICAgY29uc3Qgc3RhdGUgPSBfc3RhdGVzLmdldCh0aGlzKTtcclxuICAgICAgICBjb25zdCBwcmV2aW91cyA9IHN0YXRlLmluY2x1ZGVQcm9taXNlID8/IFByb21pc2UucmVzb2x2ZSgpO1xyXG5cclxuICAgICAgICByZXR1cm4gYXdhaXQgKHN0YXRlLmluY2x1ZGVQcm9taXNlID0gcHJldmlvdXMuY2F0Y2goKCkgPT4ge30pLnRoZW4oKCkgPT4gXHJcbiAgICAgICAgICAgIF9pbmNsdWRlLmNhbGwodGhpcywgdGFyZ2V0LCBvcHRpb25zKSkpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmVuZGVycyB0aGUgY2xpcC5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge1JlbmRlckNvbnRleHR9IGN0eCBSZW5kZXJpbmcgY29udGV4dC5cclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gQWRkaXRpb25hbCByZW5kZXJpbmcgb3B0aW9ucy5cclxuICAgICAqIEByZXR1cm5zIHtEb2N1bWVudEZyYWdtZW50fEVsZW1lbnR8c3RyaW5nfFByb21pc2U8RG9jdW1lbnRGcmFnbWVudHxFbGVtZW50fHN0cmluZz59IFJlbmRlcmVkIGNvbnRlbnQuXHJcbiAgICAgKi9cclxuICAgIGFzeW5jIHJlbmRlcihjdHgsIG9wdGlvbnMpIHtcclxuICAgICAgICAvLyBUT0RPOiBDcmVvIHF1ZSBsYSBpbXBsZW1lbnRhY2nDs24gcG9yIGRlZmVjdG8gZGViZXLDrWEgaW50ZW50YXIgcmVuZGVyaXphciBsYSBwbGFudGlsbGEgcG9yIGRlZmVjdG8uXHJcbiAgICAgICAgcmV0dXJuIC8qaHRtbCovYDxkaXYgZGF0YS1jbGlwPVwiJHt0aGlzLmNsaXBOYW1lfVwiPjwvZGl2PmBcclxuICAgICAgICAvLyByZXR1cm4gX3JlbmRlclRlbXBsYXRlKHRoaXMpXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgZ2VuZXJhdGVkIGNvbnRlbnQgYW5kIGFkZHMgdGhlIG5lY2Vzc2FyeSBldmVudCBsaXN0ZW5lcnMuIENhbGxlZCBvbiBldmVyeSBpbmNsdXNpb24uXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBBZGRpdGlvbmFsIG9wdGlvbnMuXHJcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmZyZXNoPWZhbHNlXSBXaGV0aGVyIHRoZSByb290IGVsZW1lbnQgd2FzIG5ld2x5IGNyZWF0ZWQuXHJcbiAgICAgKiBAcmV0dXJucyB7dm9pZHxQcm9taXNlPHZvaWQ+fVxyXG4gICAgICovXHJcbiAgICByZWFkeShvcHRpb25zKSB7fVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogTG9hZHMgYWRkaXRpb25hbCBkYXRhLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIEFkZGl0aW9uYWwgb3B0aW9ucy5cclxuICAgICAqIEByZXR1cm5zIHsqfFByb21pc2U8Kj59IERhdGEgcGFzc2VkIHRvIHVwZGF0ZSgpLlxyXG4gICAgICovXHJcbiAgICBhc3luYyBsb2FkKG9wdGlvbnMpIHt9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBVcGRhdGVzIHRoZSBjbGlwIGNvbnRlbnQgYWZ0ZXIgbG9hZGluZyBhZGRpdGlvbmFsIGRhdGEuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgQWRkaXRpb25hbCBvcHRpb25zLlxyXG4gICAgICogQHBhcmFtIHsqfSBvcHRpb25zLmRhdGEgTG9hZGVkIGRhdGEuXHJcbiAgICAgKiBAcmV0dXJucyB7dm9pZHxQcm9taXNlPHZvaWQ+fVxyXG4gICAgICovXHJcbiAgICBhc3luYyB1cGRhdGUob3B0aW9ucykge31cclxuXHJcbiAgICAvKipcclxuICAgICAqIEluaXRpYXRlcyB0aGUgcmVsb2FkIG9mIHRoZSBjbGlwLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIEFkZGl0aW9uYWwgb3B0aW9ucy5cclxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlPHZvaWQ+fVxyXG4gICAgICovXHJcbiAgICBhc3luYyByZWxvYWQob3B0aW9ucykge1xyXG4gICAgICAgIC8vIC4uLlxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2xlYXJzIHRoZSBjbGlwIGNvbnRlbnQgc28gaXQgY2FuIGJlIHJlbmRlcmVkIGFnYWluLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIEFkZGl0aW9uYWwgb3B0aW9ucy5cclxuICAgICAqL1xyXG4gICAgY2xlYXIob3B0aW9ucykge1xyXG4gICAgICAgIC8vIC4uLlxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogU2hvd3Mgb3IgaGlkZXMgdGhlIGNsaXAuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbc2hvd10gV2hldGhlciB0byBzaG93IHRoZSBjbGlwLiBJZiBvbWl0dGVkLCB0b2dnbGVzIGl0cyB2aXNpYmlsaXR5LlxyXG4gICAgICovXHJcbiAgICB0b2dnbGUoc2hvdykge1xyXG4gICAgICAgIC8vIC4uLlxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2hlY2tzIHdoZXRoZXIgdGhlIGNsaXAgaXMgdmlzaWJsZS5cclxuICAgICAqXHJcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gV2hldGhlciB0aGUgY2xpcCBpcyB2aXNpYmxlLlxyXG4gICAgICovXHJcbiAgICBpc1Zpc2libGUoKSB7XHJcbiAgICAgICAgLy8gLi4uXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZW1vdmVzIHRoZSBjbGlwIGZyb20gdGhlIERPTS5cclxuICAgICAqL1xyXG4gICAgcmVtb3ZlKCkge1xyXG4gICAgICAgIC8vIC4uLlxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogRGVzdHJveXMgdGhlIGNsaXAgYW5kIHJlbGVhc2VzIGl0cyByZXNvdXJjZXMuXHJcbiAgICAgKi9cclxuICAgIGRlc3Ryb3koKSB7XHJcbiAgICAgICAgLy8gLi4uXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZWdpc3RlcnMgYW4gZXZlbnQgbGlzdGVuZXIuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgRXZlbnQgdHlwZS5cclxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb24oQ2xpcEV2ZW50KTogdm9pZH0gbGlzdGVuZXIgRXZlbnQgbGlzdGVuZXIuXHJcbiAgICAgKiBAcmV0dXJucyB7Q2xpcH0gVGhpcyBjbGlwLlxyXG4gICAgICovXHJcbiAgICBvbih0eXBlLCBsaXN0ZW5lcikge1xyXG4gICAgICAgIGlmICh0eXBlb2YgdHlwZSAhPT0gJ3N0cmluZycgfHwgdHlwZS5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBldmVudCB0eXBlOiBhIG5vbi1lbXB0eSBzdHJpbmcgaXMgcmVxdWlyZWQuJylcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBldmVudCBsaXN0ZW5lcjogYSBmdW5jdGlvbiBpcyByZXF1aXJlZC4nKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qgc3RhdGUgPSBfc3RhdGVzLmdldCh0aGlzKVxyXG5cclxuICAgICAgICBsZXQgbGlzdGVuZXJzID0gc3RhdGUubGlzdGVuZXJzLmdldCh0eXBlKVxyXG5cclxuICAgICAgICBpZiAoIWxpc3RlbmVycykge1xyXG4gICAgICAgICAgICBzdGF0ZS5saXN0ZW5lcnMuc2V0KHR5cGUsIGxpc3RlbmVycyA9IG5ldyBTZXQoKSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxpc3RlbmVycy5hZGQobGlzdGVuZXIpXHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZW1vdmVzIGFuIGV2ZW50IGxpc3RlbmVyLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIEV2ZW50IHR5cGUuXHJcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9uKENsaXBFdmVudCk6IHZvaWR9IGxpc3RlbmVyIEV2ZW50IGxpc3RlbmVyLlxyXG4gICAgICogQHJldHVybnMge0NsaXB9IFRoaXMgY2xpcC5cclxuICAgICAqL1xyXG4gICAgb2ZmKHR5cGUsIGxpc3RlbmVyKSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiB0eXBlICE9PSAnc3RyaW5nJyB8fCB0eXBlLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGV2ZW50IHR5cGU6IGEgbm9uLWVtcHR5IHN0cmluZyBpcyByZXF1aXJlZC4nKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGV2ZW50IGxpc3RlbmVyOiBhIGZ1bmN0aW9uIGlzIHJlcXVpcmVkLicpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBzdGF0ZSA9IF9zdGF0ZXMuZ2V0KHRoaXMpXHJcbiAgICAgICAgY29uc3QgbGlzdGVuZXJzID0gc3RhdGUubGlzdGVuZXJzLmdldCh0eXBlKVxyXG5cclxuICAgICAgICBpZiAobGlzdGVuZXJzKSB7XHJcbiAgICAgICAgICAgIGxpc3RlbmVycy5kZWxldGUobGlzdGVuZXIpXHJcblxyXG4gICAgICAgICAgICBpZiAobGlzdGVuZXJzLnNpemUgPT09IDApIHtcclxuICAgICAgICAgICAgICAgIHN0YXRlLmxpc3RlbmVycy5kZWxldGUodHlwZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXNcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEZpcmVzIGFuIGV2ZW50IHN5bmNocm9ub3VzbHkuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd8Q2xpcEV2ZW50fHt0eXBlOiBzdHJpbmcsIGRldGFpbD86ICp9fSBldmVudCBFdmVudCB0byBmaXJlLlxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zPXt9XSBEaXNwYXRjaCBvcHRpb25zLlxyXG4gICAgICogQHBhcmFtIHtib29sZWFufCdwb3N0J30gW29wdGlvbnMuc3ByZWFkPWZhbHNlXVxyXG4gICAgICogV2hldGhlciB0byBwcm9wYWdhdGUgdG8gZGVzY2VuZGFudHM6IHRydWUgZm9yIHByZW9yZGVyLCAncG9zdCcgZm9yIHBvc3RvcmRlci5cclxuICAgICAqIEByZXR1cm5zIHtDbGlwfSBUaGlzIGNsaXAuXHJcbiAgICAgKi9cclxuICAgIGZpcmUoZXZlbnQsIHsgc3ByZWFkID0gZmFsc2UgfSA9IHt9KSB7XHJcbiAgICAgICAgLy8gU2Ugbm9ybWFsaXphIGVsIGV2ZW50by5cclxuICAgICAgICBpZiAoIShldmVudCBpbnN0YW5jZW9mIENsaXBFdmVudCkpIHtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiBldmVudCA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgICAgIGV2ZW50ID0gbmV3IENsaXBFdmVudChldmVudClcclxuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZXZlbnQgPT09ICdvYmplY3QnICYmIGV2ZW50ICE9PSBudWxsICYmIHR5cGVvZiBldmVudC50eXBlID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICAgICAgZXZlbnQgPSBuZXcgQ2xpcEV2ZW50KGV2ZW50LnR5cGUsIGV2ZW50LmRldGFpbClcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXHJcbiAgICAgICAgICAgICAgICAgICAgJ0ludmFsaWQgZXZlbnQ6IGV4cGVjdGVkIGEgdHlwZSBzdHJpbmcsIGEgQ2xpcEV2ZW50LCBvciBhbiBvYmplY3Qgd2l0aCBhIHN0cmluZyBcInR5cGVcIiBwcm9wZXJ0eS4nXHJcbiAgICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFNlIHZhbGlkYW4gbGFzIG9wY2lvbmVzIGFkaWNpb25hbGVzLlxyXG4gICAgICAgIGlmIChzcHJlYWQgIT09IGZhbHNlICYmIHNwcmVhZCAhPT0gdHJ1ZSAmJiBzcHJlYWQgIT09ICdwb3N0Jykge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGV2ZW50IHNwcmVhZDogZXhwZWN0ZWQgZmFsc2UsIHRydWUsIG9yIFwicG9zdFwiLicpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBldmVudFN0YXRlID0gX2V2ZW50U3RhdGVzLmdldChldmVudClcclxuXHJcbiAgICAgICAgLy8gU2UgaW1waWRlIGVtaXRpciBsYSBtaXNtYSBpbnN0YW5jaWEgZGVsIGV2ZW50byBtaWVudHJhcyBzZSBlc3TDoSBwcm9jZXNhbmRvLlxyXG4gICAgICAgIGlmIChldmVudFN0YXRlLnRhcmdldCAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgQ2xpcEVycm9yKCdUaGUgZXZlbnQgaXMgYWxyZWFkeSBiZWluZyBkaXNwYXRjaGVkLicpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBkaXNwYXRjaCA9IGNsaXAgPT4ge1xyXG4gICAgICAgICAgICAvLyBTZSBwcm9wYWdhIGVuIHBvc3RvcmRlbi5cclxuICAgICAgICAgICAgaWYgKHNwcmVhZCA9PT0gJ3Bvc3QnKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIGNsaXAuY2hpbGRDbGlwcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGRpc3BhdGNoKGNoaWxkKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBTZSBlamVjdXRhbiBsb3MgbGlzdGVuZXJzIGRlIGVzdGUgY2xpcC5cclxuICAgICAgICAgICAgY29uc3Qgc3RhdGUgPSBfc3RhdGVzLmdldChjbGlwKVxyXG4gICAgICAgICAgICBjb25zdCBsaXN0ZW5lcnMgPSBzdGF0ZS5saXN0ZW5lcnMuZ2V0KGV2ZW50LnR5cGUpXHJcblxyXG4gICAgICAgICAgICBpZiAobGlzdGVuZXJzKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBwcmV2aW91c1RhcmdldCA9IGV2ZW50U3RhdGUuY3VycmVudFRhcmdldFxyXG4gICAgICAgICAgICAgICAgZXZlbnRTdGF0ZS5jdXJyZW50VGFyZ2V0ID0gY2xpcFxyXG5cclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBsaXN0ZW5lciBvZiBbLi4ubGlzdGVuZXJzXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGlzdGVuZXIuY2FsbChjbGlwLCBldmVudClcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGBFcnJvciBjYWxsaW5nIGV2ZW50IGxpc3RlbmVyIFwiJHtldmVudC50eXBlfVwiIGluIGNsaXAgXCIke2NsaXAuY2xpcE5hbWV9XCI6YCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIClcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRTdGF0ZS5jdXJyZW50VGFyZ2V0ID0gcHJldmlvdXNUYXJnZXRcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gU2UgcHJvcGFnYSBlbiBwcmVvcmRlbi5cclxuICAgICAgICAgICAgaWYgKHNwcmVhZCA9PT0gdHJ1ZSkge1xyXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBjbGlwLmNoaWxkQ2xpcHMpIHtcclxuICAgICAgICAgICAgICAgICAgICBkaXNwYXRjaChjaGlsZClcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZXZlbnRTdGF0ZS50YXJnZXQgPSB0aGlzXHJcblxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGRpc3BhdGNoKHRoaXMpXHJcbiAgICAgICAgfSBmaW5hbGx5IHtcclxuICAgICAgICAgICAgZXZlbnRTdGF0ZS50YXJnZXQgPSBudWxsXHJcbiAgICAgICAgICAgIGV2ZW50U3RhdGUuY3VycmVudFRhcmdldCA9IG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzXHJcbiAgICB9XHJcblxyXG59XHJcblxyXG5cclxuLyoqXHJcbiAqIFBlcmZvcm1zIHRoZSBjbGlwIGluY2x1c2lvbi5cclxuICpcclxuICogQHByaXZhdGVcclxuICogQHRoaXMge0NsaXB9XHJcbiAqIEBzZWUgQ2xpcCNpbmNsdWRlXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBfaW5jbHVkZSh0YXJnZXQsIG9wdGlvbnMgPSB7fSkge1xyXG4gICAgLy8gU2UgdmFsaWRhIGVsIGRlc3Rpbm8uXHJcbiAgICBpZiAoIXRhcmdldCB8fCAodGFyZ2V0Lm5vZGVUeXBlICE9PSBOb2RlLkVMRU1FTlRfTk9ERSAmJiB0YXJnZXQubm9kZVR5cGUgIT09IE5vZGUuQ09NTUVOVF9OT0RFKSkge1xyXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgdGFyZ2V0OiBtdXN0IGJlIGFuIEVsZW1lbnQgb3IgQ29tbWVudC4nKVxyXG4gICAgfVxyXG5cclxuICAgIC8vIFNlIHZhbGlkYSBsYSBwb3NpY2nDs24gZXNwZWNpZmljYWRhIHkgc2UgcmV0aXJhIGxhIG9wY2nDs24gcGFyYSBldml0YXIgYXJyYXN0cmFybGEuXHJcbiAgICBjb25zdCBwb3NpdGlvbiA9IG9wdGlvbnMucG9zaXRpb24gPz8gQ2xpcC5Qb3NpdGlvbi5lbmRcclxuICAgIGlmICghT2JqZWN0LnZhbHVlcyhDbGlwLlBvc2l0aW9uKS5pbmNsdWRlcyhwb3NpdGlvbikpIHtcclxuICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihgSW52YWxpZCBwb3NpdGlvbjogJHtTdHJpbmcocG9zaXRpb24pfS5gKVxyXG4gICAgfVxyXG4gICAgZGVsZXRlIG9wdGlvbnMucG9zaXRpb25cclxuXHJcbiAgICAvLyBMb3MgY29tZW50YXJpb3Mgbm8gcHVlZGVuIGNvbnRlbmVyIG5vZG9zLlxyXG4gICAgaWYgKHRhcmdldC5ub2RlVHlwZSA9PT0gTm9kZS5DT01NRU5UX05PREUgJiYgKHBvc2l0aW9uID09PSBDbGlwLlBvc2l0aW9uLnN0YXJ0IHx8IHBvc2l0aW9uID09PSBDbGlwLlBvc2l0aW9uLmVuZCkpIHtcclxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIHBvc2l0aW9uOiBzdGFydCBhbmQgZW5kIHJlcXVpcmUgYW4gRWxlbWVudCB0YXJnZXQuJylcclxuICAgIH1cclxuXHJcbiAgICAvLyBTZSBjb21wcnVlYmEgbGFzIHBvc2ljaW9uZXMgcXVlIHJlcXVpZXJlbiBxdWUgZWwgZWxlbWVudG8gZGVzdGlubyBlc3TDqSBjb250ZW5pZG8gZW4gb3RybyBlbGVtZW50by5cclxuICAgIGlmIChbQ2xpcC5Qb3NpdGlvbi5iZWZvcmUsIENsaXAuUG9zaXRpb24uYWZ0ZXIsIENsaXAuUG9zaXRpb24ucmVwbGFjZV0uaW5jbHVkZXMocG9zaXRpb24pICYmICF0YXJnZXQucGFyZW50Tm9kZSkge1xyXG4gICAgICAgIHRocm93IG5ldyBDbGlwRXJyb3IoYEludmFsaWQgdGFyZ2V0OiBtdXN0IGhhdmUgYSBwYXJlbnQgbm9kZSBmb3IgcG9zaXRpb24gXCIke3Bvc2l0aW9ufVwiLmApXHJcbiAgICB9XHJcblxyXG4gICAgLy8gU2UgcmVjdXBlcmEgZWwgZXN0YWRvIGRlbCBjbGlwLlxyXG4gICAgY29uc3Qgc3RhdGUgPSBfc3RhdGVzLmdldCh0aGlzKVxyXG5cclxuICAgIC8vIFNlIGdlbmVyYSBsYSByYcOteiBzaSB0b2RhdsOtYSBubyBleGlzdGUuICAgIFxyXG4gICAgbGV0IHJvb3QgPSBzdGF0ZS5yb290LCBmcmVzaCA9IGZhbHNlXHJcbiAgICBpZiAoIXJvb3QpIHtcclxuICAgICAgICBjb25zdCBjdHggPSBuZXcgUmVuZGVyQ29udGV4dCh0aGlzKVxyXG4gICAgICAgIFxyXG4gICAgICAgIGxldCByZXN1bHRcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICByZXN1bHQgPSBhd2FpdCB0aGlzLnJlbmRlcihjdHgsIG9wdGlvbnMpXHJcbiAgICAgICAgfSBjYXRjaCAoY2F1c2UpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IENsaXBFcnJvcihgVW5hYmxlIHRvIHJlbmRlciBjbGlwIFwiJHt0aGlzLmNsaXBOYW1lfVwiLmAsIHsgY2F1c2UgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocmVzdWx0ID09IG51bGwpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IENsaXBFcnJvcihgTWlzc2luZyByZW5kZXIgb3V0cHV0IGZvciBjbGlwIFwiJHt0aGlzLmNsaXBOYW1lfVwiLmApXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocmVzdWx0Lm5vZGVUeXBlID09PSBOb2RlLkVMRU1FTlRfTk9ERSkge1xyXG4gICAgICAgICAgICByb290ID0gcmVzdWx0O1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcmVzdWx0ID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICAgICAgY3R4LnByaW50KHJlc3VsdClcclxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGF3YWl0IGN0eC5yZXNvbHZlKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHJlc3VsdC5ub2RlVHlwZSA9PT0gTm9kZS5ET0NVTUVOVF9GUkFHTUVOVF9OT0RFKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG5vZGUgb2YgcmVzdWx0LmNoaWxkTm9kZXMpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gTm9kZS5FTEVNRU5UX05PREUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJvb3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBDbGlwRXJyb3IoJ011bHRpcGxlIHJvb3QgZWxlbWVudHMgYXJlIG5vdCBhbGxvd2VkLicpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgcm9vdCA9IG5vZGVcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG5vZGUubm9kZVR5cGUgPT09IE5vZGUuVEVYVF9OT0RFKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChub2RlLmRhdGEudHJpbSgpLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBDbGlwRXJyb3IoJ1RleHQgb3V0c2lkZSB0aGUgcm9vdCBlbGVtZW50IGlzIG5vdCBhbGxvd2VkLicpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG5vZGUubm9kZVR5cGUgIT09IE5vZGUuQ09NTUVOVF9OT0RFKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBDbGlwRXJyb3IoYFVuc3VwcG9ydGVkIG5vZGUgdHlwZSAoJHtub2RlLm5vZGVUeXBlfSkgb3V0c2lkZSB0aGUgcm9vdCBlbGVtZW50LmApXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXJvb3QpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IENsaXBFcnJvcignTWlzc2luZyBjbGlwIHJvb3Q6IHJlbmRlcigpIG11c3QgcmV0dXJuIGFuIEVsZW1lbnQsICcgKyBcclxuICAgICAgICAgICAgICAgICdvciBhIERvY3VtZW50RnJhZ21lbnQvSFRNTCBzdHJpbmcgY29udGFpbmluZyBhIHNpbmdsZSByb290IGVsZW1lbnQuJylcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFNlIGNvbXBydWViYSBxdWUgZWwgbWlzbW8gZWxlbWVudG8gbm8gZXN0w6kgYXNvY2lhZG8gYSBvdHJvIGNsaXAuXHJcbiAgICAgICAgY29uc3QgY2xpcCA9IF9yb290cy5nZXQocm9vdClcclxuICAgICAgICBpZiAoY2xpcCAmJiBjbGlwICE9PSB0aGlzKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBDbGlwRXJyb3IoJ0NsaXAgcm9vdCBhbHJlYWR5IGJlbG9uZ3MgdG8gYW5vdGhlciBjbGlwLicpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBTZSBpZGVudGlmaWNhIGVsIGVsZW1lbnRvIHJhw616IGRlbCBjbGlwLlxyXG4gICAgICAgIHJvb3Quc2V0QXR0cmlidXRlKCdkYXRhLWNsaXAnLCB0aGlzLmNsaXBOYW1lKVxyXG5cclxuICAgICAgICAvLyBTZSBpbmRpY2EgcXVlIGxhIHJhw616IGVzIGRlIHJlY2llbnRlIGNyZWFjacOzbi5cclxuICAgICAgICBmcmVzaCA9IHRydWVcclxuICAgIH1cclxuXHJcbiAgICAvLyBFbCBkZXN0aW5vIHB1ZWRlIGhhYmVyIGNhbWJpYWRvIGR1cmFudGUgZWwgcmVuZGVyaXphZG8uXHJcbiAgICBpZiAoW0NsaXAuUG9zaXRpb24uYmVmb3JlLCBDbGlwLlBvc2l0aW9uLmFmdGVyLCBDbGlwLlBvc2l0aW9uLnJlcGxhY2VdLmluY2x1ZGVzKHBvc2l0aW9uKSAmJiAhdGFyZ2V0LnBhcmVudE5vZGUpIHtcclxuICAgICAgICB0aHJvdyBuZXcgQ2xpcEVycm9yKCdUaGUgdGFyZ2V0IGVsZW1lbnQgbXVzdCBoYXZlIGEgcGFyZW50IGZvciB0aGlzIGluY2x1c2lvbiBwb3NpdGlvbi4nKVxyXG4gICAgfVxyXG5cclxuICAgIC8vIFNlIHJlY2hhemFuIGRlc3Rpbm9zIGRlbnRybyBkZSBsYSBwcm9waWEgcmHDrXouXHJcbiAgICBpZiAocm9vdC5jb250YWlucyh0YXJnZXQpKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IENsaXBFcnJvcignVGhlIHRhcmdldCBlbGVtZW50IGNhbm5vdCBiZSBjb250YWluZWQgd2l0aGluIHRoZSBjbGlwIHJvb3QuJylcclxuICAgIH1cclxuXHJcbiAgICBpZiAoZnJlc2gpIHtcclxuICAgICAgICAvLyBTZSB2aW5jdWxhIGVsIGVsZW1lbnRvIHJhw616IGNvbiBsYSBpbnN0YW5jaWEgZGVsIGNsaXAuIFxyXG4gICAgICAgIF9yb290cy5zZXQocm9vdCwgdGhpcylcclxuXHJcbiAgICAgICAgLy8gU2UgZ3VhcmRhIGVsIGVsZW1lbnRvIHJhw616IGVuIGVsIGVzdGFkbyBpbnRlcm5vIGRlIGxhIGluc3RhbmNpYS5cclxuICAgICAgICBzdGF0ZS5yb290ID0gcm9vdFxyXG5cclxuICAgICAgICAvLyBSZWZlcmVuY2lhIHBhcmEgZGVwdXJhY2nDs24uXHJcbiAgICAgICAgLy8gVE9ETzogRGFybGUgdW4gcGVuc2FkYSBhIGxhIG5vbWVuY2xhdHVyYSBkZSBsYSBwcm9waWVkYWQuXHJcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHJvb3QsICdfX2NsaXAnLCB7XHJcbiAgICAgICAgICAgIHZhbHVlOiB0aGlzLFxyXG4gICAgICAgICAgICBjb25maWd1cmFibGU6IHRydWVcclxuICAgICAgICB9KVxyXG4gICAgfSBcclxuXHJcbiAgICAvLyBTZSBndWFyZGEgc2kgbGEgcmHDrXogZXN0YWJhIGNvbmVjdGFkYSBhbnRlcyBkZSBpbmNsdWlybGEgZW4gZWwgZGVzdGluby5cclxuICAgIGNvbnN0IHdhc0Nvbm5lY3RlZCA9IHJvb3QuaXNDb25uZWN0ZWRcclxuXHJcbiAgICAvLyBSZWNlcHRvcmVzIGRlIGV2ZW50b3MuXHJcbiAgICBjb25zdCBldmVudFRhcmdldHMgPSB7XHJcbiAgICAgICAgZGV0YWNoOiBbXSwgYXR0YWNoOiBbXSAgICAgICAgXHJcbiAgICB9XHJcblxyXG4gICAgLy8gU2UgaW5zZXJ0YSBsYSByYcOtei5cclxuICAgIHN3aXRjaCAocG9zaXRpb24pIHtcclxuICAgICAgICBjYXNlIENsaXAuUG9zaXRpb24uYWZ0ZXI6XHJcbiAgICAgICAgICAgIHRhcmdldC5hZnRlcihyb290KVxyXG4gICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICBjYXNlIENsaXAuUG9zaXRpb24uYmVmb3JlOlxyXG4gICAgICAgICAgICB0YXJnZXQuYmVmb3JlKHJvb3QpXHJcbiAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgIGNhc2UgQ2xpcC5Qb3NpdGlvbi5yZXBsYWNlOlxyXG4gICAgICAgICAgICBjb25zdCBjb25uZWN0ZWQgPSB0YXJnZXQuaXNDb25uZWN0ZWRcclxuXHJcbiAgICAgICAgICAgIGlmICh0YXJnZXQuY29udGFpbnMocm9vdCkpIHtcclxuICAgICAgICAgICAgICAgIHRhcmdldC5iZWZvcmUocm9vdClcclxuICAgICAgICAgICAgICAgIHRhcmdldC5yZW1vdmUoKVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGFyZ2V0LnJlcGxhY2VXaXRoKHJvb3QpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChjb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNvbGxlY3QgPSBlbGVtZW50ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIFsuLi5lbGVtZW50LmNoaWxkcmVuXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2xsZWN0KGNoaWxkKVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjbGlwID0gX3Jvb3RzLmdldChlbGVtZW50KVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjbGlwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50VGFyZ2V0cy5kZXRhY2gucHVzaChjbGlwKVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBjb2xsZWN0KHRhcmdldCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgY2FzZSBDbGlwLlBvc2l0aW9uLnN0YXJ0OlxyXG4gICAgICAgICAgICB0YXJnZXQucHJlcGVuZChyb290KVxyXG4gICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICBjYXNlIENsaXAuUG9zaXRpb24uZW5kOlxyXG4gICAgICAgICAgICB0YXJnZXQuYXBwZW5kKHJvb3QpXHJcbiAgICAgICAgICAgIGJyZWFrXHJcbiAgICB9XHJcblxyXG4gICAgLy8gU2UgZGV0ZXJtaW5hIHNpIGVtaXRpciBlbCBldmVudG8gXCJhdHRhY2hcIiBvIFwiZGV0YWNoXCIgc29icmUgZWwgY2xpcCBpbmNsdcOtZG8geSBsb3MgY2xpcHMgY29udGVuaWRvcy5cclxuICAgIGNvbnN0IGlzQ29ubmVjdGVkID0gcm9vdC5pc0Nvbm5lY3RlZFxyXG4gICAgaWYgKGlzQ29ubmVjdGVkICE9PSB3YXNDb25uZWN0ZWQpIHtcclxuICAgICAgICBjb25zdCBjb2xsZWN0ID0gZWxlbWVudCA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNsaXAgPSBfcm9vdHMuZ2V0KGVsZW1lbnQpXHJcblxyXG4gICAgICAgICAgICBpZiAoY2xpcCAmJiBpc0Nvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICAgICAgZXZlbnRUYXJnZXRzLmF0dGFjaC5wdXNoKGNsaXApO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIGVsZW1lbnQuY2hpbGRyZW4pIHtcclxuICAgICAgICAgICAgICAgIGNvbGxlY3QoY2hpbGQpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChjbGlwICYmICFpc0Nvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICAgICAgZXZlbnRUYXJnZXRzLmRldGFjaC5wdXNoKGNsaXApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb2xsZWN0KHJvb3QpXHJcbiAgICB9XHJcblxyXG4gICAgLy8gU2UgZW1pdGVuIGxvcyBldmVudG9zIGNvcnJlc3BvbmRpZW50ZXMuXHJcbiAgICBmb3IgKGNvbnN0IGV2ZW50IG9mIE9iamVjdC5rZXlzKGV2ZW50VGFyZ2V0cykpIHtcclxuICAgICAgICBmb3IgKGNvbnN0IGNsaXAgb2YgZXZlbnRUYXJnZXRzW2V2ZW50XSkge1xyXG4gICAgICAgICAgICAvLyBUT0RPOiBFdmFsdWFyIHF1ZSBwYXNhIHNpIGxhIHByb3BhZ2FjacOzbiBkZWwgZXZlbnRvIGZhbGxhLlxyXG4gICAgICAgICAgICBjbGlwLmZpcmUoZXZlbnQpO1xyXG4gICAgICAgIH0gICAgXHJcbiAgICB9XHJcblxyXG4gICAgLy8gU2UgbGxhbWEgYWwgcmVhZHkgZW4gY2FkYSBpbmNsdXNpw7NuLlxyXG4gICAgdHJ5IHtcclxuICAgICAgICBhd2FpdCB0aGlzLnJlYWR5KHsgLi4ub3B0aW9ucywgZnJlc2gsIHJlbG9hZDogZmFsc2UgfSlcclxuICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICAgIHRocm93IG5ldyBDbGlwRXJyb3IoYFVuYWJsZSB0byByZWFkeSBjbGlwIFwiJHt0aGlzLmNsaXBOYW1lfVwiLmAsIHsgY2F1c2U6IGVyciB9KVxyXG4gICAgfVxyXG5cclxuICAgIC8vIFNlIGluaWNpYSBsYSBjYXJnYSBkZSBkYXRvcyBhZGljaW9uYWxlcy5cclxuICAgIGlmICghc3RhdGUubG9hZFN0YXJ0ZWQpIHtcclxuICAgICAgICBzdGF0ZS5sb2FkU3RhcnRlZCA9IHRydWU7XHJcblxyXG4gICAgICAgIHZvaWQgKGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgbGV0IGRhdGFcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGRhdGEgPSBhd2FpdCB0aGlzLmxvYWQoeyAuLi5vcHRpb25zLCByZWxvYWQ6IGZhbHNlIH0pXHJcbiAgICAgICAgICAgICAgICBzdGF0ZS5sb2FkVGltZSA9IERhdGUubm93KCkgICAgICAgICAgICBcclxuICAgICAgICAgICAgfSBjYXRjaCAoY2F1c2UpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBDbGlwRXJyb3IoYFVuYWJsZSB0byBsb2FkIGRhdGEgZm9yIGNsaXAgXCIke3RoaXMuY2xpcE5hbWV9XCIuYCwgeyBjYXVzZSB9KVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy51cGRhdGUoeyAuLi5vcHRpb25zLCBkYXRhLCByZWxvYWQ6IGZhbHNlIH0pXHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGNhdXNlKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgQ2xpcEVycm9yKGBVbmFibGUgdG8gdXBkYXRlIGNsaXAgXCIke3RoaXMuY2xpcE5hbWV9XCIuYCwgeyBjYXVzZSB9KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSkoKS5jYXRjaChlcnIgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gU2UgZGV2dWVsdmUgbGEgcHJvcGlhIGluc3RhbmNpYS5cclxuICAgIHJldHVybiB0aGlzXHJcbn1cclxuXHJcblxyXG4vKiBDTElQIEVWRU5UXHJcbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xyXG4vKipcclxuICogSW50ZXJuYWwgZXZlbnQgc3RhdGVzLlxyXG4gKiBcclxuICogQHByaXZhdGVcclxuICogQHR5cGUge1dlYWtNYXA8Q2xpcEV2ZW50LCB7XHJcbiAqICAgICB0YXJnZXQ6IENsaXB8bnVsbCxcclxuICogICAgIGN1cnJlbnRUYXJnZXQ6IENsaXB8bnVsbFxyXG4gKiB9Pn1cclxuICovXHJcbmNvbnN0IF9ldmVudFN0YXRlcyA9IG5ldyBXZWFrTWFwKClcclxuXHJcbi8qKlxyXG4gKiBFdmVudCBkaXNwYXRjaGVkIGJ5IGEgY2xpcC5cclxuICovXHJcbmNsYXNzIENsaXBFdmVudCB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDcmVhdGVzIGEgY2xpcCBldmVudC5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZSBFdmVudCB0eXBlLlxyXG4gICAgICogQHBhcmFtIHsqfSBbZGV0YWlsXSBFdmVudCBkYXRhLlxyXG4gICAgICovXHJcbiAgICBjb25zdHJ1Y3Rvcih0eXBlLCBkZXRhaWwpIHtcclxuICAgICAgICBpZiAodHlwZW9mIHR5cGUgIT09ICdzdHJpbmcnIHx8IHR5cGUubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgZXZlbnQgdHlwZTogYSBub24tZW1wdHkgc3RyaW5nIGlzIHJlcXVpcmVkLicpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBfZXZlbnRTdGF0ZXMuc2V0KHRoaXMsIHtcclxuICAgICAgICAgICAgdGFyZ2V0OiBudWxsLFxyXG4gICAgICAgICAgICBjdXJyZW50VGFyZ2V0OiBudWxsXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xyXG4gICAgICAgICAgICB0eXBlOiB7XHJcbiAgICAgICAgICAgICAgICB2YWx1ZTogdHlwZSxcclxuICAgICAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWVcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZGV0YWlsOiB7XHJcbiAgICAgICAgICAgICAgICB2YWx1ZTogZGV0YWlsLFxyXG4gICAgICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENsaXAgdGhhdCBpbml0aWF0ZWQgdGhlIGN1cnJlbnQgZGlzcGF0Y2guXHJcbiAgICAgKlxyXG4gICAgICogQHR5cGUge0NsaXB8bnVsbH1cclxuICAgICAqIEByZWFkb25seVxyXG4gICAgICovXHJcbiAgICBnZXQgdGFyZ2V0KCkge1xyXG4gICAgICAgIHJldHVybiBfZXZlbnRTdGF0ZXMuZ2V0KHRoaXMpLnRhcmdldFxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2xpcCB3aG9zZSBsaXN0ZW5lcnMgYXJlIGN1cnJlbnRseSBiZWluZyBjYWxsZWQuXHJcbiAgICAgKlxyXG4gICAgICogQHR5cGUge0NsaXB8bnVsbH1cclxuICAgICAqIEByZWFkb25seVxyXG4gICAgICovXHJcbiAgICBnZXQgY3VycmVudFRhcmdldCgpIHtcclxuICAgICAgICByZXR1cm4gX2V2ZW50U3RhdGVzLmdldCh0aGlzKS5jdXJyZW50VGFyZ2V0XHJcbiAgICB9XHJcblxyXG59XHJcblxyXG5cclxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXHJcbi8qKlxyXG4gKiBDbGlwIEVycm9yLlxyXG4gKi9cclxuY2xhc3MgQ2xpcEVycm9yIGV4dGVuZHMgRXJyb3Ige1xyXG5cclxuICAgIC8vIEPDs2RpZ29zIGRlIGVycm9yOlxyXG4gICAgc3RhdGljIGFscmVhZHlEZWZpbmVkICAgPSAnYWxyZWFkeV9kZWZpbmVkJ1xyXG4gICAgc3RhdGljIHJvb3RSZXF1aXJlZCAgICAgPSAncm9vdF9yZXF1aXJlZCdcclxuICAgIHN0YXRpYyBsb2FkRmFpbGVkICAgICAgID0gJ2xvYWRfZmFpbGVkJ1xyXG4gICAgc3RhdGljIG5vdERlZmluZWQgICAgICAgPSAnbm90X2RlZmluZWQnXHJcbiAgICBzdGF0aWMgbm90Rm91bmQgICAgICAgICA9ICdub3RfZm91bmQnXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDb25zdHJ1Y3Rvci5cclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIERlc2NyaXBjacOzbiBkZWwgZXJyb3IuXHJcbiAgICAgKiBAcGFyYW0ge3sgY29kZT86IHN0cmluZywgY2F1c2U/OiBFcnJvciB8IEVycm9yW10gfX0gW29wdGlvbnNdIE9wY2lvbmVzIGFkaWNpb25hbGVzLlxyXG4gICAgICovXHJcbiAgICBjb25zdHJ1Y3RvcihtZXNzYWdlLCB7IGNvZGUgPSBudWxsLCBjYXVzZSB9ID0ge30pIHtcclxuICAgICAgICBzdXBlcihTdHJpbmcobWVzc2FnZSksIGNhdXNlICE9PSB1bmRlZmluZWQgPyB7IGNhdXNlIH0gOiB1bmRlZmluZWQpXHJcblxyXG4gICAgICAgIHRoaXMubmFtZSA9ICdDbGlwRXJyb3InXHJcbiAgICAgICAgdGhpcy5jb2RlID0gY29kZVxyXG5cclxuICAgICAgICBpZiAoRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UpIHtcclxuICAgICAgICAgICAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgQ2xpcEVycm9yKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuXHJcbi8qIFJFTkRFUiBDT05URVhUXHJcbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xyXG4vKipcclxuICogQnVpbGRzIEhUTUwgb3V0cHV0IGFuZCByZXNvbHZlcyBuZXN0ZWQgY2xpcCBhbmQgdGVtcGxhdGUgaW5jbHVzaW9ucy5cclxuICpcclxuICogRWFjaCBjb250ZXh0IGJlbG9uZ3MgdG8gYSBjbGlwIGFuZCByZXByZXNlbnRzIGEgc2luZ2xlIHJlbmRlcmluZyBvcGVyYXRpb24uIEluY2x1c2lvbiBtYXJrZXJzIG11c3QgYXBwZWFyIGV4YWN0bHkgXHJcbiAqIG9uY2UgaW4gdGhlIGdlbmVyYXRlZCBIVE1MLlxyXG4gKi9cclxuY2xhc3MgUmVuZGVyQ29udGV4dCB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBIVE1MIG91dHB1dCBjaHVua3MuXHJcbiAgICAgKlxyXG4gICAgICogQHR5cGUge3N0cmluZ1tdfVxyXG4gICAgICovXHJcbiAgICAjb3V0ID0gW11cclxuXHJcbiAgICAvKipcclxuICAgICAqIENsaXAgYXNzb2NpYXRlZCB3aXRoIHRoaXMgcmVuZGVyaW5nIG9wZXJhdGlvbi5cclxuICAgICAqXHJcbiAgICAgKiBAdHlwZSB7Q2xpcH1cclxuICAgICAqL1xyXG4gICAgI2NsaXAgPSBudWxsXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBQZW5kaW5nIGluY2x1c2lvbnMsIGluIHJlZ2lzdHJhdGlvbiBvcmRlci5cclxuICAgICAqXHJcbiAgICAgKiBAdHlwZSB7QXJyYXk8e25hbWU6IHN0cmluZywgb3B0aW9uczogT2JqZWN0fT59XHJcbiAgICAgKi9cclxuICAgICNpbmNsdWRlcyA9IFtdXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBXaGV0aGVyIHJlc29sdXRpb24gaGFzIHN0YXJ0ZWQuXHJcbiAgICAgKlxyXG4gICAgICogQHR5cGUge2Jvb2xlYW59XHJcbiAgICAgKi9cclxuICAgICNyZXNvbHZlU3RhcnRlZCA9IGZhbHNlXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDcmVhdGVzIGEgcmVuZGVyaW5nIGNvbnRleHQgYXNzb2NpYXRlZCB3aXRoIGEgY2xpcC5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge0NsaXB9IGNsaXAgQXNzb2NpYXRlZCBjbGlwLlxyXG4gICAgICovXHJcbiAgICBjb25zdHJ1Y3RvcihjbGlwKSB7XHJcbiAgICAgICAgdGhpcy4jY2xpcCA9IGNsaXBcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFJlZ2lzdGVycyBhbiBpbmNsdXNpb24gYW5kIHJldHVybnMgaXRzIEhUTUwgY29tbWVudCBtYXJrZXIuXHJcbiAgICAgKlxyXG4gICAgICogTmFtZXMgYmVnaW5uaW5nIHdpdGggdGhlIGNsaXAgcHJlZml4IGlkZW50aWZ5IGNsaXBzLiBPdGhlciBuYW1lcyBpZGVudGlmeSB0ZW1wbGF0ZXMuXHJcbiAgICAgKlxyXG4gICAgICogVGhlIHJldHVybmVkIG1hcmtlciBtdXN0IGJlIGluY29ycG9yYXRlZCBpbnRvIHRoZSBIVE1MIG91dHB1dC4gSW5jbHVzaW9uIG9wdGlvbnMgYXJlIHNoYWxsb3ctY29waWVkIHdoZW4gcmVnaXN0ZXJlZC5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBDbGlwIG9yIHRlbXBsYXRlIG5hbWUuXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnM9e31dIEluY2x1c2lvbiBvcHRpb25zLlxyXG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBjb21tZW50IG1hcmtlci5cclxuICAgICAqL1xyXG4gICAgaW5jbHVkZShuYW1lLCBvcHRpb25zKSB7XHJcbiAgICAgICAgdGhpcy4jYXNzZXJ0UmVzb2x2ZU5vdFN0YXJ0ZWQoKVxyXG5cclxuICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuI2luY2x1ZGVzLmxlbmd0aFxyXG4gICAgICAgIHRoaXMuI2luY2x1ZGVzLnB1c2goeyBuYW1lLCBvcHRpb25zIH0pXHJcblxyXG4gICAgICAgIHJldHVybiBgPCEtLVtjbGlwLXNsb3Q6JHtpbmRleH1dLS0+YFxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQXBwZW5kcyBhIHZhbHVlIHRvIHRoZSBIVE1MIG91dHB1dC5cclxuICAgICAqXHJcbiAgICAgKiBUaGUgdmFsdWUgaXMgY29udmVydGVkIHRvIGEgc3RyaW5nIGJlZm9yZSBvcHRpb25hbGx5IGJlaW5nIGVzY2FwZWQuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHsqfSB2YWx1ZSBWYWx1ZSB0byBhcHBlbmQuXHJcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtlc2M9ZmFsc2VdIFdoZXRoZXIgdG8gZXNjYXBlIEhUTUwgc3BlY2lhbCBjaGFyYWN0ZXJzLlxyXG4gICAgICogQHJldHVybnMge3ZvaWR9XHJcbiAgICAgKi9cclxuICAgIHByaW50KHZhbHVlLCBlc2MgPSBmYWxzZSkge1xyXG4gICAgICAgIHRoaXMuI2Fzc2VydFJlc29sdmVOb3RTdGFydGVkKClcclxuXHJcbiAgICAgICAgdmFsdWUgPSBTdHJpbmcodmFsdWUpXHJcbiAgICAgICAgdGhpcy4jb3V0LnB1c2goZXNjID8gdGhpcy5lc2NhcGUodmFsdWUpIDogdmFsdWUpXHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICogUGFyc2VzIHRoZSBhY2N1bXVsYXRlZCBIVE1MIGFuZCByZXNvbHZlcyBhbGwgcmVnaXN0ZXJlZCBpbmNsdXNpb25zLlxyXG4gICAgICpcclxuICAgICAqIEluY2x1c2lvbiBtYXJrZXJzIGFyZSBsb2NhdGVkIGJlZm9yZSByZXNvbHZpbmcgYW55IGluY2x1c2lvbi5cclxuICAgICAqIEluY2x1c2lvbnMgYXJlIHRoZW4gcmVzb2x2ZWQgc2VxdWVudGlhbGx5IGluIHJlZ2lzdHJhdGlvbiBvcmRlci5cclxuICAgICAqXHJcbiAgICAgKiBUaGUgcmVzdWx0aW5nIG5vZGVzIGJlbG9uZyB0byBhIGRldGFjaGVkIERvY3VtZW50RnJhZ21lbnQuXHJcbiAgICAgKlxyXG4gICAgICogQHJldHVybnMge1Byb21pc2U8RG9jdW1lbnRGcmFnbWVudD59IFJlbmRlcmVkIEhUTUwgZnJhZ21lbnQuXHJcbiAgICAgKiBAdGhyb3dzIHtFcnJvcn0gSWYgYW4gaW5jbHVzaW9uIG1hcmtlciBpcyBpbnZhbGlkLCBkdXBsaWNhdGVkIG9yIG1pc3NpbmcuXHJcbiAgICAgKi9cclxuICAgIGFzeW5jIHJlc29sdmUoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuI3Jlc29sdmVTdGFydGVkKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBDbGlwRXJyb3IoJ1JlbmRlciBjb250ZXh0IHJlc29sdXRpb24gaGFzIGFscmVhZHkgc3RhcnRlZC4nKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy4jcmVzb2x2ZVN0YXJ0ZWQgPSB0cnVlXHJcblxyXG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGVtcGxhdGUnKVxyXG4gICAgICAgIHRlbXBsYXRlLmlubmVySFRNTCA9IHRoaXMuI291dC5qb2luKCcnKVxyXG5cclxuICAgICAgICBjb25zdCBzbG90cyA9IG5ldyBNYXAoKVxyXG5cclxuICAgICAgICBjb25zdCB3YWxrZXIgPSBkb2N1bWVudC5jcmVhdGVUcmVlV2Fsa2VyKHRlbXBsYXRlLmNvbnRlbnQsIE5vZGVGaWx0ZXIuU0hPV19DT01NRU5UKVxyXG5cclxuICAgICAgICB3aGlsZSAod2Fsa2VyLm5leHROb2RlKCkpIHtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHdhbGtlci5jdXJyZW50Tm9kZVxyXG4gICAgICAgICAgICBjb25zdCBtYXRjaCA9IC9eXFxbY2xpcC1zbG90OigwfFsxLTldXFxkKilcXF0kLy5leGVjKG5vZGUuZGF0YSlcclxuXHJcbiAgICAgICAgICAgIGlmICghbWF0Y2gpIHtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gTnVtYmVyKG1hdGNoWzFdKVxyXG5cclxuICAgICAgICAgICAgaWYgKGluZGV4ID49IHRoaXMuI2luY2x1ZGVzLmxlbmd0aCB8fCBzbG90cy5oYXMoaW5kZXgpKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgQ2xpcEVycm9yKGBJbnZhbGlkIGluY2x1ZGUgc2xvdDogJHtub2RlLmRhdGF9YClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgc2xvdHMuc2V0KGluZGV4LCBub2RlKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHNsb3RzLnNpemUgIT09IHRoaXMuI2luY2x1ZGVzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgQ2xpcEVycm9yKGBJbmNsdWRlcyBtaXNtYXRjaDogJHtzbG90cy5zaXplfSB2cyAke3RoaXMuI2luY2x1ZGVzLmxlbmd0aH1gKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLiNpbmNsdWRlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBjb25zdCB7IG5hbWUsIG9wdGlvbnMgfSA9IHRoaXMuI2luY2x1ZGVzW2ldXHJcblxyXG4gICAgICAgICAgICBpZiAobmFtZS5zdGFydHNXaXRoKF9jbGlwUHJlZml4KSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY2xpcCA9IGF3YWl0IGNsaXBzLmNyZWF0ZShuYW1lLnN1YnN0cmluZyhfY2xpcFByZWZpeC5sZW5ndGgpLCBvcHRpb25zKVxyXG5cclxuICAgICAgICAgICAgICAgIGF3YWl0IGNsaXAuaW5jbHVkZShzbG90cy5nZXQoaSksIHsgLi4ub3B0aW9ucywgcG9zaXRpb246IENsaXAuUG9zaXRpb24ucmVwbGFjZSB9KVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZnJhZ21lbnQgPSBhd2FpdCBjbGlwcy5yZW5kZXIodGhpcy4jY2xpcCwgbmFtZSwgb3B0aW9ucylcclxuXHJcbiAgICAgICAgICAgICAgICBzbG90cy5nZXQoaSkucmVwbGFjZVdpdGgoZnJhZ21lbnQpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0ZW1wbGF0ZS5jb250ZW50XHJcbiAgICB9XHJcblxyXG4gICAgI2Fzc2VydFJlc29sdmVOb3RTdGFydGVkKCkge1xyXG4gICAgICAgIGlmICh0aGlzLiNyZXNvbHZlU3RhcnRlZCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgQ2xpcEVycm9yKCdDYW5ub3QgbW9kaWZ5IGEgcmVuZGVyIGNvbnRleHQgYWZ0ZXIgcmVzb2x1dGlvbiBoYXMgc3RhcnRlZC4nKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENvbmNhdGVuYXRlcyB0aGUgcmVzdWx0cyBvZiBhIHN5bmNocm9ub3VzIGNhbGxiYWNrIG92ZXIgYW4gaXRlcmFibGUuXHJcbiAgICAgKlxyXG4gICAgICogVGhlIGNhbGxiYWNrIHJlY2VpdmVzIGVhY2ggaXRlbSBhbmQgaXRzIHplcm8tYmFzZWQgaXRlcmF0aW9uIGluZGV4LFxyXG4gICAgICogd2l0aCB0aGUgYXNzb2NpYXRlZCBjbGlwIGFzIGl0cyB0aGlzIHZhbHVlLlxyXG4gICAgICogTnVsbCBhbmQgdW5kZWZpbmVkIHJlc3VsdHMgYXJlIG9taXR0ZWQuIFJlc3VsdHMgYXJlIG5vdCBIVE1MLWVzY2FwZWQuXHJcbiAgICAgKiBOdWxsIG9yIHVuZGVmaW5lZCBpdGVtcyBhcmUgdHJlYXRlZCBhcyBhbiBlbXB0eSBpdGVyYWJsZS5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge0l0ZXJhYmxlPCo+fG51bGx8dW5kZWZpbmVkfSBpdGVtcyBJdGVtcyB0byBpdGVyYXRlIG92ZXIuXHJcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9uKCosIG51bWJlcik6ICp9IGNhbGxiYWNrIFN5bmNocm9ub3VzIHJlbmRlcmluZyBjYWxsYmFjay5cclxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IENvbmNhdGVuYXRlZCBjYWxsYmFjayByZXN1bHRzLlxyXG4gICAgICovXHJcbiAgICBlYWNoKGl0ZW1zLCBjYWxsYmFjaykge1xyXG4gICAgICAgIGNvbnN0IG91dCA9IFtdXHJcbiAgICAgICAgXHJcbiAgICAgICAgbGV0IGluZGV4ID0gMFxyXG4gICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcyA/PyBbXSkge1xyXG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGNhbGxiYWNrLmNhbGwodGhpcy4jY2xpcCwgaXRlbSwgaW5kZXgrKylcclxuXHJcbiAgICAgICAgICAgIGlmICh2YWx1ZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBvdXQucHVzaCh2YWx1ZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG91dC5qb2luKCcnKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ29udmVydHMgYSB2YWx1ZSB0byBhIHN0cmluZyBhbmQgZXNjYXBlcyBIVE1MIHNwZWNpYWwgY2hhcmFjdGVycy5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0geyp9IHZhbHVlIFZhbHVlIHRvIGVzY2FwZS5cclxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEVzY2FwZWQgc3RyaW5nLlxyXG4gICAgICovXHJcbiAgICBlc2NhcGUodmFsdWUpIHtcclxuICAgICAgICByZXR1cm4gZXNjYXBlLmh0bWwodmFsdWUpXHJcbiAgICB9XHJcblxyXG59XHJcblxyXG5cclxuLyogQ0xJUFMgT0JKRUNUXHJcbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xyXG5cclxuLyoqXHJcbiAqIEZvcm1hdG8gZGVsIG5vbWJyZSBkZSBsb3MgY2xpcHMgKHBhdGgtbGlrZSksIHVubyBvIHZhcmlvcyBzZWdtZW50b3Mgc2VwYXJhZG9zIFxyXG4gKiBwb3IgXCIvXCIsIGNhZGEgc2VnbWVudG86IFtBLVphLXowLTlfLV0rXHJcbiAqIFxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAdHlwZSB7UmVnRXhwfVxyXG4gKiBAY29uc3RhbnRcclxuICovIFxyXG5jb25zdCBfY2xpcE5hbWVSZWdleHAgPSAvXltBLVphLXowLTlfLV0rKD86XFwvW0EtWmEtejAtOV8tXSspKiQvO1xyXG5cclxuLyoqXHJcbiAqIExvbmdpdHVkIG3DoXhpbWEgcGVybWl0aWRhIHBhcmEgbG9zIG5vbWJyZXMgZGUgY2xpcC5cclxuICogXHJcbiAqIEBwcml2YXRlXHJcbiAqIEB0eXBlIHtudW1iZXJ9XHJcbiAqIEBjb25zdGFudFxyXG4gKi9cclxuY29uc3QgX2NsaXBOYW1lTWF4TGVuZ3RoID0gMjU2O1xyXG5cclxuLyoqXHJcbiAqIEFqdXN0ZXMgZGUgY29uZmlndXJhY2nDs24uXHJcbiAqIEB0eXBlIHtPYmplY3R9XHJcbiAqIEBwcml2YXRlXHJcbiAqIEBjb25zdGFudFxyXG4gKi9cclxuY29uc3QgX3NldHRpbmdzID0ge1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogSW5kaWNhIHNpIGFjdGl2YXIgZWwgbW9kbyBkZSBkZXB1cmFjacOzbi5cclxuICAgICAqIEB0eXBlIHtib29sZWFufVxyXG4gICAgICogQGRlZmF1bHQgZmFsc2VcclxuICAgICAqL1xyXG4gICAgZGVidWc6IGZhbHNlLFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogUnV0YSBiYXNlIGRvbmRlIHNlIHViaWNhIGxhIGRlZmluaWNpw7NuIGRlIGxvcyBjbGlwcy5cclxuICAgICAqIEB0eXBlIHtzdHJpbmd9XHJcbiAgICAgKiBAZGVmYXVsdCAnL2NsaXBzJ1xyXG4gICAgICovXHJcbiAgICBiYXNlUGF0aDogJy9jbGlwcycsXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBJbmRpY2Egc2kgbG9zIGVzdGlsb3MgZXN0w6FuIHByZS1lbXBhcXVldGFkb3MuXHJcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cclxuICAgICAqIEBkZWZhdWx0IGZhbHNlXHJcbiAgICAgKi9cclxuICAgIHN0eWxlc0J1bmRsZWQ6IGZhbHNlLFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSW5kaWNhIHNpIGxhcyBwbGFudGlsbGFzIGVzdMOhbiBwcmUtZW1wYXF1ZXRhZGFzLlxyXG4gICAgICogQHR5cGUge2Jvb2xlYW59XHJcbiAgICAgKiBAZGVmYXVsdCBmYWxzZVxyXG4gICAgICovXHJcbiAgICB0ZW1wbGF0ZXNCdW5kbGVkOiBmYWxzZVxyXG59XHJcblxyXG4vKipcclxuICogQ2xpcHMgcmVnaXN0cmFkb3MgcG9yIG5vbWJyZS5cclxuICogXHJcbiAqIEBwcml2YXRlXHJcbiAqIEB0eXBlIHtNYXA8c3RyaW5nLCB0eXBlb2YgQ2xpcD59XHJcbiAqL1xyXG5jb25zdCBfY2xpcFR5cGVzID0gbmV3IE1hcCgpXHJcblxyXG5cclxuLyoqXHJcbiAqIFRPRE86IEZhbHRhIGRvY3VtZW50YWNpw7NuLlxyXG4gKiBcclxuICogQG5hbWVzcGFjZVxyXG4gKi9cclxuY29uc3QgY2xpcHMgPSB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBY3R1YWxpemEgbG9zIGFqdXN0ZXMgZGUgY29uZmlndXJhY2nDs24gZXNwZWNpZmljYWRvcy5cclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyBBanVzdGVzIGRlIGNvbmZpZ3VyYWNpw7NuLlxyXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbc2V0dGluZ3MuZGVidWddIEluZGljYSBzaSBhY3RpdmFyIGVsIG1vZG8gZGVidWcuXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gIFtzZXR0aW5ncy5iYXNlUGF0aF0gUnV0YSBiYXNlIGRvbmRlIHNlIGxvY2FsaXphIGxhIGRlZmluaWNpw7NuIGRlIGxvcyBjbGlwcy5cclxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW3NldHRpbmdzLnN0eWxlc0J1bmRsZWRdIEluZGljYSBzaSBsb3MgZXN0aWxvcyBlc3TDoW4gcHJlLWVtcGFxdWV0YWRvcy5cclxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW3NldHRpbmdzLnRlbXBsYXRlc0J1bmRsZWRdIEluZGljYSBzaSBsYXMgcGxhbnRpbGxhcyBlc3TDoW4gcHJlLWVtcGFxdWV0YWRhcy5cclxuICAgICAqL1xyXG4gICAgc2V0dXAoc2V0dGluZ3MpIHtcclxuICAgICAgICBPYmplY3QuYXNzaWduKF9zZXR0aW5ncywgc2V0dGluZ3MpO1xyXG4gICAgfSxcclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiBEZWZpbmVzIGEgbmV3IGNsaXAgdHlwZS5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBVbmlxdWUgY2xpcCBuYW1lLlxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHByb3RvIENsaXAgcHJvdG90eXBlLlxyXG4gICAgICogQHJldHVybnMge1Byb21pc2U8dHlwZW9mIENsaXA+fSBSZXNvbHZlcyB0byB0aGUgbmV3IGNsaXAgY29uc3RydWN0b3IuXHJcbiAgICAgKi9cclxuICAgIGFzeW5jIGRlZmluZShuYW1lLCBwcm90bykge1xyXG4gICAgICAgIC8vIFNlIHZhbGlkYSBlbCBub21icmUuXHJcbiAgICAgICAgaWYgKHR5cGVvZiBuYW1lICE9PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGNsaXAgbmFtZTogc3RyaW5nIHJlcXVpcmVkLicpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBuYW1lID0gbmFtZS50cmltKClcclxuXHJcbiAgICAgICAgaWYgKCFuYW1lKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgY2xpcCBuYW1lOiBlbXB0eSBzdHJpbmcuJylcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChuYW1lLmxlbmd0aCA+IF9jbGlwTmFtZU1heExlbmd0aCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihgSW52YWxpZCBjbGlwIG5hbWU6IHRvbyBsb25nICgke25hbWUubGVuZ3RofSA+ICR7X2NsaXBOYW1lTWF4TGVuZ3RofSkuYClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghX2NsaXBOYW1lUmVnZXhwLnRlc3QobmFtZSkpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBjbGlwIG5hbWU6IGV4cGVjdGVkIHBhdGgtbGlrZSBzdHJpbmcgd2l0aG91dCBsZWFkaW5nIG9yIHRyYWlsaW5nIHNsYXNoLicpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBTZSBwZXJtaXRlIHVuYSBwcm9tZXNhIHBlbmRpZW50ZSwgcGVybyBubyB1biB0aXBvIHlhIGRlZmluaWRvLlxyXG4gICAgICAgIGNvbnN0IHByZXZpb3VzID0gX2NsaXBUeXBlcy5nZXQobmFtZSlcclxuXHJcbiAgICAgICAgaWYgKHByZXZpb3VzPy5wcm90b3R5cGUgaW5zdGFuY2VvZiBDbGlwKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBDbGlwRXJyb3IoYENsaXAgXCIke25hbWV9XCIgYWxyZWFkeSBkZWZpbmVkLmAsIHtcclxuICAgICAgICAgICAgICAgIGNvZGU6IENsaXBFcnJvci5hbHJlYWR5RGVmaW5lZFxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gU2UgdmFsaWRhIGVsIG9iamV0byBwcm90b3RpcG8uXHJcbiAgICAgICAgaWYgKHByb3RvID09PSBudWxsIHx8IHR5cGVvZiBwcm90byAhPT0gJ29iamVjdCcpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBwcm90b3R5cGU6IG9iamVjdCByZXF1aXJlZC4nKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gU2UgcmVzdWVsdmUgZWwgdGlwbyBiYXNlIGRlbCBjbGlwLlxyXG4gICAgICAgIGxldCBCYXNlQ2xpcCA9IENsaXBcclxuXHJcbiAgICAgICAgaWYgKHByb3RvLmV4dGVuZHMgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBsZXQgZXh0ID0gcHJvdG8uZXh0ZW5kc1xyXG5cclxuICAgICAgICAgICAgaWYgKHR5cGVvZiBleHQgIT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBJbnZhbGlkIGV4dGVuZHM6IHN0cmluZyByZXF1aXJlZC5gKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBleHQgPSBleHQudHJpbSgpXHJcblxyXG4gICAgICAgICAgICBpZiAoIWV4dCkge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgSW52YWxpZCBleHRlbmRzOiBlbXB0eSBzdHJpbmcuYClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGV4dCA9PT0gbmFtZSkge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBleHRlbmRzOiBhIGNsaXAgY2Fubm90IGV4dGVuZCBpdHNlbGYuJylcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgQmFzZUNsaXAgPSBhd2FpdCBfZ2V0Q2xpcFR5cGUoZXh0KVxyXG5cclxuICAgICAgICAgICAgaWYgKCFCYXNlQ2xpcCkge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IENsaXBFcnJvcihgSW52YWxpZCBleHRlbmRzOiBjbGlwIFwiJHtleHR9XCIgbm90IGRlZmluZWQuYCwgeyBjb2RlOiBDbGlwRXJyb3Iubm90RGVmaW5lZCB9KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBTZSBhZG1pdGUgdW4gb2JqZXRvIHBsYW5vIG8gdW5vIHByZXZpYW1lbnRlIHZpbmN1bGFkbyBhIGVzdGEgY2xhc2UgYmFzZS5cclxuICAgICAgICBjb25zdCBwYXJlbnQgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YocHJvdG8pXHJcblxyXG4gICAgICAgIGlmIChwYXJlbnQgIT09IE9iamVjdC5wcm90b3R5cGUgJiYgcGFyZW50ICE9PSBCYXNlQ2xpcC5wcm90b3R5cGUpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBwcm90b3R5cGU6IHBsYWluIG9iamVjdCBvciBvYmplY3QgbGlua2VkIHRvIHRoZSBiYXNlIGNsaXAgcHJvdG90eXBlIHJlcXVpcmVkLicpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBTZSBjcmVhIGxhIGNsYXNlIGRlbCBudWV2byBjbGlwLlxyXG4gICAgICAgIGNvbnN0IEMgPSBjbGFzcyBleHRlbmRzIEJhc2VDbGlwIHt9XHJcblxyXG4gICAgICAgIC8vIFNlIGVzdGFibGVjZSBlbCBwcm90b3RpcG8gYmFzZSBwYXJhIHBlcm1pdGlyIGVsIHVzbyBkZSBzdXBlci5cclxuICAgICAgICBPYmplY3Quc2V0UHJvdG90eXBlT2YocHJvdG8sIEJhc2VDbGlwLnByb3RvdHlwZSlcclxuXHJcbiAgICAgICAgLy8gU2Ugb2J0aWVuZW4gbG9zIGRlc2NyaXB0b3JlcywgZXhjbHV5ZW5kbyBcImNvbnN0cnVjdG9yXCIsIFwiZXh0ZW5kc1wiIHkgXCJzdHlsZXNcIi5cclxuICAgICAgICBjb25zdCBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcnMocHJvdG8pXHJcbiAgICAgICAgZGVsZXRlIGRlc2MuY29uc3RydWN0b3JcclxuICAgICAgICBkZWxldGUgZGVzYy5leHRlbmRzXHJcbiAgICAgICAgZGVsZXRlIGRlc2Muc3R5bGVzXHJcblxyXG4gICAgICAgIC8vIFNlIGluY29ycG9yYW4gbG9zIG1pZW1icm9zIGFsIHByb3RvdGlwbyBkZSBsYSBjbGFzZS5cclxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhDLnByb3RvdHlwZSwgZGVzYylcclxuXHJcbiAgICAgICAgLy8gU2UgYXNpZ25hIGEgbGEgY2xhc2UgZWwgbm9tYnJlIGRlbCB0aXBvIGRlIGNsaXAuXHJcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEMsICduYW1lJywge1xyXG4gICAgICAgICAgICB2YWx1ZTogbmFtZSxcclxuICAgICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgLy8gU2UgaW1wb3J0YW4gbGEgZXN0aWxvcyB2aW5jdWxhZG9zIGFsIGNsaXAuXHJcbiAgICAgICAgYXdhaXQgX2ltcG9ydENsaXBTdHlsZXMobmFtZSwgcHJvdG8uc3R5bGVzKTtcclxuXHJcbiAgICAgICAgLy8gU2UgY29tcHJ1ZWJhIHF1ZSBsYSBlbnRyYWRhIG5vIGhheWEgY2FtYmlhZG8gZHVyYW50ZSBsYSBkZWZpbmljacOzbi5cclxuICAgICAgICBpZiAoX2NsaXBUeXBlcy5nZXQobmFtZSkgIT09IHByZXZpb3VzKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBDbGlwRXJyb3IoYENsaXAgXCIke25hbWV9XCIgYWxyZWFkeSBkZWZpbmVkLmAsIHtcclxuICAgICAgICAgICAgICAgIGNvZGU6IENsaXBFcnJvci5hbHJlYWR5RGVmaW5lZFxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gU2UgcmVnaXN0cmEgeSBkZXZ1ZWx2ZSBlbCBjb25zdHJ1Y3RvciBkZWwgbnVldm8gY2xpcC5cclxuICAgICAgICBfY2xpcFR5cGVzLnNldChuYW1lLCBDKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBTZSBkZXZ1ZWx2ZSBlbCBjb25zdHJ1Y3RvciBkZWwgbnVldm8gY2xpcC5cclxuICAgICAgICByZXR1cm4gQztcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDcmVhIHVuYSBudWV2YSBpbnN0YW5jaWEgZGVsIHRpcG8gZGUgY2xpcCBlc3BlY2lmaWNhZG8gcG9yIG5vbWJyZS5cclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIE5vbWJyZSBkZWwgdGlwbyBkZSBjbGlwIGVzcGVjaWZpY2Fkby5cclxuICAgICAqIEBwYXJhbSB7Q2xpcE9wdGlvbnN9IFtvcHRpb25zXSBPcGNpb25lcyBkZSBjcmVhY2nDs24gZGVsIGNsaXAuXHJcbiAgICAgKiBAcmV0dXJuIHtDbGlwfSBJbnN0YW5jaWEgZGVsIGNsaXAgY3JlYWRhLlxyXG4gICAgICovXHJcbiAgICBhc3luYyBjcmVhdGUobmFtZSwgb3B0aW9ucyA9IHt9KSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiBuYW1lICE9PSBcInN0cmluZ1wiIHx8ICEobmFtZSA9IG5hbWUudHJpbSgpKSkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGNsaXAgbmFtZTogbm9uLWVtcHR5IHN0cmluZyByZXF1aXJlZC4nKVxyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgY2xpcCA9IGF3YWl0IF9nZXRDbGlwVHlwZShuYW1lKVxyXG4gICAgICAgIGlmICghY2xpcCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgQ2xpcEVycm9yKGBDbGlwIFwiJHtuYW1lfVwiIGlzIG5vdCBkZWZpbmVkLmAsIHsgY29kZTogQ2xpcEVycm9yLm5vdERlZmluZWQgfSlcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG5ldyBjbGlwKG9wdGlvbnMpXHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSW5jbHV5ZSB1biBjbGlwIG8gdW5hIHBsYW50aWxsYSBlbiBlbCBlbGVtZW50byBvIHNlbGVjdG9yIGVzcGVjaWZpY2Fkby5cclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIE5vbWJyZSBkZWwgY2xpcCBvIHBsYW50aWxsYSBlc3BlY2lmaWNhZG8uXHJcbiAgICAgKiBAcGFyYW0ge0VsZW1lbnR9IHRhcmdldCBFbGVtZW50byBlc3BlY2lmaWNhZG8uIFxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBPcGNpb25lcyBhZGljaW9uYWxlcy5cclxuICAgICAqIEBzZWUgQ2xpcCNjcmVhdGVcclxuICAgICAqIEBzZWUgQ2xpcCNpbmNsdWRlXHJcbiAgICAgKi9cclxuICAgIGFzeW5jIGluY2x1ZGUobmFtZSwgdGFyZ2V0LCBvcHRpb25zKSB7XHJcbiAgICAgICAgcmV0dXJuIChhd2FpdCB0aGlzLmNyZWF0ZShuYW1lLCBvcHRpb25zKSkuaW5jbHVkZSh0YXJnZXQsIG9wdGlvbnMpOyBcclxuICAgIH1cclxuXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb21wcnVlYmEgc2kgZWwgdGlwbyBkZWwgY2xpcCBlc3BlY2lmaWNhZG8gZXN0w6EgY2FyZ2Fkby4gU2kgbm8gZXN0w6EgcmVnaXN0cmFkbyBsbyBpbnRlbnRhIGNhcmdhci5cclxuICogXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIE5vbWJyZSBkZWwgY2xpcC5cclxuICogQHJldHVybnMge1Byb21pc2U8dHlwZW9mIENsaXA+fSBUaXBvIGRlbCBjbGlwIGNhcmdhZG8uXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBfZ2V0Q2xpcFR5cGUobmFtZSkge1xyXG4gICAgY29uc3QgdHlwZSA9IF9jbGlwVHlwZXMuZ2V0KG5hbWUpXHJcblxyXG4gICAgaWYgKHR5cGUpIHtcclxuICAgICAgICByZXR1cm4gdHlwZVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHByb21pc2UgPSBfaW1wb3J0Q2xpcChuYW1lKVxyXG5cclxuICAgIF9jbGlwVHlwZXMuc2V0KG5hbWUsIHByb21pc2UpXHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgICByZXR1cm4gYXdhaXQgcHJvbWlzZVxyXG5cclxuICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICAgIGlmIChfY2xpcFR5cGVzLmdldChuYW1lKSA9PT0gcHJvbWlzZSkge1xyXG4gICAgICAgICAgICBfY2xpcFR5cGVzLmRlbGV0ZShuYW1lKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhyb3cgZXJyXHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDYXJnYSBlbCBtYW5lamFkb3IgZGUgdW4gY2xpcCBlc3BlY2lmaWNhZG8gcG9yIG5vbWJyZS5cclxuICogXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIE5vbWJyZSBkZWwgY2xpcC5cclxuICogQHJldHVybnMge1Byb21pc2U8dHlwZW9mIENsaXA+fSBUaXBvIGRlbCBjbGlwIGNhcmdhZG8uXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBfaW1wb3J0Q2xpcChuYW1lKSB7XHJcbiAgICAvLyBUT0RPOiBJbnRyb2R1Y2lyIGFxdcOtIHBvc2libGVzIG1hcGVvcyBwYXJhIGJ1bmRsZXMuXHJcbiAgICAvKlxyXG4gICAgICAgIF9zZXR0aW5ncy5idW5kbGVzPy5mb3JFYWNoKGJ1bmRsZSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChidW5kbGUucGF0dGVybi50ZXN0KG5hbWUpKSB7XHJcbiAgICAgICAgICAgICAgICBsb2FkQnVuZGxlKGJ1bmRsZS5wYXRoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgKi9cclxuXHJcbiAgICBjb25zdCBlcnJvcnMgPSBbXVxyXG5cclxuICAgIGZvciAoY29uc3QgcGF0aCBvZiBbXHJcbiAgICAgICAgICAgIGAke19zZXR0aW5ncy5iYXNlUGF0aH0vJHtuYW1lfS5qc2AsXHJcbiAgICAgICAgICAgIGAke19zZXR0aW5ncy5iYXNlUGF0aH0vJHtuYW1lfS9pbmRleC5qc2BdKSB7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICBsZXQgcHJvdG9cclxuXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgKHsgZGVmYXVsdDogcHJvdG8gfSA9IGF3YWl0IGltcG9ydChwYXRoKSlcclxuICAgICAgICB9IGNhdGNoIChjYXVzZSkge1xyXG4gICAgICAgICAgICBlcnJvcnMucHVzaChuZXcgQ2xpcEVycm9yKGBGYWlsZWQgdG8gaW1wb3J0IGNsaXAgXCIke25hbWV9XCIgZnJvbSBcIiR7cGF0aH1cIi5gLCB7XHJcbiAgICAgICAgICAgICAgICBjb2RlOiBDbGlwRXJyb3IubG9hZEZhaWxlZCxcclxuICAgICAgICAgICAgICAgIGNhdXNlXHJcbiAgICAgICAgICAgIH0pKVxyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gU2kgbGEgZGVmaW5pY2nDs24gY2FyZ2FkYSBubyBlcyB2w6FsaWRhLCBubyBzZSBpbnRlbnRhIGxhIHNpZ3VpZW50ZSBydXRhLlxyXG4gICAgICAgIGlmIChwcm90byA9PT0gbnVsbCB8fCB0eXBlb2YgcHJvdG8gIT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBDbGlwRXJyb3IoYEludmFsaWQgY2xpcCBcIiR7bmFtZX1cIiBpbiBcIiR7cGF0aH1cIjogZGVmYXVsdCBleHBvcnQgbXVzdCBiZSBhbiBvYmplY3QuYCwge1xyXG4gICAgICAgICAgICAgICAgY29kZTogQ2xpcEVycm9yLmxvYWRGYWlsZWRcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFNlIHJlZ2lzdHJhIHkgZGV2dWVsdmUgZWwgdGlwbyBjYXJnYWRvLlxyXG4gICAgICAgIHJldHVybiBjbGlwcy5kZWZpbmUobmFtZSwgcHJvdG8pXHJcbiAgICB9XHJcblxyXG4gICAgdGhyb3cgbmV3IENsaXBFcnJvcihgQWxsIGltcG9ydCBhdHRlbXB0cyBmb3IgY2xpcCBcIiR7bmFtZX1cIiBmYWlsZWQuYCwge1xyXG4gICAgICAgIGNvZGU6IENsaXBFcnJvci5sb2FkRmFpbGVkLFxyXG4gICAgICAgIGNhdXNlOiBlcnJvcnNcclxuICAgIH0pXHJcbn1cclxuXHJcblxyXG4vKipcclxuICogSW1wb3J0cyBzdHlsZXMgZm9yIHRoZSBzcGVjaWZpZWQgY2xpcC5cclxuICpcclxuICogQHByaXZhdGVcclxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgQ2xpcCBuYW1lLlxyXG4gKiBAcGFyYW0ge3N0cmluZ3xGdW5jdGlvbnxIVE1MU3R5bGVFbGVtZW50fENTU1N0eWxlU2hlZXR9IFtzdHlsZXNdXHJcbiAqIFN0eWxlcyBvciBhIHN5bmNocm9ub3VzIG9yIGFzeW5jaHJvbm91cyBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGhlbS5cclxuICogSWYgb21pdHRlZCBvciB1bmRlZmluZWQsIGF0dGVtcHRzIHRvIGxvYWQgdGhlIGRlZmF1bHQgc3R5bGVzaGVldCB1bmxlc3Mgc3R5bGVzIGFyZSBidW5kbGVkLlxyXG4gKiBAcmV0dXJucyB7UHJvbWlzZTx2b2lkPn0gUmVzb2x2ZXMgd2hlbiBzdHlsZSBsb2FkaW5nIGFuZCBpbnNlcnRpb24gYXJlIGNvbXBsZXRlLlxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gX2ltcG9ydENsaXBTdHlsZXMobmFtZSwgc3R5bGVzKSB7XHJcbiAgICAvLyBMb3MgZXN0aWxvcyBzZSBwdWVkZW4gZGVmaW5pciBjb21vIHByb3BpZWRhZCBvIGNvbW8gZnVuY2nDs24uXHJcbiAgICBpZiAodHlwZW9mIHN0eWxlcyA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgIHN0eWxlcyA9IGF3YWl0IHN0eWxlcygpXHJcbiAgICB9XHJcbiAgICAvLyBTaSBzZSBkZWZpbmVuIGNvbW8gSFRNTFN0eWxlRWxlbWVudCwgc2UgYcOxYWRlbiBkaXJlY3RhbWVudGUgYWwgaGVhZC5cclxuICAgIGlmIChzdHlsZXMgaW5zdGFuY2VvZiBIVE1MU3R5bGVFbGVtZW50KSB7XHJcbiAgICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzdHlsZXMpXHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICB9XHJcbiAgICAvLyBTaSBzZSBkZWZpbmVuIGNvbW8gQ1NTU3R5bGVTaGVldCwgc2UgYcOxYWRlbiBhIGxhcyBob2phcyBkZSBlc3RpbG8gYWRvcHRhZGFzLlxyXG4gICAgaWYgKHN0eWxlcyBpbnN0YW5jZW9mIENTU1N0eWxlU2hlZXQpIHtcclxuICAgICAgICBpZiAoIWRvY3VtZW50LmFkb3B0ZWRTdHlsZVNoZWV0cy5pbmNsdWRlcyhzdHlsZXMpKSB7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LmFkb3B0ZWRTdHlsZVNoZWV0cyA9IFsuLi5kb2N1bWVudC5hZG9wdGVkU3R5bGVTaGVldHMsIHN0eWxlc11cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgLy8gU2kgZWwgY2xpcCBubyBkZWZpbmUgZXN0aWxvcyBlbiBjw7NkaWdvIHkgbm8gZXN0w6FuIGVtcGFxdWV0YWRvcywgc2UgaW50ZW50YSBjYXJnYXIgbGEgaG9qYSBkZSBlc3RpbG9zIHBvciBkZWZlY3RvIFxyXG4gICAgLy8gdWJpY2FkYSBlbiBsYSBtaXNtYSB1YmljYWNpw7NuIHF1ZSBlbCBjbGlwLlxyXG4gICAgaWYgKHN0eWxlcyA9PSBudWxsICYmICFfc2V0dGluZ3Muc3R5bGVzQnVuZGxlZCkge1xyXG4gICAgICAgIC8vIFRPRE86IE3DoXMgcXVlIHVuIGZsYWcgcXVlIG5vcyBpbmRpcXVlIHNpIGxvcyBlc3RpbG9zIGVzdMOhbiBlbXBhcXVldGFkb3MgbyBubywgbG8gcXVlIHJlYWxtZW50ZSBuZWNlc2l0YW1vcyBlcyBcclxuICAgICAgICAvLyB1bmEgZGVmaW5pY2nDs24gZGUgYnVuZGxlcyBjb24gbGEgZXNwZWNpZmljYWNpw7NuIGRlIG5vbWJyZXMgbyBwYXRyb25lcyBkZSBjbGlwcyBpbmNsdWlkb3MgZW4gY2FkYSBidW5kbGUsIGRlIFxyXG4gICAgICAgIC8vIGZvcm1hIHF1ZSBwb2RhbW9zIGludHJvZHVjaXIgYXF1w60gbGEgbMOzZ2ljYSBkZSBjYXJnYSBhZGVjdWFkYS5cclxuICAgICAgICBjb25zdCBwYXRoID0gYCR7X3NldHRpbmdzLmJhc2VQYXRofS8ke25hbWV9LyR7Q2xpcC5kZWZhdWx0U3R5bGVzTmFtZX0uY3NzYFxyXG5cclxuICAgICAgICBsZXQgcmVzXHJcblxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHJlcyA9IGF3YWl0IGZldGNoKHBhdGgpXHJcblxyXG4gICAgICAgICAgICBpZiAocmVzLm9rKSB7XHJcbiAgICAgICAgICAgICAgICBzdHlsZXMgPSBhd2FpdCByZXMudGV4dCgpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IENsaXBFcnJvcihgRmFpbGVkIHRvIGZldGNoIHN0eWxlcyBmb3IgY2xpcCBcIiR7bmFtZX1cIiBmcm9tIFwiJHtwYXRofVwiOiAke2Vyci5tZXNzYWdlfWAsIHtcclxuICAgICAgICAgICAgICAgIGNvZGU6IENsaXBFcnJvci5sb2FkRmFpbGVkLFxyXG4gICAgICAgICAgICAgICAgY2F1c2U6IGVyclxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFyZXMub2spIHtcclxuICAgICAgICAgICAgaWYgKHJlcy5zdGF0dXMgIT09IDQwNCAmJiByZXMuc3RhdHVzICE9PSA0MTApIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBDbGlwRXJyb3IoYEZhaWxlZCB0byBsb2FkIHN0eWxlcyBmb3IgY2xpcCBcIiR7bmFtZX1cIiBmcm9tIFwiJHtwYXRofVwiOiAke3Jlcy5zdGF0dXNUZXh0fSAoJHtyZXMuc3RhdHVzfSlgLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29kZTogQ2xpcEVycm9yLmxvYWRGYWlsZWRcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChfc2V0dGluZ3MuZGVidWcpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgTm8gc3R5bGVzIGZvdW5kIGZvciBjbGlwIFwiJHtuYW1lfVwiIGF0IFwiJHtwYXRofVwiLmApXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgfVxyXG5cclxuICAgIGlmIChzdHlsZXMgPT0gbnVsbCkge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGlmICh0eXBlb2Ygc3R5bGVzICE9PSAnc3RyaW5nJykge1xyXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYEludmFsaWQgc3R5bGVzIGZvciBjbGlwIFwiJHtuYW1lfVwiOiBzdHJpbmcsIEhUTUxTdHlsZUVsZW1lbnQgb3IgQ1NTU3R5bGVTaGVldCByZXF1aXJlZC5gKVxyXG4gICAgfVxyXG5cclxuICAgIHN0eWxlcyA9IHN0eWxlcy50cmltKClcclxuXHJcbiAgICBpZiAoIXN0eWxlcykge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGlmICghX3N0eWxlRWxlbWVudCkge1xyXG4gICAgICAgIF9zdHlsZUVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xyXG4gICAgICAgIF9zdHlsZUVsZW1lbnQuaWQgPSAnY2xpcHMtc3R5bGVzJztcclxuICAgICAgICBfc3R5bGVFbGVtZW50LnNldEF0dHJpYnV0ZSgnZGF0YS1zb3VyY2UnLCAnY2xpcHMnKTtcclxuICAgICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKF9zdHlsZUVsZW1lbnQpO1xyXG4gICAgfVxyXG5cclxuICAgIF9zdHlsZUVsZW1lbnQudGV4dENvbnRlbnQgKz0gYFxcbi8qICR7bmFtZX0gKi9cXG4ke3N0eWxlc31cXG5gO1xyXG59XHJcblxyXG4vLyBHbG9iYWwgc2NvcGVcclxuaWYgKHdpbmRvdykge1xyXG4gICAgd2luZG93LmNsaXBzID0gY2xpcHNcclxufVxyXG5cclxuLy8gRXhwb3J0c1xyXG5leHBvcnQgZGVmYXVsdCBjbGlwcyIsImltcG9ydCBjbGlwcyBmcm9tICcuLi9jbGlwcy5qcyc7XHJcblxyXG5cclxuLyoqXHJcbiAqIFRpcG8gZGUgY2xpcCBiYXNlIHBhcmEgbGEgZGVmaW5pY2nDs24gZGUgdmlzdGFzIHF1ZSBzZSBwdWVkZW4gYWJyaXIgZGVudHJvIGRlIHVuIHZpZXdwb3J0LlxyXG4gKiBAY2xhc3MgVmlld0NsaXBcclxuICovXHJcbmNsaXBzLmRlZmluZSgndmlldycsIHtcclxuXHJcbiAgICAvKiogQHNlZSBDbGlwI2NyZWF0ZSAqL1xyXG4gICAgY3JlYXRlKG9wdGlvbnMpIHtcclxuICAgICAgICAvLyAuLi5cclxuICAgIH0sXHJcblxyXG4gICAgLyoqIEB0eXBlIHtzdHJpbmd9ICovXHJcbiAgICBzdHlsZXM6IC8qY3NzKi9gXHJcbiAgICAgICAgLnZpZXcge1xyXG4gICAgICAgICAgICBkaXNwbGF5OiBibG9jaztcclxuICAgICAgICAgICAgcG9zaXRpb246IGFic29sdXRlO1xyXG4gICAgICAgICAgICB0b3A6IDA7XHJcbiAgICAgICAgICAgIGxlZnQ6IDA7XHJcbiAgICAgICAgICAgIHdpZHRoOiAxMDAlO1xyXG4gICAgICAgICAgICBoZWlnaHQ6IDEwMCU7XHJcbiAgICAgICAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgICAgICAgXHJcbiAgICAgICAgfVxyXG4gICAgYFxyXG5cclxufSk7XHJcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxNQUFNLFlBQVksR0FBRztBQUNyQixJQUFJLEdBQUcsRUFBRSxPQUFPO0FBQ2hCLElBQUksR0FBRyxFQUFFLE1BQU07QUFDZixJQUFJLEdBQUcsRUFBRSxNQUFNO0FBQ2YsSUFBSSxHQUFHLEVBQUUsUUFBUTtBQUNqQixJQUFJLEdBQUcsRUFBRSxPQUFPO0FBQ2hCLENBQUMsQ0FBQztBQUNGO0FBQ0EsYUFBZTtBQUNmO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElB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
