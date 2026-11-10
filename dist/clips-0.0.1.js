var clips = (function () {
    'use strict';

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

    return clips;

})();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpcHMtMC4wLjEuanMiLCJzb3VyY2VzIjpbIi4uL3V0aWwvZXNjYXBlLmpzIiwiLi4vY2xpcHMuanMiXSwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgSFRNTF9FU0NBUEVTID0ge1xyXG4gICAgJyYnOiAnJmFtcDsnLFxyXG4gICAgJzwnOiAnJmx0OycsXHJcbiAgICAnPic6ICcmZ3Q7JyxcclxuICAgICdcIic6ICcmcXVvdDsnLFxyXG4gICAgXCInXCI6ICcmIzM5OydcclxufTtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEVzY2FwYSBsb3MgY2FyYWN0ZXJlcyBlc3BlY2lhbGVzIGVuIEhUTUwuXHJcbiAgICAgKiBAcGFyYW0geyp9IHggVmFsb3IgZXNwZWNpZmljYWRvLiBcclxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IENhZGVuYSBlc2NhcGFkYS5cclxuICAgICAqL1xyXG4gICAgaHRtbDogKHgpID0+IFN0cmluZyh4KS5yZXBsYWNlKC9bJjw+XCInXS9nLCAoY2gpID0+IEhUTUxfRVNDQVBFU1tjaF0pLFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogRXNjYXBhIGxvcyBjYXJhY3RlcmVzIGVzcGVjaWFsZXMgZW4gbGl0ZXJhbGVzIGRlIHBsYW50aWxsYS5cclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzdHIgQ2FkZW5hIGVzcGVjaWZpY2FkYS4gXHJcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBDYWRlbmEgZXNjYXBhZGEuXHJcbiAgICAgKi9cclxuICAgIGxpdGVyYWw6IChzdHIpID0+IHN0clxyXG4gICAgICAgIC5yZXBsYWNlKC9cXFxcL2csIFwiXFxcXFxcXFxcIilcclxuICAgICAgICAucmVwbGFjZSgvYC9nLCBcIlxcXFxgXCIpXHJcbiAgICAgICAgLnJlcGxhY2UoL1xcJFxcey9nLCBcIlxcXFwke1wiKVxyXG4gICAgICAgIC5yZXBsYWNlKC9cXHIvZywgXCJcXFxcclwiKVxyXG5cclxufTsiLCIvLyBjbGlwcy5qc1xyXG5cclxuLy8gaW1wb3J0IGVqcyBmcm9tICcuL3V0aWwvZWpzLmpzJ1xyXG5pbXBvcnQgZXNjYXBlIGZyb20gJy4vdXRpbC9lc2NhcGUuanMnXHJcblxyXG4vKipcclxuICogUHJlZmlqbyBwYXJhIGVzcGVjaWZpY2FyIHJlZmVyZW5jaWFzIGEgY2xpcHMgZW4gaW5jbHVzaW9uZXMuXHJcbiAqIFxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAdHlwZSB7c3RyaW5nfVxyXG4gKi9cclxuY29uc3QgX2NsaXBQcmVmaXggPSAnY2xpcDonO1xyXG5cclxuLyoqXHJcbiAqIEV4cHJlc2nDs24gcGFyYSB2ZXJpZmljYXIgc2kgdW5hIGNhZGVuYSBzb2xvIGNvbnRpZW5lIGVzcGFjaW9zLlxyXG4gKiBcclxuICogQHByaXZhdGVcclxuICogQHR5cGUge1JlZ0V4cH1cclxuICovXHJcbi8vIGNvbnN0IF93aGl0ZXNwYWNlUmVnZXhwID0gL15cXHMqJC87XHJcblxyXG4vKipcclxuICogTWFwcyByb290IGVsZW1lbnRzIHRvIGNsaXBzLlxyXG4gKiBcclxuICogQHByaXZhdGVcclxuICogQHR5cGUge1dlYWtNYXA8SFRNTEVsZW1lbnQsIENsaXA+fVxyXG4gKi9cclxuY29uc3QgX3Jvb3RzID0gbmV3IFdlYWtNYXAoKVxyXG5cclxuLyoqXHJcbiAqIFN0b3JlcyBwcml2YXRlIHN0YXRlIGZvciBjbGlwcy5cclxuICogXHJcbiAqIEBwcml2YXRlXHJcbiAqIEB0eXBlIHtXZWFrTWFwPENsaXAsIHtcclxuICogICAgIHJvb3Q6IEhUTUxFbGVtZW50fG51bGwsXHJcbiAqICAgICBsaXN0ZW5lcnM6IE1hcCxcclxuICogICAgIGxvYWRTdGFydGVkOiBmYWxzZSxcclxuICogICAgIGxvYWRUaW1lOiAwIFxyXG4gKiB9Pn1cclxuICovXHJcbmNvbnN0IF9zdGF0ZXMgPSBuZXcgV2Vha01hcCgpXHJcblxyXG4vKipcclxuICogU2hhcmVkIHN0eWxlIGVsZW1lbnQgY29udGFpbmluZyB0aGUgc3R5bGVzIG9mIHJlZ2lzdGVyZWQgY2xpcHMuXHJcbiAqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEB0eXBlIHtIVE1MU3R5bGVFbGVtZW50fHVuZGVmaW5lZH1cclxuICovXHJcbmxldCBfc3R5bGVFbGVtZW50XHJcblxyXG5cclxuLyoqXHJcbiAqIEJhc2UgY2xhc3MgZm9yIGNsaXBzLlxyXG4gKi9cclxuY2xhc3MgQ2xpcCB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBdmFpbGFibGUgaW5jbHVzaW9uIHBvc2l0aW9ucy5cclxuICAgICAqXHJcbiAgICAgKiBAZW51bSB7c3RyaW5nfVxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgUG9zaXRpb24gPSBPYmplY3QuZnJlZXplKHtcclxuICAgICAgICBzdGFydDogJ3N0YXJ0JyxcclxuICAgICAgICBlbmQ6ICdlbmQnLFxyXG4gICAgICAgIGJlZm9yZTogJ2JlZm9yZScsXHJcbiAgICAgICAgYWZ0ZXI6ICdhZnRlcicsXHJcbiAgICAgICAgcmVwbGFjZTogJ3JlcGxhY2UnXHJcbiAgICB9KVxyXG4gICAgXHJcbiAgICAvKipcclxuICAgICAqIENyZWF0ZXMgYSBDbGlwIGluc3RhbmNlLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucz17fV0gQ3JlYXRpb24gb3B0aW9ucy5cclxuICAgICAqL1xyXG4gICAgY29uc3RydWN0b3Iob3B0aW9ucyA9IHt9KSB7XHJcbiAgICAgICAgX3N0YXRlcy5zZXQodGhpcywge1xyXG4gICAgICAgICAgICByb290OiBudWxsLFxyXG4gICAgICAgICAgICBsaXN0ZW5lcnM6IG5ldyBNYXAoKSxcclxuICAgICAgICAgICAgbG9hZFN0YXJ0ZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICBsb2FkVGltZTogMFxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIHRoaXMuY3JlYXRlKG9wdGlvbnMpXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDbGlwIHJvb3QgZWxlbWVudC5cclxuICAgICAqXHJcbiAgICAgKiBAdHlwZSB7RWxlbWVudHxudWxsfVxyXG4gICAgICogQHJlYWRvbmx5XHJcbiAgICAgKi9cclxuICAgIGdldCByb290KCkge1xyXG4gICAgICAgIHJldHVybiBfc3RhdGVzLmdldCh0aGlzKS5yb290XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDbGlwIHR5cGUgbmFtZS5cclxuICAgICAqXHJcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxyXG4gICAgICogQHJlYWRvbmx5XHJcbiAgICAgKi9cclxuICAgIGdldCBjbGlwTmFtZSgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDbG9zZXN0IGFuY2VzdG9yIGNsaXAuXHJcbiAgICAgKlxyXG4gICAgICogQHR5cGUge0NsaXB8bnVsbH1cclxuICAgICAqIEByZWFkb25seVxyXG4gICAgICovXHJcbiAgICBnZXQgcGFyZW50Q2xpcCgpIHtcclxuICAgICAgICBmb3IgKGxldCBlbGVtZW50ID0gdGhpcy5yb290Py5wYXJlbnRFbGVtZW50OyBlbGVtZW50OyBlbGVtZW50ID0gZWxlbWVudC5wYXJlbnRFbGVtZW50KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNsaXAgPSBfcm9vdHMuZ2V0KGVsZW1lbnQpXHJcblxyXG4gICAgICAgICAgICBpZiAoY2xpcCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNsaXBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG51bGxcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEltbWVkaWF0ZSBjaGlsZCBjbGlwcywgZXhjbHVkaW5nIHRoZWlyIGRlc2NlbmRhbnRzLlxyXG4gICAgICpcclxuICAgICAqIEB0eXBlIHtDbGlwW119XHJcbiAgICAgKiBAcmVhZG9ubHlcclxuICAgICAqL1xyXG4gICAgZ2V0IGNoaWxkQ2xpcHMoKSB7XHJcbiAgICAgICAgY29uc3QgY2xpcHMgPSBbXVxyXG5cclxuICAgICAgICBjb25zdCBjb2xsZWN0ID0gZWxlbWVudCA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNsaXAgPSBfcm9vdHMuZ2V0KGVsZW1lbnQpXHJcblxyXG4gICAgICAgICAgICBpZiAoY2xpcCkge1xyXG4gICAgICAgICAgICAgICAgY2xpcHMucHVzaChjbGlwKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgZWxlbWVudC5jaGlsZHJlbikge1xyXG4gICAgICAgICAgICAgICAgY29sbGVjdChjaGlsZClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qgcm9vdCA9IHRoaXMucm9vdFxyXG5cclxuICAgICAgICBpZiAocm9vdCkge1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIHJvb3QuY2hpbGRyZW4pIHtcclxuICAgICAgICAgICAgICAgIGNvbGxlY3QoY2hpbGQpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBjbGlwc1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogTnVtYmVyIG9mIGltbWVkaWF0ZSBjaGlsZCBjbGlwcy5cclxuICAgICAqXHJcbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxyXG4gICAgICogQHJlYWRvbmx5XHJcbiAgICAgKi9cclxuICAgIGdldCBjaGlsZENvdW50KCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmNoaWxkQ2xpcHMubGVuZ3RoXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUaW1lc3RhbXAgb2YgdGhlIGxhc3Qgc3VjY2Vzc2Z1bCBkYXRhIGxvYWQsIG9yIHplcm8gaWYgbm9uZSBoYXMgY29tcGxldGVkLlxyXG4gICAgICpcclxuICAgICAqIEB0eXBlIHtudW1iZXJ9XHJcbiAgICAgKiBAcmVhZG9ubHlcclxuICAgICAqL1xyXG4gICAgZ2V0IGxvYWRUaW1lKCkge1xyXG4gICAgICAgIHJldHVybiBfc3RhdGVzLmdldCh0aGlzKS5sb2FkVGltZVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGNsaXAgaW5zdGFuY2UuIENhbGxlZCBieSB0aGUgY29uc3RydWN0b3IuXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIENyZWF0aW9uIG9wdGlvbnMuXHJcbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cclxuICAgICAqL1xyXG4gICAgY3JlYXRlKG9wdGlvbnMpIHt9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBJbmNsdWRlcyB0aGUgY2xpcCByZWxhdGl2ZSB0byB0aGUgc3BlY2lmaWVkIHRhcmdldCBlbGVtZW50LlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7RWxlbWVudH0gdGFyZ2V0IFRhcmdldCBlbGVtZW50LlxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zPXt9XSBBZGRpdGlvbmFsIG9wdGlvbnMuXHJcbiAgICAgKiBAcGFyYW0ge0NsaXAuUG9zaXRpb259IFtvcHRpb25zLnBvc2l0aW9uPUNsaXAuUG9zaXRpb24uZW5kXSBQb3NpdGlvbiByZWxhdGl2ZSB0byB0aGUgdGFyZ2V0IGVsZW1lbnQuXHJcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZTxDbGlwPn0gUmVzb2x2ZXMgdG8gdGhpcyBjbGlwIGFmdGVyIHJlYWR5KCkgY29tcGxldGVzLlxyXG4gICAgICovXHJcbiAgICBhc3luYyBpbmNsdWRlKHRhcmdldCwgb3B0aW9ucyA9IHt9KSB7XHJcbiAgICAgICAgb3B0aW9ucyA9IHsgLi4ub3B0aW9ucyB9XHJcblxyXG4gICAgICAgIGNvbnN0IHN0YXRlID0gX3N0YXRlcy5nZXQodGhpcyk7XHJcbiAgICAgICAgY29uc3QgcHJldmlvdXMgPSBzdGF0ZS5pbmNsdWRlUHJvbWlzZSA/PyBQcm9taXNlLnJlc29sdmUoKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGF3YWl0IChzdGF0ZS5pbmNsdWRlUHJvbWlzZSA9IHByZXZpb3VzLmNhdGNoKCgpID0+IHt9KS50aGVuKCgpID0+IFxyXG4gICAgICAgICAgICBfaW5jbHVkZS5jYWxsKHRoaXMsIHRhcmdldCwgb3B0aW9ucykpKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFJlbmRlcnMgdGhlIGNsaXAuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtSZW5kZXJDb250ZXh0fSBjdHggUmVuZGVyaW5nIGNvbnRleHQuXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIEFkZGl0aW9uYWwgcmVuZGVyaW5nIG9wdGlvbnMuXHJcbiAgICAgKiBAcmV0dXJucyB7RG9jdW1lbnRGcmFnbWVudHxFbGVtZW50fHN0cmluZ3xQcm9taXNlPERvY3VtZW50RnJhZ21lbnR8RWxlbWVudHxzdHJpbmc+fSBSZW5kZXJlZCBjb250ZW50LlxyXG4gICAgICovXHJcbiAgICBhc3luYyByZW5kZXIoY3R4LCBvcHRpb25zKSB7XHJcbiAgICAgICAgLy8gVE9ETzogQ3JlbyBxdWUgbGEgaW1wbGVtZW50YWNpw7NuIHBvciBkZWZlY3RvIGRlYmVyw61hIGludGVudGFyIHJlbmRlcml6YXIgbGEgcGxhbnRpbGxhIHBvciBkZWZlY3RvLlxyXG4gICAgICAgIHJldHVybiAvKmh0bWwqL2A8ZGl2IGRhdGEtY2xpcD1cIiR7dGhpcy5jbGlwTmFtZX1cIj48L2Rpdj5gXHJcbiAgICAgICAgLy8gcmV0dXJuIF9yZW5kZXJUZW1wbGF0ZSh0aGlzKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGdlbmVyYXRlZCBjb250ZW50IGFuZCBhZGRzIHRoZSBuZWNlc3NhcnkgZXZlbnQgbGlzdGVuZXJzLiBDYWxsZWQgb24gZXZlcnkgaW5jbHVzaW9uLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gQWRkaXRpb25hbCBvcHRpb25zLlxyXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5mcmVzaD1mYWxzZV0gV2hldGhlciB0aGUgcm9vdCBlbGVtZW50IHdhcyBuZXdseSBjcmVhdGVkLlxyXG4gICAgICogQHJldHVybnMge3ZvaWR8UHJvbWlzZTx2b2lkPn1cclxuICAgICAqL1xyXG4gICAgcmVhZHkob3B0aW9ucykge31cclxuXHJcbiAgICAvKipcclxuICAgICAqIExvYWRzIGFkZGl0aW9uYWwgZGF0YS5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBBZGRpdGlvbmFsIG9wdGlvbnMuXHJcbiAgICAgKiBAcmV0dXJucyB7KnxQcm9taXNlPCo+fSBEYXRhIHBhc3NlZCB0byB1cGRhdGUoKS5cclxuICAgICAqL1xyXG4gICAgYXN5bmMgbG9hZChvcHRpb25zKSB7fVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogVXBkYXRlcyB0aGUgY2xpcCBjb250ZW50IGFmdGVyIGxvYWRpbmcgYWRkaXRpb25hbCBkYXRhLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIEFkZGl0aW9uYWwgb3B0aW9ucy5cclxuICAgICAqIEBwYXJhbSB7Kn0gb3B0aW9ucy5kYXRhIExvYWRlZCBkYXRhLlxyXG4gICAgICogQHJldHVybnMge3ZvaWR8UHJvbWlzZTx2b2lkPn1cclxuICAgICAqL1xyXG4gICAgYXN5bmMgdXBkYXRlKG9wdGlvbnMpIHt9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBJbml0aWF0ZXMgdGhlIHJlbG9hZCBvZiB0aGUgY2xpcC5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBBZGRpdGlvbmFsIG9wdGlvbnMuXHJcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZTx2b2lkPn1cclxuICAgICAqL1xyXG4gICAgYXN5bmMgcmVsb2FkKG9wdGlvbnMpIHtcclxuICAgICAgICAvLyAuLi5cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENsZWFycyB0aGUgY2xpcCBjb250ZW50IHNvIGl0IGNhbiBiZSByZW5kZXJlZCBhZ2Fpbi5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBBZGRpdGlvbmFsIG9wdGlvbnMuXHJcbiAgICAgKi9cclxuICAgIGNsZWFyKG9wdGlvbnMpIHtcclxuICAgICAgICAvLyAuLi5cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFNob3dzIG9yIGhpZGVzIHRoZSBjbGlwLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW3Nob3ddIFdoZXRoZXIgdG8gc2hvdyB0aGUgY2xpcC4gSWYgb21pdHRlZCwgdG9nZ2xlcyBpdHMgdmlzaWJpbGl0eS5cclxuICAgICAqL1xyXG4gICAgdG9nZ2xlKHNob3cpIHtcclxuICAgICAgICAvLyAuLi5cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENoZWNrcyB3aGV0aGVyIHRoZSBjbGlwIGlzIHZpc2libGUuXHJcbiAgICAgKlxyXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFdoZXRoZXIgdGhlIGNsaXAgaXMgdmlzaWJsZS5cclxuICAgICAqL1xyXG4gICAgaXNWaXNpYmxlKCkge1xyXG4gICAgICAgIC8vIC4uLlxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmVtb3ZlcyB0aGUgY2xpcCBmcm9tIHRoZSBET00uXHJcbiAgICAgKi9cclxuICAgIHJlbW92ZSgpIHtcclxuICAgICAgICAvLyAuLi5cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIERlc3Ryb3lzIHRoZSBjbGlwIGFuZCByZWxlYXNlcyBpdHMgcmVzb3VyY2VzLlxyXG4gICAgICovXHJcbiAgICBkZXN0cm95KCkge1xyXG4gICAgICAgIC8vIC4uLlxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmVnaXN0ZXJzIGFuIGV2ZW50IGxpc3RlbmVyLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIEV2ZW50IHR5cGUuXHJcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9uKENsaXBFdmVudCk6IHZvaWR9IGxpc3RlbmVyIEV2ZW50IGxpc3RlbmVyLlxyXG4gICAgICogQHJldHVybnMge0NsaXB9IFRoaXMgY2xpcC5cclxuICAgICAqL1xyXG4gICAgb24odHlwZSwgbGlzdGVuZXIpIHtcclxuICAgICAgICBpZiAodHlwZW9mIHR5cGUgIT09ICdzdHJpbmcnIHx8IHR5cGUubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgZXZlbnQgdHlwZTogYSBub24tZW1wdHkgc3RyaW5nIGlzIHJlcXVpcmVkLicpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgZXZlbnQgbGlzdGVuZXI6IGEgZnVuY3Rpb24gaXMgcmVxdWlyZWQuJylcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHN0YXRlID0gX3N0YXRlcy5nZXQodGhpcylcclxuXHJcbiAgICAgICAgbGV0IGxpc3RlbmVycyA9IHN0YXRlLmxpc3RlbmVycy5nZXQodHlwZSlcclxuXHJcbiAgICAgICAgaWYgKCFsaXN0ZW5lcnMpIHtcclxuICAgICAgICAgICAgc3RhdGUubGlzdGVuZXJzLnNldCh0eXBlLCBsaXN0ZW5lcnMgPSBuZXcgU2V0KCkpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsaXN0ZW5lcnMuYWRkKGxpc3RlbmVyKVxyXG5cclxuICAgICAgICByZXR1cm4gdGhpc1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmVtb3ZlcyBhbiBldmVudCBsaXN0ZW5lci5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZSBFdmVudCB0eXBlLlxyXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbihDbGlwRXZlbnQpOiB2b2lkfSBsaXN0ZW5lciBFdmVudCBsaXN0ZW5lci5cclxuICAgICAqIEByZXR1cm5zIHtDbGlwfSBUaGlzIGNsaXAuXHJcbiAgICAgKi9cclxuICAgIG9mZih0eXBlLCBsaXN0ZW5lcikge1xyXG4gICAgICAgIGlmICh0eXBlb2YgdHlwZSAhPT0gJ3N0cmluZycgfHwgdHlwZS5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBldmVudCB0eXBlOiBhIG5vbi1lbXB0eSBzdHJpbmcgaXMgcmVxdWlyZWQuJylcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBldmVudCBsaXN0ZW5lcjogYSBmdW5jdGlvbiBpcyByZXF1aXJlZC4nKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qgc3RhdGUgPSBfc3RhdGVzLmdldCh0aGlzKVxyXG4gICAgICAgIGNvbnN0IGxpc3RlbmVycyA9IHN0YXRlLmxpc3RlbmVycy5nZXQodHlwZSlcclxuXHJcbiAgICAgICAgaWYgKGxpc3RlbmVycykge1xyXG4gICAgICAgICAgICBsaXN0ZW5lcnMuZGVsZXRlKGxpc3RlbmVyKVxyXG5cclxuICAgICAgICAgICAgaWYgKGxpc3RlbmVycy5zaXplID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBzdGF0ZS5saXN0ZW5lcnMuZGVsZXRlKHR5cGUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBGaXJlcyBhbiBldmVudCBzeW5jaHJvbm91c2x5LlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfENsaXBFdmVudHx7dHlwZTogc3RyaW5nLCBkZXRhaWw/OiAqfX0gZXZlbnQgRXZlbnQgdG8gZmlyZS5cclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucz17fV0gRGlzcGF0Y2ggb3B0aW9ucy5cclxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbnwncG9zdCd9IFtvcHRpb25zLnNwcmVhZD1mYWxzZV1cclxuICAgICAqIFdoZXRoZXIgdG8gcHJvcGFnYXRlIHRvIGRlc2NlbmRhbnRzOiB0cnVlIGZvciBwcmVvcmRlciwgJ3Bvc3QnIGZvciBwb3N0b3JkZXIuXHJcbiAgICAgKiBAcmV0dXJucyB7Q2xpcH0gVGhpcyBjbGlwLlxyXG4gICAgICovXHJcbiAgICBmaXJlKGV2ZW50LCB7IHNwcmVhZCA9IGZhbHNlIH0gPSB7fSkge1xyXG4gICAgICAgIC8vIFNlIG5vcm1hbGl6YSBlbCBldmVudG8uXHJcbiAgICAgICAgaWYgKCEoZXZlbnQgaW5zdGFuY2VvZiBDbGlwRXZlbnQpKSB7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgZXZlbnQgPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgICAgICAgICBldmVudCA9IG5ldyBDbGlwRXZlbnQoZXZlbnQpXHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGV2ZW50ID09PSAnb2JqZWN0JyAmJiBldmVudCAhPT0gbnVsbCAmJiB0eXBlb2YgZXZlbnQudHlwZSA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgICAgIGV2ZW50ID0gbmV3IENsaXBFdmVudChldmVudC50eXBlLCBldmVudC5kZXRhaWwpXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxyXG4gICAgICAgICAgICAgICAgICAgICdJbnZhbGlkIGV2ZW50OiBleHBlY3RlZCBhIHR5cGUgc3RyaW5nLCBhIENsaXBFdmVudCwgb3IgYW4gb2JqZWN0IHdpdGggYSBzdHJpbmcgXCJ0eXBlXCIgcHJvcGVydHkuJ1xyXG4gICAgICAgICAgICAgICAgKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBTZSB2YWxpZGFuIGxhcyBvcGNpb25lcyBhZGljaW9uYWxlcy5cclxuICAgICAgICBpZiAoc3ByZWFkICE9PSBmYWxzZSAmJiBzcHJlYWQgIT09IHRydWUgJiYgc3ByZWFkICE9PSAncG9zdCcpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBldmVudCBzcHJlYWQ6IGV4cGVjdGVkIGZhbHNlLCB0cnVlLCBvciBcInBvc3RcIi4nKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZXZlbnRTdGF0ZSA9IF9ldmVudFN0YXRlcy5nZXQoZXZlbnQpXHJcblxyXG4gICAgICAgIC8vIFNlIGltcGlkZSBlbWl0aXIgbGEgbWlzbWEgaW5zdGFuY2lhIGRlbCBldmVudG8gbWllbnRyYXMgc2UgZXN0w6EgcHJvY2VzYW5kby5cclxuICAgICAgICBpZiAoZXZlbnRTdGF0ZS50YXJnZXQgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IENsaXBFcnJvcignVGhlIGV2ZW50IGlzIGFscmVhZHkgYmVpbmcgZGlzcGF0Y2hlZC4nKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZGlzcGF0Y2ggPSBjbGlwID0+IHtcclxuICAgICAgICAgICAgLy8gU2UgcHJvcGFnYSBlbiBwb3N0b3JkZW4uXHJcbiAgICAgICAgICAgIGlmIChzcHJlYWQgPT09ICdwb3N0Jykge1xyXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBjbGlwLmNoaWxkQ2xpcHMpIHtcclxuICAgICAgICAgICAgICAgICAgICBkaXNwYXRjaChjaGlsZClcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gU2UgZWplY3V0YW4gbG9zIGxpc3RlbmVycyBkZSBlc3RlIGNsaXAuXHJcbiAgICAgICAgICAgIGNvbnN0IHN0YXRlID0gX3N0YXRlcy5nZXQoY2xpcClcclxuICAgICAgICAgICAgY29uc3QgbGlzdGVuZXJzID0gc3RhdGUubGlzdGVuZXJzLmdldChldmVudC50eXBlKVxyXG5cclxuICAgICAgICAgICAgaWYgKGxpc3RlbmVycykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcHJldmlvdXNUYXJnZXQgPSBldmVudFN0YXRlLmN1cnJlbnRUYXJnZXRcclxuICAgICAgICAgICAgICAgIGV2ZW50U3RhdGUuY3VycmVudFRhcmdldCA9IGNsaXBcclxuXHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgbGlzdGVuZXIgb2YgWy4uLmxpc3RlbmVyc10pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpc3RlbmVyLmNhbGwoY2xpcCwgZXZlbnQpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBgRXJyb3IgY2FsbGluZyBldmVudCBsaXN0ZW5lciBcIiR7ZXZlbnQudHlwZX1cIiBpbiBjbGlwIFwiJHtjbGlwLmNsaXBOYW1lfVwiOmAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50U3RhdGUuY3VycmVudFRhcmdldCA9IHByZXZpb3VzVGFyZ2V0XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIFNlIHByb3BhZ2EgZW4gcHJlb3JkZW4uXHJcbiAgICAgICAgICAgIGlmIChzcHJlYWQgPT09IHRydWUpIHtcclxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgY2xpcC5jaGlsZENsaXBzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZGlzcGF0Y2goY2hpbGQpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGV2ZW50U3RhdGUudGFyZ2V0ID0gdGhpc1xyXG5cclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBkaXNwYXRjaCh0aGlzKVxyXG4gICAgICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgICAgIGV2ZW50U3RhdGUudGFyZ2V0ID0gbnVsbFxyXG4gICAgICAgICAgICBldmVudFN0YXRlLmN1cnJlbnRUYXJnZXQgPSBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdGhpc1xyXG4gICAgfVxyXG5cclxufVxyXG5cclxuXHJcbi8qKlxyXG4gKiBQZXJmb3JtcyB0aGUgY2xpcCBpbmNsdXNpb24uXHJcbiAqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEB0aGlzIHtDbGlwfVxyXG4gKiBAc2VlIENsaXAjaW5jbHVkZVxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gX2luY2x1ZGUodGFyZ2V0LCBvcHRpb25zID0ge30pIHtcclxuICAgIC8vIFNlIHZhbGlkYSBlbCBkZXN0aW5vLlxyXG4gICAgaWYgKCF0YXJnZXQgfHwgKHRhcmdldC5ub2RlVHlwZSAhPT0gTm9kZS5FTEVNRU5UX05PREUgJiYgdGFyZ2V0Lm5vZGVUeXBlICE9PSBOb2RlLkNPTU1FTlRfTk9ERSkpIHtcclxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIHRhcmdldDogbXVzdCBiZSBhbiBFbGVtZW50IG9yIENvbW1lbnQuJylcclxuICAgIH1cclxuXHJcbiAgICAvLyBTZSB2YWxpZGEgbGEgcG9zaWNpw7NuIGVzcGVjaWZpY2FkYSB5IHNlIHJldGlyYSBsYSBvcGNpw7NuIHBhcmEgZXZpdGFyIGFycmFzdHJhcmxhLlxyXG4gICAgY29uc3QgcG9zaXRpb24gPSBvcHRpb25zLnBvc2l0aW9uID8/IENsaXAuUG9zaXRpb24uZW5kXHJcbiAgICBpZiAoIU9iamVjdC52YWx1ZXMoQ2xpcC5Qb3NpdGlvbikuaW5jbHVkZXMocG9zaXRpb24pKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoYEludmFsaWQgcG9zaXRpb246ICR7U3RyaW5nKHBvc2l0aW9uKX0uYClcclxuICAgIH1cclxuICAgIGRlbGV0ZSBvcHRpb25zLnBvc2l0aW9uXHJcblxyXG4gICAgLy8gTG9zIGNvbWVudGFyaW9zIG5vIHB1ZWRlbiBjb250ZW5lciBub2Rvcy5cclxuICAgIGlmICh0YXJnZXQubm9kZVR5cGUgPT09IE5vZGUuQ09NTUVOVF9OT0RFICYmIChwb3NpdGlvbiA9PT0gQ2xpcC5Qb3NpdGlvbi5zdGFydCB8fCBwb3NpdGlvbiA9PT0gQ2xpcC5Qb3NpdGlvbi5lbmQpKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBwb3NpdGlvbjogc3RhcnQgYW5kIGVuZCByZXF1aXJlIGFuIEVsZW1lbnQgdGFyZ2V0LicpXHJcbiAgICB9XHJcblxyXG4gICAgLy8gU2UgY29tcHJ1ZWJhIGxhcyBwb3NpY2lvbmVzIHF1ZSByZXF1aWVyZW4gcXVlIGVsIGVsZW1lbnRvIGRlc3Rpbm8gZXN0w6kgY29udGVuaWRvIGVuIG90cm8gZWxlbWVudG8uXHJcbiAgICBpZiAoW0NsaXAuUG9zaXRpb24uYmVmb3JlLCBDbGlwLlBvc2l0aW9uLmFmdGVyLCBDbGlwLlBvc2l0aW9uLnJlcGxhY2VdLmluY2x1ZGVzKHBvc2l0aW9uKSAmJiAhdGFyZ2V0LnBhcmVudE5vZGUpIHtcclxuICAgICAgICB0aHJvdyBuZXcgQ2xpcEVycm9yKGBJbnZhbGlkIHRhcmdldDogbXVzdCBoYXZlIGEgcGFyZW50IG5vZGUgZm9yIHBvc2l0aW9uIFwiJHtwb3NpdGlvbn1cIi5gKVxyXG4gICAgfVxyXG5cclxuICAgIC8vIFNlIHJlY3VwZXJhIGVsIGVzdGFkbyBkZWwgY2xpcC5cclxuICAgIGNvbnN0IHN0YXRlID0gX3N0YXRlcy5nZXQodGhpcylcclxuXHJcbiAgICAvLyBTZSBnZW5lcmEgbGEgcmHDrXogc2kgdG9kYXbDrWEgbm8gZXhpc3RlLiAgICBcclxuICAgIGxldCByb290ID0gc3RhdGUucm9vdCwgZnJlc2ggPSBmYWxzZVxyXG4gICAgaWYgKCFyb290KSB7XHJcbiAgICAgICAgY29uc3QgY3R4ID0gbmV3IFJlbmRlckNvbnRleHQodGhpcylcclxuICAgICAgICBcclxuICAgICAgICBsZXQgcmVzdWx0XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgcmVzdWx0ID0gYXdhaXQgdGhpcy5yZW5kZXIoY3R4LCBvcHRpb25zKVxyXG4gICAgICAgIH0gY2F0Y2ggKGNhdXNlKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBDbGlwRXJyb3IoYFVuYWJsZSB0byByZW5kZXIgY2xpcCBcIiR7dGhpcy5jbGlwTmFtZX1cIi5gLCB7IGNhdXNlIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHJlc3VsdCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBDbGlwRXJyb3IoYE1pc3NpbmcgcmVuZGVyIG91dHB1dCBmb3IgY2xpcCBcIiR7dGhpcy5jbGlwTmFtZX1cIi5gKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHJlc3VsdC5ub2RlVHlwZSA9PT0gTm9kZS5FTEVNRU5UX05PREUpIHtcclxuICAgICAgICAgICAgcm9vdCA9IHJlc3VsdDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIHJlc3VsdCA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgICAgIGN0eC5wcmludChyZXN1bHQpXHJcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBhd2FpdCBjdHgucmVzb2x2ZSgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChyZXN1bHQubm9kZVR5cGUgPT09IE5vZGUuRE9DVU1FTlRfRlJBR01FTlRfTk9ERSkge1xyXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBub2RlIG9mIHJlc3VsdC5jaGlsZE5vZGVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IE5vZGUuRUxFTUVOVF9OT0RFKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyb290KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgQ2xpcEVycm9yKCdNdWx0aXBsZSByb290IGVsZW1lbnRzIGFyZSBub3QgYWxsb3dlZC4nKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvb3QgPSBub2RlXHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChub2RlLm5vZGVUeXBlID09PSBOb2RlLlRFWFRfTk9ERSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS5kYXRhLnRyaW0oKS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgQ2xpcEVycm9yKCdUZXh0IG91dHNpZGUgdGhlIHJvb3QgZWxlbWVudCBpcyBub3QgYWxsb3dlZC4nKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChub2RlLm5vZGVUeXBlICE9PSBOb2RlLkNPTU1FTlRfTk9ERSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgQ2xpcEVycm9yKGBVbnN1cHBvcnRlZCBub2RlIHR5cGUgKCR7bm9kZS5ub2RlVHlwZX0pIG91dHNpZGUgdGhlIHJvb3QgZWxlbWVudC5gKVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFyb290KSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBDbGlwRXJyb3IoJ01pc3NpbmcgY2xpcCByb290OiByZW5kZXIoKSBtdXN0IHJldHVybiBhbiBFbGVtZW50LCAnICsgXHJcbiAgICAgICAgICAgICAgICAnb3IgYSBEb2N1bWVudEZyYWdtZW50L0hUTUwgc3RyaW5nIGNvbnRhaW5pbmcgYSBzaW5nbGUgcm9vdCBlbGVtZW50LicpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBTZSBjb21wcnVlYmEgcXVlIGVsIG1pc21vIGVsZW1lbnRvIG5vIGVzdMOpIGFzb2NpYWRvIGEgb3RybyBjbGlwLlxyXG4gICAgICAgIGNvbnN0IGNsaXAgPSBfcm9vdHMuZ2V0KHJvb3QpXHJcbiAgICAgICAgaWYgKGNsaXAgJiYgY2xpcCAhPT0gdGhpcykge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgQ2xpcEVycm9yKCdDbGlwIHJvb3QgYWxyZWFkeSBiZWxvbmdzIHRvIGFub3RoZXIgY2xpcC4nKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gU2UgaWRlbnRpZmljYSBlbCBlbGVtZW50byByYcOteiBkZWwgY2xpcC5cclxuICAgICAgICByb290LnNldEF0dHJpYnV0ZSgnZGF0YS1jbGlwJywgdGhpcy5jbGlwTmFtZSlcclxuXHJcbiAgICAgICAgLy8gU2UgaW5kaWNhIHF1ZSBsYSByYcOteiBlcyBkZSByZWNpZW50ZSBjcmVhY2nDs24uXHJcbiAgICAgICAgZnJlc2ggPSB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgLy8gRWwgZGVzdGlubyBwdWVkZSBoYWJlciBjYW1iaWFkbyBkdXJhbnRlIGVsIHJlbmRlcml6YWRvLlxyXG4gICAgaWYgKFtDbGlwLlBvc2l0aW9uLmJlZm9yZSwgQ2xpcC5Qb3NpdGlvbi5hZnRlciwgQ2xpcC5Qb3NpdGlvbi5yZXBsYWNlXS5pbmNsdWRlcyhwb3NpdGlvbikgJiYgIXRhcmdldC5wYXJlbnROb2RlKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IENsaXBFcnJvcignVGhlIHRhcmdldCBlbGVtZW50IG11c3QgaGF2ZSBhIHBhcmVudCBmb3IgdGhpcyBpbmNsdXNpb24gcG9zaXRpb24uJylcclxuICAgIH1cclxuXHJcbiAgICAvLyBTZSByZWNoYXphbiBkZXN0aW5vcyBkZW50cm8gZGUgbGEgcHJvcGlhIHJhw616LlxyXG4gICAgaWYgKHJvb3QuY29udGFpbnModGFyZ2V0KSkge1xyXG4gICAgICAgIHRocm93IG5ldyBDbGlwRXJyb3IoJ1RoZSB0YXJnZXQgZWxlbWVudCBjYW5ub3QgYmUgY29udGFpbmVkIHdpdGhpbiB0aGUgY2xpcCByb290LicpXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGZyZXNoKSB7XHJcbiAgICAgICAgLy8gU2UgdmluY3VsYSBlbCBlbGVtZW50byByYcOteiBjb24gbGEgaW5zdGFuY2lhIGRlbCBjbGlwLiBcclxuICAgICAgICBfcm9vdHMuc2V0KHJvb3QsIHRoaXMpXHJcblxyXG4gICAgICAgIC8vIFNlIGd1YXJkYSBlbCBlbGVtZW50byByYcOteiBlbiBlbCBlc3RhZG8gaW50ZXJubyBkZSBsYSBpbnN0YW5jaWEuXHJcbiAgICAgICAgc3RhdGUucm9vdCA9IHJvb3RcclxuXHJcbiAgICAgICAgLy8gUmVmZXJlbmNpYSBwYXJhIGRlcHVyYWNpw7NuLlxyXG4gICAgICAgIC8vIFRPRE86IERhcmxlIHVuIHBlbnNhZGEgYSBsYSBub21lbmNsYXR1cmEgZGUgbGEgcHJvcGllZGFkLlxyXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShyb290LCAnX19jbGlwJywge1xyXG4gICAgICAgICAgICB2YWx1ZTogdGhpcyxcclxuICAgICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXHJcbiAgICAgICAgfSlcclxuICAgIH0gXHJcblxyXG4gICAgLy8gU2UgZ3VhcmRhIHNpIGxhIHJhw616IGVzdGFiYSBjb25lY3RhZGEgYW50ZXMgZGUgaW5jbHVpcmxhIGVuIGVsIGRlc3Rpbm8uXHJcbiAgICBjb25zdCB3YXNDb25uZWN0ZWQgPSByb290LmlzQ29ubmVjdGVkXHJcblxyXG4gICAgLy8gUmVjZXB0b3JlcyBkZSBldmVudG9zLlxyXG4gICAgY29uc3QgZXZlbnRUYXJnZXRzID0ge1xyXG4gICAgICAgIGRldGFjaDogW10sIGF0dGFjaDogW10gICAgICAgIFxyXG4gICAgfVxyXG5cclxuICAgIC8vIFNlIGluc2VydGEgbGEgcmHDrXouXHJcbiAgICBzd2l0Y2ggKHBvc2l0aW9uKSB7XHJcbiAgICAgICAgY2FzZSBDbGlwLlBvc2l0aW9uLmFmdGVyOlxyXG4gICAgICAgICAgICB0YXJnZXQuYWZ0ZXIocm9vdClcclxuICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgY2FzZSBDbGlwLlBvc2l0aW9uLmJlZm9yZTpcclxuICAgICAgICAgICAgdGFyZ2V0LmJlZm9yZShyb290KVxyXG4gICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICBjYXNlIENsaXAuUG9zaXRpb24ucmVwbGFjZTpcclxuICAgICAgICAgICAgY29uc3QgY29ubmVjdGVkID0gdGFyZ2V0LmlzQ29ubmVjdGVkXHJcblxyXG4gICAgICAgICAgICBpZiAodGFyZ2V0LmNvbnRhaW5zKHJvb3QpKSB7XHJcbiAgICAgICAgICAgICAgICB0YXJnZXQuYmVmb3JlKHJvb3QpXHJcbiAgICAgICAgICAgICAgICB0YXJnZXQucmVtb3ZlKClcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRhcmdldC5yZXBsYWNlV2l0aChyb290KVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoY29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjb2xsZWN0ID0gZWxlbWVudCA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBbLi4uZWxlbWVudC5jaGlsZHJlbl0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29sbGVjdChjaGlsZClcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY2xpcCA9IF9yb290cy5nZXQoZWxlbWVudClcclxuICAgICAgICAgICAgICAgICAgICBpZiAoY2xpcCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBldmVudFRhcmdldHMuZGV0YWNoLnB1c2goY2xpcClcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgY29sbGVjdCh0YXJnZXQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgIGNhc2UgQ2xpcC5Qb3NpdGlvbi5zdGFydDpcclxuICAgICAgICAgICAgdGFyZ2V0LnByZXBlbmQocm9vdClcclxuICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgY2FzZSBDbGlwLlBvc2l0aW9uLmVuZDpcclxuICAgICAgICAgICAgdGFyZ2V0LmFwcGVuZChyb290KVxyXG4gICAgICAgICAgICBicmVha1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFNlIGRldGVybWluYSBzaSBlbWl0aXIgZWwgZXZlbnRvIFwiYXR0YWNoXCIgbyBcImRldGFjaFwiIHNvYnJlIGVsIGNsaXAgaW5jbHXDrWRvIHkgbG9zIGNsaXBzIGNvbnRlbmlkb3MuXHJcbiAgICBjb25zdCBpc0Nvbm5lY3RlZCA9IHJvb3QuaXNDb25uZWN0ZWRcclxuICAgIGlmIChpc0Nvbm5lY3RlZCAhPT0gd2FzQ29ubmVjdGVkKSB7XHJcbiAgICAgICAgY29uc3QgY29sbGVjdCA9IGVsZW1lbnQgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBjbGlwID0gX3Jvb3RzLmdldChlbGVtZW50KVxyXG5cclxuICAgICAgICAgICAgaWYgKGNsaXAgJiYgaXNDb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgICAgIGV2ZW50VGFyZ2V0cy5hdHRhY2gucHVzaChjbGlwKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBlbGVtZW50LmNoaWxkcmVuKSB7XHJcbiAgICAgICAgICAgICAgICBjb2xsZWN0KGNoaWxkKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoY2xpcCAmJiAhaXNDb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgICAgIGV2ZW50VGFyZ2V0cy5kZXRhY2gucHVzaChjbGlwKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29sbGVjdChyb290KVxyXG4gICAgfVxyXG5cclxuICAgIC8vIFNlIGVtaXRlbiBsb3MgZXZlbnRvcyBjb3JyZXNwb25kaWVudGVzLlxyXG4gICAgZm9yIChjb25zdCBldmVudCBvZiBPYmplY3Qua2V5cyhldmVudFRhcmdldHMpKSB7XHJcbiAgICAgICAgZm9yIChjb25zdCBjbGlwIG9mIGV2ZW50VGFyZ2V0c1tldmVudF0pIHtcclxuICAgICAgICAgICAgLy8gVE9ETzogRXZhbHVhciBxdWUgcGFzYSBzaSBsYSBwcm9wYWdhY2nDs24gZGVsIGV2ZW50byBmYWxsYS5cclxuICAgICAgICAgICAgY2xpcC5maXJlKGV2ZW50KTtcclxuICAgICAgICB9ICAgIFxyXG4gICAgfVxyXG5cclxuICAgIC8vIFNlIGxsYW1hIGFsIHJlYWR5IGVuIGNhZGEgaW5jbHVzacOzbi5cclxuICAgIHRyeSB7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5yZWFkeSh7IC4uLm9wdGlvbnMsIGZyZXNoLCByZWxvYWQ6IGZhbHNlIH0pXHJcbiAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgICB0aHJvdyBuZXcgQ2xpcEVycm9yKGBVbmFibGUgdG8gcmVhZHkgY2xpcCBcIiR7dGhpcy5jbGlwTmFtZX1cIi5gLCB7IGNhdXNlOiBlcnIgfSlcclxuICAgIH1cclxuXHJcbiAgICAvLyBTZSBpbmljaWEgbGEgY2FyZ2EgZGUgZGF0b3MgYWRpY2lvbmFsZXMuXHJcbiAgICBpZiAoIXN0YXRlLmxvYWRTdGFydGVkKSB7XHJcbiAgICAgICAgc3RhdGUubG9hZFN0YXJ0ZWQgPSB0cnVlO1xyXG5cclxuICAgICAgICB2b2lkIChhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBkYXRhXHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBkYXRhID0gYXdhaXQgdGhpcy5sb2FkKHsgLi4ub3B0aW9ucywgcmVsb2FkOiBmYWxzZSB9KVxyXG4gICAgICAgICAgICAgICAgc3RhdGUubG9hZFRpbWUgPSBEYXRlLm5vdygpICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGNhdXNlKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgQ2xpcEVycm9yKGBVbmFibGUgdG8gbG9hZCBkYXRhIGZvciBjbGlwIFwiJHt0aGlzLmNsaXBOYW1lfVwiLmAsIHsgY2F1c2UgfSlcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMudXBkYXRlKHsgLi4ub3B0aW9ucywgZGF0YSwgcmVsb2FkOiBmYWxzZSB9KVxyXG4gICAgICAgICAgICB9IGNhdGNoIChjYXVzZSkge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IENsaXBFcnJvcihgVW5hYmxlIHRvIHVwZGF0ZSBjbGlwIFwiJHt0aGlzLmNsaXBOYW1lfVwiLmAsIHsgY2F1c2UgfSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pKCkuY2F0Y2goZXJyID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIFNlIGRldnVlbHZlIGxhIHByb3BpYSBpbnN0YW5jaWEuXHJcbiAgICByZXR1cm4gdGhpc1xyXG59XHJcblxyXG5cclxuLyogQ0xJUCBFVkVOVFxyXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cclxuLyoqXHJcbiAqIEludGVybmFsIGV2ZW50IHN0YXRlcy5cclxuICogXHJcbiAqIEBwcml2YXRlXHJcbiAqIEB0eXBlIHtXZWFrTWFwPENsaXBFdmVudCwge1xyXG4gKiAgICAgdGFyZ2V0OiBDbGlwfG51bGwsXHJcbiAqICAgICBjdXJyZW50VGFyZ2V0OiBDbGlwfG51bGxcclxuICogfT59XHJcbiAqL1xyXG5jb25zdCBfZXZlbnRTdGF0ZXMgPSBuZXcgV2Vha01hcCgpXHJcblxyXG4vKipcclxuICogRXZlbnQgZGlzcGF0Y2hlZCBieSBhIGNsaXAuXHJcbiAqL1xyXG5jbGFzcyBDbGlwRXZlbnQge1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ3JlYXRlcyBhIGNsaXAgZXZlbnQuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgRXZlbnQgdHlwZS5cclxuICAgICAqIEBwYXJhbSB7Kn0gW2RldGFpbF0gRXZlbnQgZGF0YS5cclxuICAgICAqL1xyXG4gICAgY29uc3RydWN0b3IodHlwZSwgZGV0YWlsKSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiB0eXBlICE9PSAnc3RyaW5nJyB8fCB0eXBlLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGV2ZW50IHR5cGU6IGEgbm9uLWVtcHR5IHN0cmluZyBpcyByZXF1aXJlZC4nKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgX2V2ZW50U3RhdGVzLnNldCh0aGlzLCB7XHJcbiAgICAgICAgICAgIHRhcmdldDogbnVsbCxcclxuICAgICAgICAgICAgY3VycmVudFRhcmdldDogbnVsbFxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcclxuICAgICAgICAgICAgdHlwZToge1xyXG4gICAgICAgICAgICAgICAgdmFsdWU6IHR5cGUsXHJcbiAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGRldGFpbDoge1xyXG4gICAgICAgICAgICAgICAgdmFsdWU6IGRldGFpbCxcclxuICAgICAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWVcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDbGlwIHRoYXQgaW5pdGlhdGVkIHRoZSBjdXJyZW50IGRpc3BhdGNoLlxyXG4gICAgICpcclxuICAgICAqIEB0eXBlIHtDbGlwfG51bGx9XHJcbiAgICAgKiBAcmVhZG9ubHlcclxuICAgICAqL1xyXG4gICAgZ2V0IHRhcmdldCgpIHtcclxuICAgICAgICByZXR1cm4gX2V2ZW50U3RhdGVzLmdldCh0aGlzKS50YXJnZXRcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENsaXAgd2hvc2UgbGlzdGVuZXJzIGFyZSBjdXJyZW50bHkgYmVpbmcgY2FsbGVkLlxyXG4gICAgICpcclxuICAgICAqIEB0eXBlIHtDbGlwfG51bGx9XHJcbiAgICAgKiBAcmVhZG9ubHlcclxuICAgICAqL1xyXG4gICAgZ2V0IGN1cnJlbnRUYXJnZXQoKSB7XHJcbiAgICAgICAgcmV0dXJuIF9ldmVudFN0YXRlcy5nZXQodGhpcykuY3VycmVudFRhcmdldFxyXG4gICAgfVxyXG5cclxufVxyXG5cclxuXHJcbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xyXG4vKipcclxuICogQ2xpcCBFcnJvci5cclxuICovXHJcbmNsYXNzIENsaXBFcnJvciBleHRlbmRzIEVycm9yIHtcclxuXHJcbiAgICAvLyBDw7NkaWdvcyBkZSBlcnJvcjpcclxuICAgIHN0YXRpYyBhbHJlYWR5RGVmaW5lZCAgID0gJ2FscmVhZHlfZGVmaW5lZCdcclxuICAgIHN0YXRpYyByb290UmVxdWlyZWQgICAgID0gJ3Jvb3RfcmVxdWlyZWQnXHJcbiAgICBzdGF0aWMgbG9hZEZhaWxlZCAgICAgICA9ICdsb2FkX2ZhaWxlZCdcclxuICAgIHN0YXRpYyBub3REZWZpbmVkICAgICAgID0gJ25vdF9kZWZpbmVkJ1xyXG4gICAgc3RhdGljIG5vdEZvdW5kICAgICAgICAgPSAnbm90X2ZvdW5kJ1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ29uc3RydWN0b3IuXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSBEZXNjcmlwY2nDs24gZGVsIGVycm9yLlxyXG4gICAgICogQHBhcmFtIHt7IGNvZGU/OiBzdHJpbmcsIGNhdXNlPzogRXJyb3IgfCBFcnJvcltdIH19IFtvcHRpb25zXSBPcGNpb25lcyBhZGljaW9uYWxlcy5cclxuICAgICAqL1xyXG4gICAgY29uc3RydWN0b3IobWVzc2FnZSwgeyBjb2RlID0gbnVsbCwgY2F1c2UgfSA9IHt9KSB7XHJcbiAgICAgICAgc3VwZXIoU3RyaW5nKG1lc3NhZ2UpLCBjYXVzZSAhPT0gdW5kZWZpbmVkID8geyBjYXVzZSB9IDogdW5kZWZpbmVkKVxyXG5cclxuICAgICAgICB0aGlzLm5hbWUgPSAnQ2xpcEVycm9yJ1xyXG4gICAgICAgIHRoaXMuY29kZSA9IGNvZGVcclxuXHJcbiAgICAgICAgaWYgKEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKSB7XHJcbiAgICAgICAgICAgIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIENsaXBFcnJvcilcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcblxyXG4vKiBSRU5ERVIgQ09OVEVYVFxyXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cclxuLyoqXHJcbiAqIEJ1aWxkcyBIVE1MIG91dHB1dCBhbmQgcmVzb2x2ZXMgbmVzdGVkIGNsaXAgYW5kIHRlbXBsYXRlIGluY2x1c2lvbnMuXHJcbiAqXHJcbiAqIEVhY2ggY29udGV4dCBiZWxvbmdzIHRvIGEgY2xpcCBhbmQgcmVwcmVzZW50cyBhIHNpbmdsZSByZW5kZXJpbmcgb3BlcmF0aW9uLiBJbmNsdXNpb24gbWFya2VycyBtdXN0IGFwcGVhciBleGFjdGx5IFxyXG4gKiBvbmNlIGluIHRoZSBnZW5lcmF0ZWQgSFRNTC5cclxuICovXHJcbmNsYXNzIFJlbmRlckNvbnRleHQge1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogSFRNTCBvdXRwdXQgY2h1bmtzLlxyXG4gICAgICpcclxuICAgICAqIEB0eXBlIHtzdHJpbmdbXX1cclxuICAgICAqL1xyXG4gICAgI291dCA9IFtdXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDbGlwIGFzc29jaWF0ZWQgd2l0aCB0aGlzIHJlbmRlcmluZyBvcGVyYXRpb24uXHJcbiAgICAgKlxyXG4gICAgICogQHR5cGUge0NsaXB9XHJcbiAgICAgKi9cclxuICAgICNjbGlwID0gbnVsbFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogUGVuZGluZyBpbmNsdXNpb25zLCBpbiByZWdpc3RyYXRpb24gb3JkZXIuXHJcbiAgICAgKlxyXG4gICAgICogQHR5cGUge0FycmF5PHtuYW1lOiBzdHJpbmcsIG9wdGlvbnM6IE9iamVjdH0+fVxyXG4gICAgICovXHJcbiAgICAjaW5jbHVkZXMgPSBbXVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogV2hldGhlciByZXNvbHV0aW9uIGhhcyBzdGFydGVkLlxyXG4gICAgICpcclxuICAgICAqIEB0eXBlIHtib29sZWFufVxyXG4gICAgICovXHJcbiAgICAjcmVzb2x2ZVN0YXJ0ZWQgPSBmYWxzZVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ3JlYXRlcyBhIHJlbmRlcmluZyBjb250ZXh0IGFzc29jaWF0ZWQgd2l0aCBhIGNsaXAuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtDbGlwfSBjbGlwIEFzc29jaWF0ZWQgY2xpcC5cclxuICAgICAqL1xyXG4gICAgY29uc3RydWN0b3IoY2xpcCkge1xyXG4gICAgICAgIHRoaXMuI2NsaXAgPSBjbGlwXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZWdpc3RlcnMgYW4gaW5jbHVzaW9uIGFuZCByZXR1cm5zIGl0cyBIVE1MIGNvbW1lbnQgbWFya2VyLlxyXG4gICAgICpcclxuICAgICAqIE5hbWVzIGJlZ2lubmluZyB3aXRoIHRoZSBjbGlwIHByZWZpeCBpZGVudGlmeSBjbGlwcy4gT3RoZXIgbmFtZXMgaWRlbnRpZnkgdGVtcGxhdGVzLlxyXG4gICAgICpcclxuICAgICAqIFRoZSByZXR1cm5lZCBtYXJrZXIgbXVzdCBiZSBpbmNvcnBvcmF0ZWQgaW50byB0aGUgSFRNTCBvdXRwdXQuIEluY2x1c2lvbiBvcHRpb25zIGFyZSBzaGFsbG93LWNvcGllZCB3aGVuIHJlZ2lzdGVyZWQuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgQ2xpcCBvciB0ZW1wbGF0ZSBuYW1lLlxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zPXt9XSBJbmNsdXNpb24gb3B0aW9ucy5cclxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgY29tbWVudCBtYXJrZXIuXHJcbiAgICAgKi9cclxuICAgIGluY2x1ZGUobmFtZSwgb3B0aW9ucykge1xyXG4gICAgICAgIHRoaXMuI2Fzc2VydFJlc29sdmVOb3RTdGFydGVkKClcclxuXHJcbiAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLiNpbmNsdWRlcy5sZW5ndGhcclxuICAgICAgICB0aGlzLiNpbmNsdWRlcy5wdXNoKHsgbmFtZSwgb3B0aW9ucyB9KVxyXG5cclxuICAgICAgICByZXR1cm4gYDwhLS1bY2xpcC1zbG90OiR7aW5kZXh9XS0tPmBcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEFwcGVuZHMgYSB2YWx1ZSB0byB0aGUgSFRNTCBvdXRwdXQuXHJcbiAgICAgKlxyXG4gICAgICogVGhlIHZhbHVlIGlzIGNvbnZlcnRlZCB0byBhIHN0cmluZyBiZWZvcmUgb3B0aW9uYWxseSBiZWluZyBlc2NhcGVkLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7Kn0gdmFsdWUgVmFsdWUgdG8gYXBwZW5kLlxyXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbZXNjPWZhbHNlXSBXaGV0aGVyIHRvIGVzY2FwZSBIVE1MIHNwZWNpYWwgY2hhcmFjdGVycy5cclxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxyXG4gICAgICovXHJcbiAgICBwcmludCh2YWx1ZSwgZXNjID0gZmFsc2UpIHtcclxuICAgICAgICB0aGlzLiNhc3NlcnRSZXNvbHZlTm90U3RhcnRlZCgpXHJcblxyXG4gICAgICAgIHZhbHVlID0gU3RyaW5nKHZhbHVlKVxyXG4gICAgICAgIHRoaXMuI291dC5wdXNoKGVzYyA/IHRoaXMuZXNjYXBlKHZhbHVlKSA6IHZhbHVlKVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvKipcclxuICAgICAqIFBhcnNlcyB0aGUgYWNjdW11bGF0ZWQgSFRNTCBhbmQgcmVzb2x2ZXMgYWxsIHJlZ2lzdGVyZWQgaW5jbHVzaW9ucy5cclxuICAgICAqXHJcbiAgICAgKiBJbmNsdXNpb24gbWFya2VycyBhcmUgbG9jYXRlZCBiZWZvcmUgcmVzb2x2aW5nIGFueSBpbmNsdXNpb24uXHJcbiAgICAgKiBJbmNsdXNpb25zIGFyZSB0aGVuIHJlc29sdmVkIHNlcXVlbnRpYWxseSBpbiByZWdpc3RyYXRpb24gb3JkZXIuXHJcbiAgICAgKlxyXG4gICAgICogVGhlIHJlc3VsdGluZyBub2RlcyBiZWxvbmcgdG8gYSBkZXRhY2hlZCBEb2N1bWVudEZyYWdtZW50LlxyXG4gICAgICpcclxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlPERvY3VtZW50RnJhZ21lbnQ+fSBSZW5kZXJlZCBIVE1MIGZyYWdtZW50LlxyXG4gICAgICogQHRocm93cyB7RXJyb3J9IElmIGFuIGluY2x1c2lvbiBtYXJrZXIgaXMgaW52YWxpZCwgZHVwbGljYXRlZCBvciBtaXNzaW5nLlxyXG4gICAgICovXHJcbiAgICBhc3luYyByZXNvbHZlKCkge1xyXG4gICAgICAgIGlmICh0aGlzLiNyZXNvbHZlU3RhcnRlZCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgQ2xpcEVycm9yKCdSZW5kZXIgY29udGV4dCByZXNvbHV0aW9uIGhhcyBhbHJlYWR5IHN0YXJ0ZWQuJylcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuI3Jlc29sdmVTdGFydGVkID0gdHJ1ZVxyXG5cclxuICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RlbXBsYXRlJylcclxuICAgICAgICB0ZW1wbGF0ZS5pbm5lckhUTUwgPSB0aGlzLiNvdXQuam9pbignJylcclxuXHJcbiAgICAgICAgY29uc3Qgc2xvdHMgPSBuZXcgTWFwKClcclxuXHJcbiAgICAgICAgY29uc3Qgd2Fsa2VyID0gZG9jdW1lbnQuY3JlYXRlVHJlZVdhbGtlcih0ZW1wbGF0ZS5jb250ZW50LCBOb2RlRmlsdGVyLlNIT1dfQ09NTUVOVClcclxuXHJcbiAgICAgICAgd2hpbGUgKHdhbGtlci5uZXh0Tm9kZSgpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSB3YWxrZXIuY3VycmVudE5vZGVcclxuICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSAvXlxcW2NsaXAtc2xvdDooMHxbMS05XVxcZCopXFxdJC8uZXhlYyhub2RlLmRhdGEpXHJcblxyXG4gICAgICAgICAgICBpZiAoIW1hdGNoKSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IE51bWJlcihtYXRjaFsxXSlcclxuXHJcbiAgICAgICAgICAgIGlmIChpbmRleCA+PSB0aGlzLiNpbmNsdWRlcy5sZW5ndGggfHwgc2xvdHMuaGFzKGluZGV4KSkge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IENsaXBFcnJvcihgSW52YWxpZCBpbmNsdWRlIHNsb3Q6ICR7bm9kZS5kYXRhfWApXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHNsb3RzLnNldChpbmRleCwgbm9kZSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChzbG90cy5zaXplICE9PSB0aGlzLiNpbmNsdWRlcy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IENsaXBFcnJvcihgSW5jbHVkZXMgbWlzbWF0Y2g6ICR7c2xvdHMuc2l6ZX0gdnMgJHt0aGlzLiNpbmNsdWRlcy5sZW5ndGh9YClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy4jaW5jbHVkZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgY29uc3QgeyBuYW1lLCBvcHRpb25zIH0gPSB0aGlzLiNpbmNsdWRlc1tpXVxyXG5cclxuICAgICAgICAgICAgaWYgKG5hbWUuc3RhcnRzV2l0aChfY2xpcFByZWZpeCkpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNsaXAgPSBhd2FpdCBjbGlwcy5jcmVhdGUobmFtZS5zdWJzdHJpbmcoX2NsaXBQcmVmaXgubGVuZ3RoKSwgb3B0aW9ucylcclxuXHJcbiAgICAgICAgICAgICAgICBhd2FpdCBjbGlwLmluY2x1ZGUoc2xvdHMuZ2V0KGkpLCB7IC4uLm9wdGlvbnMsIHBvc2l0aW9uOiBDbGlwLlBvc2l0aW9uLnJlcGxhY2UgfSlcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZyYWdtZW50ID0gYXdhaXQgY2xpcHMucmVuZGVyKHRoaXMuI2NsaXAsIG5hbWUsIG9wdGlvbnMpXHJcblxyXG4gICAgICAgICAgICAgICAgc2xvdHMuZ2V0KGkpLnJlcGxhY2VXaXRoKGZyYWdtZW50KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdGVtcGxhdGUuY29udGVudFxyXG4gICAgfVxyXG5cclxuICAgICNhc3NlcnRSZXNvbHZlTm90U3RhcnRlZCgpIHtcclxuICAgICAgICBpZiAodGhpcy4jcmVzb2x2ZVN0YXJ0ZWQpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IENsaXBFcnJvcignQ2Fubm90IG1vZGlmeSBhIHJlbmRlciBjb250ZXh0IGFmdGVyIHJlc29sdXRpb24gaGFzIHN0YXJ0ZWQuJylcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDb25jYXRlbmF0ZXMgdGhlIHJlc3VsdHMgb2YgYSBzeW5jaHJvbm91cyBjYWxsYmFjayBvdmVyIGFuIGl0ZXJhYmxlLlxyXG4gICAgICpcclxuICAgICAqIFRoZSBjYWxsYmFjayByZWNlaXZlcyBlYWNoIGl0ZW0gYW5kIGl0cyB6ZXJvLWJhc2VkIGl0ZXJhdGlvbiBpbmRleCxcclxuICAgICAqIHdpdGggdGhlIGFzc29jaWF0ZWQgY2xpcCBhcyBpdHMgdGhpcyB2YWx1ZS5cclxuICAgICAqIE51bGwgYW5kIHVuZGVmaW5lZCByZXN1bHRzIGFyZSBvbWl0dGVkLiBSZXN1bHRzIGFyZSBub3QgSFRNTC1lc2NhcGVkLlxyXG4gICAgICogTnVsbCBvciB1bmRlZmluZWQgaXRlbXMgYXJlIHRyZWF0ZWQgYXMgYW4gZW1wdHkgaXRlcmFibGUuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtJdGVyYWJsZTwqPnxudWxsfHVuZGVmaW5lZH0gaXRlbXMgSXRlbXMgdG8gaXRlcmF0ZSBvdmVyLlxyXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbigqLCBudW1iZXIpOiAqfSBjYWxsYmFjayBTeW5jaHJvbm91cyByZW5kZXJpbmcgY2FsbGJhY2suXHJcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBDb25jYXRlbmF0ZWQgY2FsbGJhY2sgcmVzdWx0cy5cclxuICAgICAqL1xyXG4gICAgZWFjaChpdGVtcywgY2FsbGJhY2spIHtcclxuICAgICAgICBjb25zdCBvdXQgPSBbXVxyXG4gICAgICAgIFxyXG4gICAgICAgIGxldCBpbmRleCA9IDBcclxuICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMgPz8gW10pIHtcclxuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBjYWxsYmFjay5jYWxsKHRoaXMuI2NsaXAsIGl0ZW0sIGluZGV4KyspXHJcblxyXG4gICAgICAgICAgICBpZiAodmFsdWUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgb3V0LnB1c2godmFsdWUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBvdXQuam9pbignJylcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENvbnZlcnRzIGEgdmFsdWUgdG8gYSBzdHJpbmcgYW5kIGVzY2FwZXMgSFRNTCBzcGVjaWFsIGNoYXJhY3RlcnMuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHsqfSB2YWx1ZSBWYWx1ZSB0byBlc2NhcGUuXHJcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBFc2NhcGVkIHN0cmluZy5cclxuICAgICAqL1xyXG4gICAgZXNjYXBlKHZhbHVlKSB7XHJcbiAgICAgICAgcmV0dXJuIGVzY2FwZS5odG1sKHZhbHVlKVxyXG4gICAgfVxyXG5cclxufVxyXG5cclxuXHJcbi8qIENMSVBTIE9CSkVDVFxyXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cclxuXHJcbi8qKlxyXG4gKiBGb3JtYXRvIGRlbCBub21icmUgZGUgbG9zIGNsaXBzIChwYXRoLWxpa2UpLCB1bm8gbyB2YXJpb3Mgc2VnbWVudG9zIHNlcGFyYWRvcyBcclxuICogcG9yIFwiL1wiLCBjYWRhIHNlZ21lbnRvOiBbQS1aYS16MC05Xy1dK1xyXG4gKiBcclxuICogQHByaXZhdGVcclxuICogQHR5cGUge1JlZ0V4cH1cclxuICogQGNvbnN0YW50XHJcbiAqLyBcclxuY29uc3QgX2NsaXBOYW1lUmVnZXhwID0gL15bQS1aYS16MC05Xy1dKyg/OlxcL1tBLVphLXowLTlfLV0rKSokLztcclxuXHJcbi8qKlxyXG4gKiBMb25naXR1ZCBtw6F4aW1hIHBlcm1pdGlkYSBwYXJhIGxvcyBub21icmVzIGRlIGNsaXAuXHJcbiAqIFxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAdHlwZSB7bnVtYmVyfVxyXG4gKiBAY29uc3RhbnRcclxuICovXHJcbmNvbnN0IF9jbGlwTmFtZU1heExlbmd0aCA9IDI1NjtcclxuXHJcbi8qKlxyXG4gKiBBanVzdGVzIGRlIGNvbmZpZ3VyYWNpw7NuLlxyXG4gKiBAdHlwZSB7T2JqZWN0fVxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAY29uc3RhbnRcclxuICovXHJcbmNvbnN0IF9zZXR0aW5ncyA9IHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEluZGljYSBzaSBhY3RpdmFyIGVsIG1vZG8gZGUgZGVwdXJhY2nDs24uXHJcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cclxuICAgICAqIEBkZWZhdWx0IGZhbHNlXHJcbiAgICAgKi9cclxuICAgIGRlYnVnOiBmYWxzZSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIFJ1dGEgYmFzZSBkb25kZSBzZSB1YmljYSBsYSBkZWZpbmljacOzbiBkZSBsb3MgY2xpcHMuXHJcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxyXG4gICAgICogQGRlZmF1bHQgJy9jbGlwcydcclxuICAgICAqL1xyXG4gICAgYmFzZVBhdGg6ICcvY2xpcHMnLFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSW5kaWNhIHNpIGxvcyBlc3RpbG9zIGVzdMOhbiBwcmUtZW1wYXF1ZXRhZG9zLlxyXG4gICAgICogQHR5cGUge2Jvb2xlYW59XHJcbiAgICAgKiBAZGVmYXVsdCBmYWxzZVxyXG4gICAgICovXHJcbiAgICBzdHlsZXNCdW5kbGVkOiBmYWxzZSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIEluZGljYSBzaSBsYXMgcGxhbnRpbGxhcyBlc3TDoW4gcHJlLWVtcGFxdWV0YWRhcy5cclxuICAgICAqIEB0eXBlIHtib29sZWFufVxyXG4gICAgICogQGRlZmF1bHQgZmFsc2VcclxuICAgICAqL1xyXG4gICAgdGVtcGxhdGVzQnVuZGxlZDogZmFsc2VcclxufVxyXG5cclxuLyoqXHJcbiAqIENsaXBzIHJlZ2lzdHJhZG9zIHBvciBub21icmUuXHJcbiAqIFxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAdHlwZSB7TWFwPHN0cmluZywgdHlwZW9mIENsaXA+fVxyXG4gKi9cclxuY29uc3QgX2NsaXBUeXBlcyA9IG5ldyBNYXAoKVxyXG5cclxuXHJcbi8qKlxyXG4gKiBUT0RPOiBGYWx0YSBkb2N1bWVudGFjacOzbi5cclxuICogXHJcbiAqIEBuYW1lc3BhY2VcclxuICovXHJcbmNvbnN0IGNsaXBzID0ge1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQWN0dWFsaXphIGxvcyBhanVzdGVzIGRlIGNvbmZpZ3VyYWNpw7NuIGVzcGVjaWZpY2Fkb3MuXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgQWp1c3RlcyBkZSBjb25maWd1cmFjacOzbi5cclxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW3NldHRpbmdzLmRlYnVnXSBJbmRpY2Egc2kgYWN0aXZhciBlbCBtb2RvIGRlYnVnLlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9ICBbc2V0dGluZ3MuYmFzZVBhdGhdIFJ1dGEgYmFzZSBkb25kZSBzZSBsb2NhbGl6YSBsYSBkZWZpbmljacOzbiBkZSBsb3MgY2xpcHMuXHJcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtzZXR0aW5ncy5zdHlsZXNCdW5kbGVkXSBJbmRpY2Egc2kgbG9zIGVzdGlsb3MgZXN0w6FuIHByZS1lbXBhcXVldGFkb3MuXHJcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtzZXR0aW5ncy50ZW1wbGF0ZXNCdW5kbGVkXSBJbmRpY2Egc2kgbGFzIHBsYW50aWxsYXMgZXN0w6FuIHByZS1lbXBhcXVldGFkYXMuXHJcbiAgICAgKi9cclxuICAgIHNldHVwKHNldHRpbmdzKSB7XHJcbiAgICAgICAgT2JqZWN0LmFzc2lnbihfc2V0dGluZ3MsIHNldHRpbmdzKTtcclxuICAgIH0sXHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICogRGVmaW5lcyBhIG5ldyBjbGlwIHR5cGUuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgVW5pcXVlIGNsaXAgbmFtZS5cclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwcm90byBDbGlwIHByb3RvdHlwZS5cclxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlPHR5cGVvZiBDbGlwPn0gUmVzb2x2ZXMgdG8gdGhlIG5ldyBjbGlwIGNvbnN0cnVjdG9yLlxyXG4gICAgICovXHJcbiAgICBhc3luYyBkZWZpbmUobmFtZSwgcHJvdG8pIHtcclxuICAgICAgICAvLyBTZSB2YWxpZGEgZWwgbm9tYnJlLlxyXG4gICAgICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBjbGlwIG5hbWU6IHN0cmluZyByZXF1aXJlZC4nKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbmFtZSA9IG5hbWUudHJpbSgpXHJcblxyXG4gICAgICAgIGlmICghbmFtZSkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGNsaXAgbmFtZTogZW1wdHkgc3RyaW5nLicpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAobmFtZS5sZW5ndGggPiBfY2xpcE5hbWVNYXhMZW5ndGgpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoYEludmFsaWQgY2xpcCBuYW1lOiB0b28gbG9uZyAoJHtuYW1lLmxlbmd0aH0gPiAke19jbGlwTmFtZU1heExlbmd0aH0pLmApXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIV9jbGlwTmFtZVJlZ2V4cC50ZXN0KG5hbWUpKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgY2xpcCBuYW1lOiBleHBlY3RlZCBwYXRoLWxpa2Ugc3RyaW5nIHdpdGhvdXQgbGVhZGluZyBvciB0cmFpbGluZyBzbGFzaC4nKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gU2UgcGVybWl0ZSB1bmEgcHJvbWVzYSBwZW5kaWVudGUsIHBlcm8gbm8gdW4gdGlwbyB5YSBkZWZpbmlkby5cclxuICAgICAgICBjb25zdCBwcmV2aW91cyA9IF9jbGlwVHlwZXMuZ2V0KG5hbWUpXHJcblxyXG4gICAgICAgIGlmIChwcmV2aW91cz8ucHJvdG90eXBlIGluc3RhbmNlb2YgQ2xpcCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgQ2xpcEVycm9yKGBDbGlwIFwiJHtuYW1lfVwiIGFscmVhZHkgZGVmaW5lZC5gLCB7XHJcbiAgICAgICAgICAgICAgICBjb2RlOiBDbGlwRXJyb3IuYWxyZWFkeURlZmluZWRcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFNlIHZhbGlkYSBlbCBvYmpldG8gcHJvdG90aXBvLlxyXG4gICAgICAgIGlmIChwcm90byA9PT0gbnVsbCB8fCB0eXBlb2YgcHJvdG8gIT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgcHJvdG90eXBlOiBvYmplY3QgcmVxdWlyZWQuJylcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFNlIHJlc3VlbHZlIGVsIHRpcG8gYmFzZSBkZWwgY2xpcC5cclxuICAgICAgICBsZXQgQmFzZUNsaXAgPSBDbGlwXHJcblxyXG4gICAgICAgIGlmIChwcm90by5leHRlbmRzICE9IG51bGwpIHtcclxuICAgICAgICAgICAgbGV0IGV4dCA9IHByb3RvLmV4dGVuZHNcclxuXHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgZXh0ICE9PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgSW52YWxpZCBleHRlbmRzOiBzdHJpbmcgcmVxdWlyZWQuYClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZXh0ID0gZXh0LnRyaW0oKVxyXG5cclxuICAgICAgICAgICAgaWYgKCFleHQpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYEludmFsaWQgZXh0ZW5kczogZW1wdHkgc3RyaW5nLmApXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChleHQgPT09IG5hbWUpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgZXh0ZW5kczogYSBjbGlwIGNhbm5vdCBleHRlbmQgaXRzZWxmLicpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIEJhc2VDbGlwID0gYXdhaXQgX2dldENsaXBUeXBlKGV4dClcclxuXHJcbiAgICAgICAgICAgIGlmICghQmFzZUNsaXApIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBDbGlwRXJyb3IoYEludmFsaWQgZXh0ZW5kczogY2xpcCBcIiR7ZXh0fVwiIG5vdCBkZWZpbmVkLmAsIHsgY29kZTogQ2xpcEVycm9yLm5vdERlZmluZWQgfSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gU2UgYWRtaXRlIHVuIG9iamV0byBwbGFubyBvIHVubyBwcmV2aWFtZW50ZSB2aW5jdWxhZG8gYSBlc3RhIGNsYXNlIGJhc2UuXHJcbiAgICAgICAgY29uc3QgcGFyZW50ID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHByb3RvKVxyXG5cclxuICAgICAgICBpZiAocGFyZW50ICE9PSBPYmplY3QucHJvdG90eXBlICYmIHBhcmVudCAhPT0gQmFzZUNsaXAucHJvdG90eXBlKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgcHJvdG90eXBlOiBwbGFpbiBvYmplY3Qgb3Igb2JqZWN0IGxpbmtlZCB0byB0aGUgYmFzZSBjbGlwIHByb3RvdHlwZSByZXF1aXJlZC4nKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gU2UgY3JlYSBsYSBjbGFzZSBkZWwgbnVldm8gY2xpcC5cclxuICAgICAgICBjb25zdCBDID0gY2xhc3MgZXh0ZW5kcyBCYXNlQ2xpcCB7fVxyXG5cclxuICAgICAgICAvLyBTZSBlc3RhYmxlY2UgZWwgcHJvdG90aXBvIGJhc2UgcGFyYSBwZXJtaXRpciBlbCB1c28gZGUgc3VwZXIuXHJcbiAgICAgICAgT2JqZWN0LnNldFByb3RvdHlwZU9mKHByb3RvLCBCYXNlQ2xpcC5wcm90b3R5cGUpXHJcblxyXG4gICAgICAgIC8vIFNlIG9idGllbmVuIGxvcyBkZXNjcmlwdG9yZXMsIGV4Y2x1eWVuZG8gXCJjb25zdHJ1Y3RvclwiLCBcImV4dGVuZHNcIiB5IFwic3R5bGVzXCIuXHJcbiAgICAgICAgY29uc3QgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzKHByb3RvKVxyXG4gICAgICAgIGRlbGV0ZSBkZXNjLmNvbnN0cnVjdG9yXHJcbiAgICAgICAgZGVsZXRlIGRlc2MuZXh0ZW5kc1xyXG4gICAgICAgIGRlbGV0ZSBkZXNjLnN0eWxlc1xyXG5cclxuICAgICAgICAvLyBTZSBpbmNvcnBvcmFuIGxvcyBtaWVtYnJvcyBhbCBwcm90b3RpcG8gZGUgbGEgY2xhc2UuXHJcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoQy5wcm90b3R5cGUsIGRlc2MpXHJcblxyXG4gICAgICAgIC8vIFNlIGFzaWduYSBhIGxhIGNsYXNlIGVsIG5vbWJyZSBkZWwgdGlwbyBkZSBjbGlwLlxyXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShDLCAnbmFtZScsIHtcclxuICAgICAgICAgICAgdmFsdWU6IG5hbWUsXHJcbiAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIC8vIFNlIGltcG9ydGFuIGxhIGVzdGlsb3MgdmluY3VsYWRvcyBhbCBjbGlwLlxyXG4gICAgICAgIGF3YWl0IF9pbXBvcnRDbGlwU3R5bGVzKG5hbWUsIHByb3RvLnN0eWxlcyk7XHJcblxyXG4gICAgICAgIC8vIFNlIGNvbXBydWViYSBxdWUgbGEgZW50cmFkYSBubyBoYXlhIGNhbWJpYWRvIGR1cmFudGUgbGEgZGVmaW5pY2nDs24uXHJcbiAgICAgICAgaWYgKF9jbGlwVHlwZXMuZ2V0KG5hbWUpICE9PSBwcmV2aW91cykge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgQ2xpcEVycm9yKGBDbGlwIFwiJHtuYW1lfVwiIGFscmVhZHkgZGVmaW5lZC5gLCB7XHJcbiAgICAgICAgICAgICAgICBjb2RlOiBDbGlwRXJyb3IuYWxyZWFkeURlZmluZWRcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFNlIHJlZ2lzdHJhIHkgZGV2dWVsdmUgZWwgY29uc3RydWN0b3IgZGVsIG51ZXZvIGNsaXAuXHJcbiAgICAgICAgX2NsaXBUeXBlcy5zZXQobmFtZSwgQyk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gU2UgZGV2dWVsdmUgZWwgY29uc3RydWN0b3IgZGVsIG51ZXZvIGNsaXAuXHJcbiAgICAgICAgcmV0dXJuIEM7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ3JlYSB1bmEgbnVldmEgaW5zdGFuY2lhIGRlbCB0aXBvIGRlIGNsaXAgZXNwZWNpZmljYWRvIHBvciBub21icmUuXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBOb21icmUgZGVsIHRpcG8gZGUgY2xpcCBlc3BlY2lmaWNhZG8uXHJcbiAgICAgKiBAcGFyYW0ge0NsaXBPcHRpb25zfSBbb3B0aW9uc10gT3BjaW9uZXMgZGUgY3JlYWNpw7NuIGRlbCBjbGlwLlxyXG4gICAgICogQHJldHVybiB7Q2xpcH0gSW5zdGFuY2lhIGRlbCBjbGlwIGNyZWFkYS5cclxuICAgICAqL1xyXG4gICAgYXN5bmMgY3JlYXRlKG5hbWUsIG9wdGlvbnMgPSB7fSkge1xyXG4gICAgICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gXCJzdHJpbmdcIiB8fCAhKG5hbWUgPSBuYW1lLnRyaW0oKSkpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBjbGlwIG5hbWU6IG5vbi1lbXB0eSBzdHJpbmcgcmVxdWlyZWQuJylcclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IGNsaXAgPSBhd2FpdCBfZ2V0Q2xpcFR5cGUobmFtZSlcclxuICAgICAgICBpZiAoIWNsaXApIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IENsaXBFcnJvcihgQ2xpcCBcIiR7bmFtZX1cIiBpcyBub3QgZGVmaW5lZC5gLCB7IGNvZGU6IENsaXBFcnJvci5ub3REZWZpbmVkIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBuZXcgY2xpcChvcHRpb25zKVxyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIEluY2x1eWUgdW4gY2xpcCBvIHVuYSBwbGFudGlsbGEgZW4gZWwgZWxlbWVudG8gbyBzZWxlY3RvciBlc3BlY2lmaWNhZG8uXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBOb21icmUgZGVsIGNsaXAgbyBwbGFudGlsbGEgZXNwZWNpZmljYWRvLlxyXG4gICAgICogQHBhcmFtIHtFbGVtZW50fSB0YXJnZXQgRWxlbWVudG8gZXNwZWNpZmljYWRvLiBcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gT3BjaW9uZXMgYWRpY2lvbmFsZXMuXHJcbiAgICAgKiBAc2VlIENsaXAjY3JlYXRlXHJcbiAgICAgKiBAc2VlIENsaXAjaW5jbHVkZVxyXG4gICAgICovXHJcbiAgICBhc3luYyBpbmNsdWRlKG5hbWUsIHRhcmdldCwgb3B0aW9ucykge1xyXG4gICAgICAgIHJldHVybiAoYXdhaXQgdGhpcy5jcmVhdGUobmFtZSwgb3B0aW9ucykpLmluY2x1ZGUodGFyZ2V0LCBvcHRpb25zKTsgXHJcbiAgICB9XHJcblxyXG59XHJcblxyXG4vKipcclxuICogQ29tcHJ1ZWJhIHNpIGVsIHRpcG8gZGVsIGNsaXAgZXNwZWNpZmljYWRvIGVzdMOhIGNhcmdhZG8uIFNpIG5vIGVzdMOhIHJlZ2lzdHJhZG8gbG8gaW50ZW50YSBjYXJnYXIuXHJcbiAqIFxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBOb21icmUgZGVsIGNsaXAuXHJcbiAqIEByZXR1cm5zIHtQcm9taXNlPHR5cGVvZiBDbGlwPn0gVGlwbyBkZWwgY2xpcCBjYXJnYWRvLlxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gX2dldENsaXBUeXBlKG5hbWUpIHtcclxuICAgIGNvbnN0IHR5cGUgPSBfY2xpcFR5cGVzLmdldChuYW1lKVxyXG5cclxuICAgIGlmICh0eXBlKSB7XHJcbiAgICAgICAgcmV0dXJuIHR5cGVcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBwcm9taXNlID0gX2ltcG9ydENsaXAobmFtZSlcclxuXHJcbiAgICBfY2xpcFR5cGVzLnNldChuYW1lLCBwcm9taXNlKVxyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgICAgcmV0dXJuIGF3YWl0IHByb21pc2VcclxuXHJcbiAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgICBpZiAoX2NsaXBUeXBlcy5nZXQobmFtZSkgPT09IHByb21pc2UpIHtcclxuICAgICAgICAgICAgX2NsaXBUeXBlcy5kZWxldGUobmFtZSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRocm93IGVyclxyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogQ2FyZ2EgZWwgbWFuZWphZG9yIGRlIHVuIGNsaXAgZXNwZWNpZmljYWRvIHBvciBub21icmUuXHJcbiAqIFxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBOb21icmUgZGVsIGNsaXAuXHJcbiAqIEByZXR1cm5zIHtQcm9taXNlPHR5cGVvZiBDbGlwPn0gVGlwbyBkZWwgY2xpcCBjYXJnYWRvLlxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gX2ltcG9ydENsaXAobmFtZSkge1xyXG4gICAgLy8gVE9ETzogSW50cm9kdWNpciBhcXXDrSBwb3NpYmxlcyBtYXBlb3MgcGFyYSBidW5kbGVzLlxyXG4gICAgLypcclxuICAgICAgICBfc2V0dGluZ3MuYnVuZGxlcz8uZm9yRWFjaChidW5kbGUgPT4ge1xyXG4gICAgICAgICAgICBpZiAoYnVuZGxlLnBhdHRlcm4udGVzdChuYW1lKSkge1xyXG4gICAgICAgICAgICAgICAgbG9hZEJ1bmRsZShidW5kbGUucGF0aCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICovXHJcblxyXG4gICAgY29uc3QgZXJyb3JzID0gW11cclxuXHJcbiAgICBmb3IgKGNvbnN0IHBhdGggb2YgW1xyXG4gICAgICAgICAgICBgJHtfc2V0dGluZ3MuYmFzZVBhdGh9LyR7bmFtZX0uanNgLFxyXG4gICAgICAgICAgICBgJHtfc2V0dGluZ3MuYmFzZVBhdGh9LyR7bmFtZX0vaW5kZXguanNgXSkge1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgbGV0IHByb3RvXHJcblxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICh7IGRlZmF1bHQ6IHByb3RvIH0gPSBhd2FpdCBpbXBvcnQocGF0aCkpXHJcbiAgICAgICAgfSBjYXRjaCAoY2F1c2UpIHtcclxuICAgICAgICAgICAgZXJyb3JzLnB1c2gobmV3IENsaXBFcnJvcihgRmFpbGVkIHRvIGltcG9ydCBjbGlwIFwiJHtuYW1lfVwiIGZyb20gXCIke3BhdGh9XCIuYCwge1xyXG4gICAgICAgICAgICAgICAgY29kZTogQ2xpcEVycm9yLmxvYWRGYWlsZWQsXHJcbiAgICAgICAgICAgICAgICBjYXVzZVxyXG4gICAgICAgICAgICB9KSlcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFNpIGxhIGRlZmluaWNpw7NuIGNhcmdhZGEgbm8gZXMgdsOhbGlkYSwgbm8gc2UgaW50ZW50YSBsYSBzaWd1aWVudGUgcnV0YS5cclxuICAgICAgICBpZiAocHJvdG8gPT09IG51bGwgfHwgdHlwZW9mIHByb3RvICE9PSAnb2JqZWN0Jykge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgQ2xpcEVycm9yKGBJbnZhbGlkIGNsaXAgXCIke25hbWV9XCIgaW4gXCIke3BhdGh9XCI6IGRlZmF1bHQgZXhwb3J0IG11c3QgYmUgYW4gb2JqZWN0LmAsIHtcclxuICAgICAgICAgICAgICAgIGNvZGU6IENsaXBFcnJvci5sb2FkRmFpbGVkXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBTZSByZWdpc3RyYSB5IGRldnVlbHZlIGVsIHRpcG8gY2FyZ2Fkby5cclxuICAgICAgICByZXR1cm4gY2xpcHMuZGVmaW5lKG5hbWUsIHByb3RvKVxyXG4gICAgfVxyXG5cclxuICAgIHRocm93IG5ldyBDbGlwRXJyb3IoYEFsbCBpbXBvcnQgYXR0ZW1wdHMgZm9yIGNsaXAgXCIke25hbWV9XCIgZmFpbGVkLmAsIHtcclxuICAgICAgICBjb2RlOiBDbGlwRXJyb3IubG9hZEZhaWxlZCxcclxuICAgICAgICBjYXVzZTogZXJyb3JzXHJcbiAgICB9KVxyXG59XHJcblxyXG5cclxuLyoqXHJcbiAqIEltcG9ydHMgc3R5bGVzIGZvciB0aGUgc3BlY2lmaWVkIGNsaXAuXHJcbiAqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIENsaXAgbmFtZS5cclxuICogQHBhcmFtIHtzdHJpbmd8RnVuY3Rpb258SFRNTFN0eWxlRWxlbWVudHxDU1NTdHlsZVNoZWV0fSBbc3R5bGVzXVxyXG4gKiBTdHlsZXMgb3IgYSBzeW5jaHJvbm91cyBvciBhc3luY2hyb25vdXMgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRoZW0uXHJcbiAqIElmIG9taXR0ZWQgb3IgdW5kZWZpbmVkLCBhdHRlbXB0cyB0byBsb2FkIHRoZSBkZWZhdWx0IHN0eWxlc2hlZXQgdW5sZXNzIHN0eWxlcyBhcmUgYnVuZGxlZC5cclxuICogQHJldHVybnMge1Byb21pc2U8dm9pZD59IFJlc29sdmVzIHdoZW4gc3R5bGUgbG9hZGluZyBhbmQgaW5zZXJ0aW9uIGFyZSBjb21wbGV0ZS5cclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIF9pbXBvcnRDbGlwU3R5bGVzKG5hbWUsIHN0eWxlcykge1xyXG4gICAgLy8gTG9zIGVzdGlsb3Mgc2UgcHVlZGVuIGRlZmluaXIgY29tbyBwcm9waWVkYWQgbyBjb21vIGZ1bmNpw7NuLlxyXG4gICAgaWYgKHR5cGVvZiBzdHlsZXMgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICBzdHlsZXMgPSBhd2FpdCBzdHlsZXMoKVxyXG4gICAgfVxyXG4gICAgLy8gU2kgc2UgZGVmaW5lbiBjb21vIEhUTUxTdHlsZUVsZW1lbnQsIHNlIGHDsWFkZW4gZGlyZWN0YW1lbnRlIGFsIGhlYWQuXHJcbiAgICBpZiAoc3R5bGVzIGluc3RhbmNlb2YgSFRNTFN0eWxlRWxlbWVudCkge1xyXG4gICAgICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQoc3R5bGVzKVxyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG4gICAgLy8gU2kgc2UgZGVmaW5lbiBjb21vIENTU1N0eWxlU2hlZXQsIHNlIGHDsWFkZW4gYSBsYXMgaG9qYXMgZGUgZXN0aWxvIGFkb3B0YWRhcy5cclxuICAgIGlmIChzdHlsZXMgaW5zdGFuY2VvZiBDU1NTdHlsZVNoZWV0KSB7XHJcbiAgICAgICAgaWYgKCFkb2N1bWVudC5hZG9wdGVkU3R5bGVTaGVldHMuaW5jbHVkZXMoc3R5bGVzKSkge1xyXG4gICAgICAgICAgICBkb2N1bWVudC5hZG9wdGVkU3R5bGVTaGVldHMgPSBbLi4uZG9jdW1lbnQuYWRvcHRlZFN0eWxlU2hlZXRzLCBzdHlsZXNdXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIC8vIFNpIGVsIGNsaXAgbm8gZGVmaW5lIGVzdGlsb3MgZW4gY8OzZGlnbyB5IG5vIGVzdMOhbiBlbXBhcXVldGFkb3MsIHNlIGludGVudGEgY2FyZ2FyIGxhIGhvamEgZGUgZXN0aWxvcyBwb3IgZGVmZWN0byBcclxuICAgIC8vIHViaWNhZGEgZW4gbGEgbWlzbWEgdWJpY2FjacOzbiBxdWUgZWwgY2xpcC5cclxuICAgIGlmIChzdHlsZXMgPT0gbnVsbCAmJiAhX3NldHRpbmdzLnN0eWxlc0J1bmRsZWQpIHtcclxuICAgICAgICAvLyBUT0RPOiBNw6FzIHF1ZSB1biBmbGFnIHF1ZSBub3MgaW5kaXF1ZSBzaSBsb3MgZXN0aWxvcyBlc3TDoW4gZW1wYXF1ZXRhZG9zIG8gbm8sIGxvIHF1ZSByZWFsbWVudGUgbmVjZXNpdGFtb3MgZXMgXHJcbiAgICAgICAgLy8gdW5hIGRlZmluaWNpw7NuIGRlIGJ1bmRsZXMgY29uIGxhIGVzcGVjaWZpY2FjacOzbiBkZSBub21icmVzIG8gcGF0cm9uZXMgZGUgY2xpcHMgaW5jbHVpZG9zIGVuIGNhZGEgYnVuZGxlLCBkZSBcclxuICAgICAgICAvLyBmb3JtYSBxdWUgcG9kYW1vcyBpbnRyb2R1Y2lyIGFxdcOtIGxhIGzDs2dpY2EgZGUgY2FyZ2EgYWRlY3VhZGEuXHJcbiAgICAgICAgY29uc3QgcGF0aCA9IGAke19zZXR0aW5ncy5iYXNlUGF0aH0vJHtuYW1lfS8ke0NsaXAuZGVmYXVsdFN0eWxlc05hbWV9LmNzc2BcclxuXHJcbiAgICAgICAgbGV0IHJlc1xyXG5cclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICByZXMgPSBhd2FpdCBmZXRjaChwYXRoKVxyXG5cclxuICAgICAgICAgICAgaWYgKHJlcy5vaykge1xyXG4gICAgICAgICAgICAgICAgc3R5bGVzID0gYXdhaXQgcmVzLnRleHQoKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBDbGlwRXJyb3IoYEZhaWxlZCB0byBmZXRjaCBzdHlsZXMgZm9yIGNsaXAgXCIke25hbWV9XCIgZnJvbSBcIiR7cGF0aH1cIjogJHtlcnIubWVzc2FnZX1gLCB7XHJcbiAgICAgICAgICAgICAgICBjb2RlOiBDbGlwRXJyb3IubG9hZEZhaWxlZCxcclxuICAgICAgICAgICAgICAgIGNhdXNlOiBlcnJcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghcmVzLm9rKSB7XHJcbiAgICAgICAgICAgIGlmIChyZXMuc3RhdHVzICE9PSA0MDQgJiYgcmVzLnN0YXR1cyAhPT0gNDEwKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgQ2xpcEVycm9yKGBGYWlsZWQgdG8gbG9hZCBzdHlsZXMgZm9yIGNsaXAgXCIke25hbWV9XCIgZnJvbSBcIiR7cGF0aH1cIjogJHtyZXMuc3RhdHVzVGV4dH0gKCR7cmVzLnN0YXR1c30pYCwge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvZGU6IENsaXBFcnJvci5sb2FkRmFpbGVkXHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoX3NldHRpbmdzLmRlYnVnKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYE5vIHN0eWxlcyBmb3VuZCBmb3IgY2xpcCBcIiR7bmFtZX1cIiBhdCBcIiR7cGF0aH1cIi5gKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgIH1cclxuXHJcbiAgICBpZiAoc3R5bGVzID09IG51bGwpIHtcclxuICAgICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBpZiAodHlwZW9mIHN0eWxlcyAhPT0gJ3N0cmluZycpIHtcclxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBJbnZhbGlkIHN0eWxlcyBmb3IgY2xpcCBcIiR7bmFtZX1cIjogc3RyaW5nLCBIVE1MU3R5bGVFbGVtZW50IG9yIENTU1N0eWxlU2hlZXQgcmVxdWlyZWQuYClcclxuICAgIH1cclxuXHJcbiAgICBzdHlsZXMgPSBzdHlsZXMudHJpbSgpXHJcblxyXG4gICAgaWYgKCFzdHlsZXMpIHtcclxuICAgICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBpZiAoIV9zdHlsZUVsZW1lbnQpIHtcclxuICAgICAgICBfc3R5bGVFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcclxuICAgICAgICBfc3R5bGVFbGVtZW50LmlkID0gJ2NsaXBzLXN0eWxlcyc7XHJcbiAgICAgICAgX3N0eWxlRWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2RhdGEtc291cmNlJywgJ2NsaXBzJyk7XHJcbiAgICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChfc3R5bGVFbGVtZW50KTtcclxuICAgIH1cclxuXHJcbiAgICBfc3R5bGVFbGVtZW50LnRleHRDb250ZW50ICs9IGBcXG4vKiAke25hbWV9ICovXFxuJHtzdHlsZXN9XFxuYDtcclxufVxyXG5cclxuLy8gR2xvYmFsIHNjb3BlXHJcbmlmICh3aW5kb3cpIHtcclxuICAgIHdpbmRvdy5jbGlwcyA9IGNsaXBzXHJcbn1cclxuXHJcbi8vIEV4cG9ydHNcclxuZXhwb3J0IGRlZmF1bHQgY2xpcHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0lBQUEsTUFBTSxZQUFZLEdBQUc7SUFDckIsSUFBSSxHQUFHLEVBQUUsT0FBTztJQUNoQixJQUFJLEdBQUcsRUFBRSxNQUFNO0lBQ2YsSUFBSSxHQUFHLEVBQUUsTUFBTTtJQUNmLElBQUksR0FBRyxFQUFFLFFBQVE7SUFDakIsSUFBSSxHQUFHLEVBQUUsT0FBTztJQUNoQixDQUFDLENBQUM7QUFDRjtBQUNBLGlCQUFlO0FBQ2Y7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0EsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLEtBQUssWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3hFO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBLElBQUksT0FBTyxFQUFFLENBQUMsR0FBRyxLQUFLLEdBQUc7SUFDekIsU0FBUyxPQUFPLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQztJQUMvQixTQUFTLE9BQU8sQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDO0lBQzdCLFNBQVMsT0FBTyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUM7SUFDakMsU0FBUyxPQUFPLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQztBQUM5QjtJQUNBLENBQUM7O0lDNUJEO0FBQ0E7QUFHQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQztBQUM1QjtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0FBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQSxNQUFNLE1BQU0sR0FBRyxJQUFJLE9BQU8sR0FBRTtBQUM1QjtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQSxNQUFNLE9BQU8sR0FBRyxJQUFJLE9BQU8sR0FBRTtBQUM3QjtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBLElBQUksY0FBYTtBQUNqQjtBQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0EsTUFBTSxJQUFJLENBQUM7QUFDWDtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQSxJQUFJLE9BQU8sUUFBUSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFDcEMsUUFBUSxLQUFLLEVBQUUsT0FBTztJQUN0QixRQUFRLEdBQUcsRUFBRSxLQUFLO0lBQ2xCLFFBQVEsTUFBTSxFQUFFLFFBQVE7SUFDeEIsUUFBUSxLQUFLLEVBQUUsT0FBTztJQUN0QixRQUFRLE9BQU8sRUFBRSxTQUFTO0lBQzFCLEtBQUssQ0FBQztJQUNOO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBLElBQUksV0FBVyxDQUFDLE9BQU8sR0FBRyxFQUFFLEVBQUU7SUFDOUIsUUFBUSxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRTtJQUMxQixZQUFZLElBQUksRUFBRSxJQUFJO0lBQ3RCLFlBQVksU0FBUyxFQUFFLElBQUksR0FBRyxFQUFFO0lBQ2hDLFlBQVksV0FBVyxFQUFFLEtBQUs7SUFDOUIsWUFBWSxRQUFRLEVBQUUsQ0FBQztJQUN2QixTQUFTLEVBQUM7QUFDVjtJQUNBLFFBQVEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUM7SUFDNUIsSUFBSSxDQUFDO0FBQ0w7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQSxJQUFJLElBQUksSUFBSSxHQUFHO0lBQ2YsUUFBUSxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSTtJQUNyQyxJQUFJLENBQUM7QUFDTDtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBLElBQUksSUFBSSxRQUFRLEdBQUc7SUFDbkIsUUFBUSxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSTtJQUNwQyxJQUFJLENBQUM7QUFDTDtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBLElBQUksSUFBSSxVQUFVLEdBQUc7SUFDckIsUUFBUSxLQUFLLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRSxPQUFPLEdBQUcsT0FBTyxDQUFDLGFBQWEsRUFBRTtJQUMvRixZQUFZLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFDO0FBQzVDO0lBQ0EsWUFBWSxJQUFJLElBQUksRUFBRTtJQUN0QixnQkFBZ0IsT0FBTyxJQUFJO0lBQzNCLFlBQVksQ0FBQztJQUNiLFFBQVEsQ0FBQztBQUNUO0lBQ0EsUUFBUSxPQUFPLElBQUk7SUFDbkIsSUFBSSxDQUFDO0FBQ0w7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQSxJQUFJLElBQUksVUFBVSxHQUFHO0lBQ3JCLFFBQVEsTUFBTSxLQUFLLEdBQUcsR0FBRTtBQUN4QjtJQUNBLFFBQVEsTUFBTSxPQUFPLEdBQUcsT0FBTyxJQUFJO0lBQ25DLFlBQVksTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUM7QUFDNUM7SUFDQSxZQUFZLElBQUksSUFBSSxFQUFFO0lBQ3RCLGdCQUFnQixLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBQztJQUNoQyxnQkFBZ0IsTUFBTTtJQUN0QixZQUFZLENBQUM7QUFDYjtJQUNBLFlBQVksS0FBSyxNQUFNLEtBQUssSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFO0lBQ2xELGdCQUFnQixPQUFPLENBQUMsS0FBSyxFQUFDO0lBQzlCLFlBQVksQ0FBQztJQUNiLFFBQVEsRUFBQztBQUNUO0lBQ0EsUUFBUSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSTtBQUM5QjtJQUNBLFFBQVEsSUFBSSxJQUFJLEVBQUU7SUFDbEIsWUFBWSxLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUU7SUFDL0MsZ0JBQWdCLE9BQU8sQ0FBQyxLQUFLLEVBQUM7SUFDOUIsWUFBWSxDQUFDO0lBQ2IsUUFBUSxDQUFDO0FBQ1Q7SUFDQSxRQUFRLE9BQU8sS0FBSztJQUNwQixJQUFJLENBQUM7QUFDTDtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBLElBQUksSUFBSSxVQUFVLEdBQUc7SUFDckIsUUFBUSxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTTtJQUNyQyxJQUFJLENBQUM7QUFDTDtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBLElBQUksSUFBSSxRQUFRLEdBQUc7SUFDbkIsUUFBUSxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUTtJQUN6QyxJQUFJLENBQUM7QUFDTDtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBLElBQUksTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7QUFDdEI7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0EsSUFBSSxNQUFNLE9BQU8sQ0FBQyxNQUFNLEVBQUUsT0FBTyxHQUFHLEVBQUUsRUFBRTtJQUN4QyxRQUFRLE9BQU8sR0FBRyxFQUFFLEdBQUcsT0FBTyxHQUFFO0FBQ2hDO0lBQ0EsUUFBUSxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3hDLFFBQVEsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLGNBQWMsSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDbkU7SUFDQSxRQUFRLE9BQU8sT0FBTyxLQUFLLENBQUMsY0FBYyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUMzRSxZQUFZLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkQsSUFBSSxDQUFDO0FBQ0w7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBLElBQUksTUFBTSxNQUFNLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRTtJQUMvQjtJQUNBLFFBQVEsZUFBZSxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDO0lBQ2pFO0lBQ0EsSUFBSSxDQUFDO0FBQ0w7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBLElBQUksS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7QUFDckI7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQSxJQUFJLE1BQU0sSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7QUFDMUI7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBLElBQUksTUFBTSxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztBQUM1QjtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBLElBQUksTUFBTSxNQUFNLENBQUMsT0FBTyxFQUFFO0lBQzFCO0lBQ0EsSUFBSSxDQUFDO0FBQ0w7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0EsSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFO0lBQ25CO0lBQ0EsSUFBSSxDQUFDO0FBQ0w7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0EsSUFBSSxNQUFNLENBQUMsSUFBSSxFQUFFO0lBQ2pCO0lBQ0EsSUFBSSxDQUFDO0FBQ0w7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0EsSUFBSSxTQUFTLEdBQUc7SUFDaEI7SUFDQSxJQUFJLENBQUM7QUFDTDtJQUNBO0lBQ0E7SUFDQTtJQUNBLElBQUksTUFBTSxHQUFHO0lBQ2I7SUFDQSxJQUFJLENBQUM7QUFDTDtJQUNBO0lBQ0E7SUFDQTtJQUNBLElBQUksT0FBTyxHQUFHO0lBQ2Q7SUFDQSxJQUFJLENBQUM7QUFDTDtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0EsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRTtJQUN2QixRQUFRLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO0lBQzNELFlBQVksTUFBTSxJQUFJLFNBQVMsQ0FBQyxxREFBcUQsQ0FBQztJQUN0RixRQUFRLENBQUM7QUFDVDtJQUNBLFFBQVEsSUFBSSxPQUFPLFFBQVEsS0FBSyxVQUFVLEVBQUU7SUFDNUMsWUFBWSxNQUFNLElBQUksU0FBUyxDQUFDLGlEQUFpRCxDQUFDO0lBQ2xGLFFBQVEsQ0FBQztBQUNUO0lBQ0EsUUFBUSxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksRUFBQztBQUN2QztJQUNBLFFBQVEsSUFBSSxTQUFTLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFDO0FBQ2pEO0lBQ0EsUUFBUSxJQUFJLENBQUMsU0FBUyxFQUFFO0lBQ3hCLFlBQVksS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLFNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBRSxFQUFDO0lBQzVELFFBQVEsQ0FBQztBQUNUO0lBQ0EsUUFBUSxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBQztBQUMvQjtJQUNBLFFBQVEsT0FBTyxJQUFJO0lBQ25CLElBQUksQ0FBQztBQUNMO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQSxJQUFJLEdBQUcsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFO0lBQ3hCLFFBQVEsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7SUFDM0QsWUFBWSxNQUFNLElBQUksU0FBUyxDQUFDLHFEQUFxRCxDQUFDO0lBQ3RGLFFBQVEsQ0FBQztBQUNUO0lBQ0EsUUFBUSxJQUFJLE9BQU8sUUFBUSxLQUFLLFVBQVUsRUFBRTtJQUM1QyxZQUFZLE1BQU0sSUFBSSxTQUFTLENBQUMsaURBQWlELENBQUM7SUFDbEYsUUFBUSxDQUFDO0FBQ1Q7SUFDQSxRQUFRLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFDO0lBQ3ZDLFFBQVEsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFDO0FBQ25EO0lBQ0EsUUFBUSxJQUFJLFNBQVMsRUFBRTtJQUN2QixZQUFZLFNBQVMsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFDO0FBQ3RDO0lBQ0EsWUFBWSxJQUFJLFNBQVMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxFQUFFO0lBQ3RDLGdCQUFnQixLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUM7SUFDNUMsWUFBWSxDQUFDO0lBQ2IsUUFBUSxDQUFDO0FBQ1Q7SUFDQSxRQUFRLE9BQU8sSUFBSTtJQUNuQixJQUFJLENBQUM7QUFDTDtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFLE1BQU0sR0FBRyxLQUFLLEVBQUUsR0FBRyxFQUFFLEVBQUU7SUFDekM7SUFDQSxRQUFRLElBQUksRUFBRSxLQUFLLFlBQVksU0FBUyxDQUFDLEVBQUU7SUFDM0MsWUFBWSxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRTtJQUMzQyxnQkFBZ0IsS0FBSyxHQUFHLElBQUksU0FBUyxDQUFDLEtBQUssRUFBQztJQUM1QyxZQUFZLENBQUMsTUFBTSxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsSUFBSSxLQUFLLEtBQUssSUFBSSxJQUFJLE9BQU8sS0FBSyxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUU7SUFDdEcsZ0JBQWdCLEtBQUssR0FBRyxJQUFJLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxNQUFNLEVBQUM7SUFDL0QsWUFBWSxDQUFDLE1BQU07SUFDbkIsZ0JBQWdCLE1BQU0sSUFBSSxTQUFTO0lBQ25DLG9CQUFvQixpR0FBaUc7SUFDckgsaUJBQWlCO0lBQ2pCLFlBQVksQ0FBQztJQUNiLFFBQVEsQ0FBQztBQUNUO0lBQ0E7SUFDQSxRQUFRLElBQUksTUFBTSxLQUFLLEtBQUssSUFBSSxNQUFNLEtBQUssSUFBSSxJQUFJLE1BQU0sS0FBSyxNQUFNLEVBQUU7SUFDdEUsWUFBWSxNQUFNLElBQUksU0FBUyxDQUFDLHdEQUF3RCxDQUFDO0lBQ3pGLFFBQVEsQ0FBQztBQUNUO0lBQ0EsUUFBUSxNQUFNLFVBQVUsR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBQztBQUNsRDtJQUNBO0lBQ0EsUUFBUSxJQUFJLFVBQVUsQ0FBQyxNQUFNLEtBQUssSUFBSSxFQUFFO0lBQ3hDLFlBQVksTUFBTSxJQUFJLFNBQVMsQ0FBQyx3Q0FBd0MsQ0FBQztJQUN6RSxRQUFRLENBQUM7QUFDVDtJQUNBLFFBQVEsTUFBTSxRQUFRLEdBQUcsSUFBSSxJQUFJO0lBQ2pDO0lBQ0EsWUFBWSxJQUFJLE1BQU0sS0FBSyxNQUFNLEVBQUU7SUFDbkMsZ0JBQWdCLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRTtJQUNyRCxvQkFBb0IsUUFBUSxDQUFDLEtBQUssRUFBQztJQUNuQyxnQkFBZ0IsQ0FBQztJQUNqQixZQUFZLENBQUM7QUFDYjtJQUNBO0lBQ0EsWUFBWSxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksRUFBQztJQUMzQyxZQUFZLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUM7QUFDN0Q7SUFDQSxZQUFZLElBQUksU0FBUyxFQUFFO0lBQzNCLGdCQUFnQixNQUFNLGNBQWMsR0FBRyxVQUFVLENBQUMsY0FBYTtJQUMvRCxnQkFBZ0IsVUFBVSxDQUFDLGFBQWEsR0FBRyxLQUFJO0FBQy9DO0lBQ0EsZ0JBQWdCLElBQUk7SUFDcEIsb0JBQW9CLEtBQUssTUFBTSxRQUFRLElBQUksQ0FBQyxHQUFHLFNBQVMsQ0FBQyxFQUFFO0lBQzNELHdCQUF3QixJQUFJO0lBQzVCLDRCQUE0QixRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUM7SUFDdEQsd0JBQXdCLENBQUMsQ0FBQyxPQUFPLEdBQUcsRUFBRTtJQUN0Qyw0QkFBNEIsT0FBTyxDQUFDLEtBQUs7SUFDekMsZ0NBQWdDLENBQUMsOEJBQThCLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7SUFDMUcsZ0NBQWdDLEdBQUc7SUFDbkMsOEJBQTZCO0lBQzdCLHdCQUF3QixDQUFDO0lBQ3pCLG9CQUFvQixDQUFDO0lBQ3JCLGdCQUFnQixDQUFDLFNBQVM7SUFDMUIsb0JBQW9CLFVBQVUsQ0FBQyxhQUFhLEdBQUcsZUFBYztJQUM3RCxnQkFBZ0IsQ0FBQztJQUNqQixZQUFZLENBQUM7QUFDYjtJQUNBO0lBQ0EsWUFBWSxJQUFJLE1BQU0sS0FBSyxJQUFJLEVBQUU7SUFDakMsZ0JBQWdCLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRTtJQUNyRCxvQkFBb0IsUUFBUSxDQUFDLEtBQUssRUFBQztJQUNuQyxnQkFBZ0IsQ0FBQztJQUNqQixZQUFZLENBQUM7SUFDYixRQUFRLEVBQUM7QUFDVDtJQUNBLFFBQVEsVUFBVSxDQUFDLE1BQU0sR0FBRyxLQUFJO0FBQ2hDO0lBQ0EsUUFBUSxJQUFJO0lBQ1osWUFBWSxRQUFRLENBQUMsSUFBSSxFQUFDO0lBQzFCLFFBQVEsQ0FBQyxTQUFTO0lBQ2xCLFlBQVksVUFBVSxDQUFDLE1BQU0sR0FBRyxLQUFJO0lBQ3BDLFlBQVksVUFBVSxDQUFDLGFBQWEsR0FBRyxLQUFJO0lBQzNDLFFBQVEsQ0FBQztBQUNUO0lBQ0EsUUFBUSxPQUFPLElBQUk7SUFDbkIsSUFBSSxDQUFDO0FBQ0w7SUFDQSxDQUFDO0FBQ0Q7QUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0EsZUFBZSxRQUFRLENBQUMsTUFBTSxFQUFFLE9BQU8sR0FBRyxFQUFFLEVBQUU7SUFDOUM7SUFDQSxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssTUFBTSxDQUFDLFFBQVEsS0FBSyxJQUFJLENBQUMsWUFBWSxJQUFJLE1BQU0sQ0FBQyxRQUFRLEtBQUssSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFO0lBQ3JHLFFBQVEsTUFBTSxJQUFJLFNBQVMsQ0FBQyxnREFBZ0QsQ0FBQztJQUM3RSxJQUFJLENBQUM7QUFDTDtJQUNBO0lBQ0EsSUFBSSxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBRztJQUMxRCxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUU7SUFDMUQsUUFBUSxNQUFNLElBQUksVUFBVSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RFLElBQUksQ0FBQztJQUNMLElBQUksT0FBTyxPQUFPLENBQUMsU0FBUTtBQUMzQjtJQUNBO0lBQ0EsSUFBSSxJQUFJLE1BQU0sQ0FBQyxRQUFRLEtBQUssSUFBSSxDQUFDLFlBQVksS0FBSyxRQUFRLEtBQUssSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLElBQUksUUFBUSxLQUFLLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUU7SUFDdkgsUUFBUSxNQUFNLElBQUksU0FBUyxDQUFDLDREQUE0RCxDQUFDO0lBQ3pGLElBQUksQ0FBQztBQUNMO0lBQ0E7SUFDQSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUU7SUFDckgsUUFBUSxNQUFNLElBQUksU0FBUyxDQUFDLENBQUMsc0RBQXNELEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ2xHLElBQUksQ0FBQztBQUNMO0lBQ0E7SUFDQSxJQUFJLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFDO0FBQ25DO0lBQ0E7SUFDQSxJQUFJLElBQUksSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxHQUFHLE1BQUs7SUFDeEMsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFO0lBQ2YsUUFBUSxNQUFNLEdBQUcsR0FBRyxJQUFJLGFBQWEsQ0FBQyxJQUFJLEVBQUM7SUFDM0M7SUFDQSxRQUFRLElBQUksT0FBTTtJQUNsQixRQUFRLElBQUk7SUFDWixZQUFZLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBQztJQUNwRCxRQUFRLENBQUMsQ0FBQyxPQUFPLEtBQUssRUFBRTtJQUN4QixZQUFZLE1BQU0sSUFBSSxTQUFTLENBQUMsQ0FBQyx1QkFBdUIsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUN4RixRQUFRLENBQUM7QUFDVDtJQUNBLFFBQVEsSUFBSSxNQUFNLElBQUksSUFBSSxFQUFFO0lBQzVCLFlBQVksTUFBTSxJQUFJLFNBQVMsQ0FBQyxDQUFDLGdDQUFnQyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDckYsUUFBUSxDQUFDO0FBQ1Q7SUFDQSxRQUFRLElBQUksTUFBTSxDQUFDLFFBQVEsS0FBSyxJQUFJLENBQUMsWUFBWSxFQUFFO0lBQ25ELFlBQVksSUFBSSxHQUFHLE1BQU0sQ0FBQztJQUMxQixRQUFRLENBQUMsTUFBTTtJQUNmLFlBQVksSUFBSSxPQUFPLE1BQU0sS0FBSyxRQUFRLEVBQUU7SUFDNUMsZ0JBQWdCLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFDO0lBQ2pDLGdCQUFnQixNQUFNLEdBQUcsTUFBTSxHQUFHLENBQUMsT0FBTyxHQUFFO0lBQzVDLFlBQVksQ0FBQztBQUNiO0lBQ0EsWUFBWSxJQUFJLE1BQU0sQ0FBQyxRQUFRLEtBQUssSUFBSSxDQUFDLHNCQUFzQixFQUFFO0lBQ2pFLGdCQUFnQixLQUFLLE1BQU0sSUFBSSxJQUFJLE1BQU0sQ0FBQyxVQUFVLEVBQUU7SUFDdEQsb0JBQW9CLElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxJQUFJLENBQUMsWUFBWSxFQUFFO0lBQzdELHdCQUF3QixJQUFJLElBQUksRUFBRTtJQUNsQyw0QkFBNEIsTUFBTSxJQUFJLFNBQVMsQ0FBQyx5Q0FBeUMsQ0FBQztJQUMxRix3QkFBd0IsQ0FBQztJQUN6Qix3QkFBd0IsSUFBSSxHQUFHLEtBQUk7SUFDbkMsb0JBQW9CLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssSUFBSSxDQUFDLFNBQVMsRUFBRTtJQUNqRSx3QkFBd0IsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7SUFDekQsNEJBQTRCLE1BQU0sSUFBSSxTQUFTLENBQUMsK0NBQStDLENBQUM7SUFDaEcsd0JBQXdCLENBQUM7SUFDekIsb0JBQW9CLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssSUFBSSxDQUFDLFlBQVksRUFBRTtJQUNwRSx3QkFBd0IsTUFBTSxJQUFJLFNBQVMsQ0FBQyxDQUFDLHVCQUF1QixFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsMkJBQTJCLENBQUMsQ0FBQztJQUNqSCxvQkFBb0IsQ0FBQztJQUNyQixnQkFBZ0IsQ0FBQztJQUNqQixZQUFZLENBQUM7SUFDYixRQUFRLENBQUM7QUFDVDtJQUNBLFFBQVEsSUFBSSxDQUFDLElBQUksRUFBRTtJQUNuQixZQUFZLE1BQU0sSUFBSSxTQUFTLENBQUMsc0RBQXNEO0lBQ3RGLGdCQUFnQixxRUFBcUUsQ0FBQztJQUN0RixRQUFRLENBQUM7QUFDVDtJQUNBO0lBQ0EsUUFBUSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksRUFBQztJQUNyQyxRQUFRLElBQUksSUFBSSxJQUFJLElBQUksS0FBSyxJQUFJLEVBQUU7SUFDbkMsWUFBWSxNQUFNLElBQUksU0FBUyxDQUFDLDRDQUE0QyxDQUFDO0lBQzdFLFFBQVEsQ0FBQztBQUNUO0lBQ0E7SUFDQSxRQUFRLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUM7QUFDckQ7SUFDQTtJQUNBLFFBQVEsS0FBSyxHQUFHLEtBQUk7SUFDcEIsSUFBSSxDQUFDO0FBQ0w7SUFDQTtJQUNBLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRTtJQUNySCxRQUFRLE1BQU0sSUFBSSxTQUFTLENBQUMsb0VBQW9FLENBQUM7SUFDakcsSUFBSSxDQUFDO0FBQ0w7SUFDQTtJQUNBLElBQUksSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFO0lBQy9CLFFBQVEsTUFBTSxJQUFJLFNBQVMsQ0FBQyw4REFBOEQsQ0FBQztJQUMzRixJQUFJLENBQUM7QUFDTDtJQUNBLElBQUksSUFBSSxLQUFLLEVBQUU7SUFDZjtJQUNBLFFBQVEsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFDO0FBQzlCO0lBQ0E7SUFDQSxRQUFRLEtBQUssQ0FBQyxJQUFJLEdBQUcsS0FBSTtBQUN6QjtJQUNBO0lBQ0E7SUFDQSxRQUFRLE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRTtJQUM5QyxZQUFZLEtBQUssRUFBRSxJQUFJO0lBQ3ZCLFlBQVksWUFBWSxFQUFFLElBQUk7SUFDOUIsU0FBUyxFQUFDO0lBQ1YsSUFBSSxDQUFDO0FBQ0w7SUFDQTtJQUNBLElBQUksTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFlBQVc7QUFDekM7SUFDQTtJQUNBLElBQUksTUFBTSxZQUFZLEdBQUc7SUFDekIsUUFBUSxNQUFNLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxFQUFFO0lBQzlCLE1BQUs7QUFDTDtJQUNBO0lBQ0EsSUFBSSxRQUFRLFFBQVE7SUFDcEIsUUFBUSxLQUFLLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSztJQUNoQyxZQUFZLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFDO0lBQzlCLFlBQVksS0FBSztBQUNqQjtJQUNBLFFBQVEsS0FBSyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU07SUFDakMsWUFBWSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksRUFBQztJQUMvQixZQUFZLEtBQUs7QUFDakI7SUFDQSxRQUFRLEtBQUssSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPO0lBQ2xDLFlBQVksTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLFlBQVc7QUFDaEQ7SUFDQSxZQUFZLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRTtJQUN2QyxnQkFBZ0IsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUM7SUFDbkMsZ0JBQWdCLE1BQU0sQ0FBQyxNQUFNLEdBQUU7SUFDL0IsWUFBWSxDQUFDLE1BQU07SUFDbkIsZ0JBQWdCLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFDO0lBQ3hDLFlBQVksQ0FBQztBQUNiO0lBQ0EsWUFBWSxJQUFJLFNBQVMsRUFBRTtJQUMzQixnQkFBZ0IsTUFBTSxPQUFPLEdBQUcsT0FBTyxJQUFJO0lBQzNDLG9CQUFvQixLQUFLLE1BQU0sS0FBSyxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUU7SUFDL0Qsd0JBQXdCLE9BQU8sQ0FBQyxLQUFLLEVBQUM7SUFDdEMsb0JBQW9CLENBQUM7SUFDckI7SUFDQSxvQkFBb0IsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUM7SUFDcEQsb0JBQW9CLElBQUksSUFBSSxFQUFFO0lBQzlCLHdCQUF3QixZQUFZLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUM7SUFDdEQsb0JBQW9CLENBQUM7SUFDckIsZ0JBQWdCLEVBQUM7QUFDakI7SUFDQSxnQkFBZ0IsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ2hDLFlBQVksQ0FBQztJQUNiLFlBQVksS0FBSztBQUNqQjtJQUNBLFFBQVEsS0FBSyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUs7SUFDaEMsWUFBWSxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksRUFBQztJQUNoQyxZQUFZLEtBQUs7QUFDakI7SUFDQSxRQUFRLEtBQUssSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHO0lBQzlCLFlBQVksTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUM7SUFDL0IsWUFBWSxLQUFLO0lBQ2pCLEtBQUs7QUFDTDtJQUNBO0lBQ0EsSUFBSSxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsWUFBVztJQUN4QyxJQUFJLElBQUksV0FBVyxLQUFLLFlBQVksRUFBRTtJQUN0QyxRQUFRLE1BQU0sT0FBTyxHQUFHLE9BQU8sSUFBSTtJQUNuQyxZQUFZLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFDO0FBQzVDO0lBQ0EsWUFBWSxJQUFJLElBQUksSUFBSSxXQUFXLEVBQUU7SUFDckMsZ0JBQWdCLFlBQVksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQy9DLFlBQVksQ0FBQztBQUNiO0lBQ0EsWUFBWSxLQUFLLE1BQU0sS0FBSyxJQUFJLE9BQU8sQ0FBQyxRQUFRLEVBQUU7SUFDbEQsZ0JBQWdCLE9BQU8sQ0FBQyxLQUFLLEVBQUM7SUFDOUIsWUFBWSxDQUFDO0FBQ2I7SUFDQSxZQUFZLElBQUksSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFO0lBQ3RDLGdCQUFnQixZQUFZLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMvQyxZQUFZLENBQUM7SUFDYixRQUFRLEVBQUM7QUFDVDtJQUNBLFFBQVEsT0FBTyxDQUFDLElBQUksRUFBQztJQUNyQixJQUFJLENBQUM7QUFDTDtJQUNBO0lBQ0EsSUFBSSxLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUU7SUFDbkQsUUFBUSxLQUFLLE1BQU0sSUFBSSxJQUFJLFlBQVksQ0FBQyxLQUFLLENBQUMsRUFBRTtJQUNoRDtJQUNBLFlBQVksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM3QixRQUFRLENBQUM7SUFDVCxJQUFJLENBQUM7QUFDTDtJQUNBO0lBQ0EsSUFBSSxJQUFJO0lBQ1IsUUFBUSxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxHQUFHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFDO0lBQzlELElBQUksQ0FBQyxDQUFDLE9BQU8sR0FBRyxFQUFFO0lBQ2xCLFFBQVEsTUFBTSxJQUFJLFNBQVMsQ0FBQyxDQUFDLHNCQUFzQixFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUM7SUFDdkYsSUFBSSxDQUFDO0FBQ0w7SUFDQTtJQUNBLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUU7SUFDNUIsUUFBUSxLQUFLLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztBQUNqQztJQUNBLFFBQVEsS0FBSyxDQUFDLFlBQVk7SUFDMUIsWUFBWSxJQUFJLEtBQUk7SUFDcEIsWUFBWSxJQUFJO0lBQ2hCLGdCQUFnQixJQUFJLEdBQUcsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxPQUFPLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFDO0lBQ3JFLGdCQUFnQixLQUFLLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUU7SUFDM0MsWUFBWSxDQUFDLENBQUMsT0FBTyxLQUFLLEVBQUU7SUFDNUIsZ0JBQWdCLE1BQU0sSUFBSSxTQUFTLENBQUMsQ0FBQyw4QkFBOEIsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUM7SUFDbEcsWUFBWSxDQUFDO0FBQ2I7SUFDQSxZQUFZLElBQUk7SUFDaEIsZ0JBQWdCLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEdBQUcsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUM7SUFDdEUsWUFBWSxDQUFDLENBQUMsT0FBTyxLQUFLLEVBQUU7SUFDNUIsZ0JBQWdCLE1BQU0sSUFBSSxTQUFTLENBQUMsQ0FBQyx1QkFBdUIsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUM7SUFDM0YsWUFBWSxDQUFDO0lBQ2IsUUFBUSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJO0lBQzFCLFlBQVksT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMvQixRQUFRLENBQUMsRUFBQztJQUNWLElBQUksQ0FBQztJQUNMO0lBQ0E7SUFDQSxJQUFJLE9BQU8sSUFBSTtJQUNmLENBQUM7QUFDRDtBQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBLE1BQU0sWUFBWSxHQUFHLElBQUksT0FBTyxHQUFFO0FBQ2xDO0lBQ0E7SUFDQTtJQUNBO0lBQ0EsTUFBTSxTQUFTLENBQUM7QUFDaEI7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQSxJQUFJLFdBQVcsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFO0lBQzlCLFFBQVEsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7SUFDM0QsWUFBWSxNQUFNLElBQUksU0FBUyxDQUFDLHFEQUFxRCxDQUFDO0lBQ3RGLFFBQVEsQ0FBQztBQUNUO0lBQ0EsUUFBUSxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRTtJQUMvQixZQUFZLE1BQU0sRUFBRSxJQUFJO0lBQ3hCLFlBQVksYUFBYSxFQUFFLElBQUk7SUFDL0IsU0FBUyxFQUFDO0FBQ1Y7SUFDQSxRQUFRLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUU7SUFDdEMsWUFBWSxJQUFJLEVBQUU7SUFDbEIsZ0JBQWdCLEtBQUssRUFBRSxJQUFJO0lBQzNCLGdCQUFnQixVQUFVLEVBQUUsSUFBSTtJQUNoQyxhQUFhO0lBQ2IsWUFBWSxNQUFNLEVBQUU7SUFDcEIsZ0JBQWdCLEtBQUssRUFBRSxNQUFNO0lBQzdCLGdCQUFnQixVQUFVLEVBQUUsSUFBSTtJQUNoQyxhQUFhO0lBQ2IsU0FBUyxFQUFDO0lBQ1YsSUFBSSxDQUFDO0FBQ0w7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQSxJQUFJLElBQUksTUFBTSxHQUFHO0lBQ2pCLFFBQVEsT0FBTyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU07SUFDNUMsSUFBSSxDQUFDO0FBQ0w7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQSxJQUFJLElBQUksYUFBYSxHQUFHO0lBQ3hCLFFBQVEsT0FBTyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLGFBQWE7SUFDbkQsSUFBSSxDQUFDO0FBQ0w7SUFDQSxDQUFDO0FBQ0Q7QUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0EsTUFBTSxTQUFTLFNBQVMsS0FBSyxDQUFDO0FBQzlCO0lBQ0E7SUFDQSxJQUFJLE9BQU8sY0FBYyxLQUFLLGlCQUFpQjtJQUMvQyxJQUFJLE9BQU8sWUFBWSxPQUFPLGVBQWU7SUFDN0MsSUFBSSxPQUFPLFVBQVUsU0FBUyxhQUFhO0lBQzNDLElBQUksT0FBTyxVQUFVLFNBQVMsYUFBYTtJQUMzQyxJQUFJLE9BQU8sUUFBUSxXQUFXLFdBQVc7QUFDekM7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0EsSUFBSSxXQUFXLENBQUMsT0FBTyxFQUFFLEVBQUUsSUFBSSxHQUFHLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEVBQUU7SUFDdEQsUUFBUSxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssS0FBSyxTQUFTLEdBQUcsRUFBRSxLQUFLLEVBQUUsR0FBRyxTQUFTLEVBQUM7QUFDM0U7SUFDQSxRQUFRLElBQUksQ0FBQyxJQUFJLEdBQUcsWUFBVztJQUMvQixRQUFRLElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSTtBQUN4QjtJQUNBLFFBQVEsSUFBSSxLQUFLLENBQUMsaUJBQWlCLEVBQUU7SUFDckMsWUFBWSxLQUFLLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBQztJQUNwRCxRQUFRLENBQUM7SUFDVCxJQUFJLENBQUM7SUFDTCxDQUFDO0FBQ0Q7QUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQSxNQUFNLGFBQWEsQ0FBQztBQUNwQjtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQSxJQUFJLElBQUksR0FBRyxFQUFFO0FBQ2I7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0EsSUFBSSxLQUFLLEdBQUcsSUFBSTtBQUNoQjtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQSxJQUFJLFNBQVMsR0FBRyxFQUFFO0FBQ2xCO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBLElBQUksZUFBZSxHQUFHLEtBQUs7QUFDM0I7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0EsSUFBSSxXQUFXLENBQUMsSUFBSSxFQUFFO0lBQ3RCLFFBQVEsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFJO0lBQ3pCLElBQUksQ0FBQztBQUNMO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBLElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUU7SUFDM0IsUUFBUSxJQUFJLENBQUMsd0JBQXdCLEdBQUU7QUFDdkM7SUFDQSxRQUFRLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTTtJQUMzQyxRQUFRLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxFQUFDO0FBQzlDO0lBQ0EsUUFBUSxPQUFPLENBQUMsZUFBZSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUM7SUFDNUMsSUFBSSxDQUFDO0FBQ0w7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQSxJQUFJLEtBQUssQ0FBQyxLQUFLLEVBQUUsR0FBRyxHQUFHLEtBQUssRUFBRTtJQUM5QixRQUFRLElBQUksQ0FBQyx3QkFBd0IsR0FBRTtBQUN2QztJQUNBLFFBQVEsS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLLEVBQUM7SUFDN0IsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxLQUFLLEVBQUM7SUFDeEQsSUFBSSxDQUFDO0lBQ0w7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0EsSUFBSSxNQUFNLE9BQU8sR0FBRztJQUNwQixRQUFRLElBQUksSUFBSSxDQUFDLGVBQWUsRUFBRTtJQUNsQyxZQUFZLE1BQU0sSUFBSSxTQUFTLENBQUMsZ0RBQWdELENBQUM7SUFDakYsUUFBUSxDQUFDO0FBQ1Q7SUFDQSxRQUFRLElBQUksQ0FBQyxlQUFlLEdBQUcsS0FBSTtBQUNuQztJQUNBLFFBQVEsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxVQUFVLEVBQUM7SUFDM0QsUUFBUSxRQUFRLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBQztBQUMvQztJQUNBLFFBQVEsTUFBTSxLQUFLLEdBQUcsSUFBSSxHQUFHLEdBQUU7QUFDL0I7SUFDQSxRQUFRLE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxZQUFZLEVBQUM7QUFDM0Y7SUFDQSxRQUFRLE9BQU8sTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFO0lBQ2xDLFlBQVksTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLFlBQVc7SUFDM0MsWUFBWSxNQUFNLEtBQUssR0FBRyw4QkFBOEIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBQztBQUN4RTtJQUNBLFlBQVksSUFBSSxDQUFDLEtBQUssRUFBRTtJQUN4QixnQkFBZ0IsUUFBUTtJQUN4QixZQUFZLENBQUM7QUFDYjtJQUNBLFlBQVksTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQztBQUMxQztJQUNBLFlBQVksSUFBSSxLQUFLLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLElBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRTtJQUNwRSxnQkFBZ0IsTUFBTSxJQUFJLFNBQVMsQ0FBQyxDQUFDLHNCQUFzQixFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3pFLFlBQVksQ0FBQztBQUNiO0lBQ0EsWUFBWSxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUM7SUFDbEMsUUFBUSxDQUFDO0FBQ1Q7SUFDQSxRQUFRLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRTtJQUNsRCxZQUFZLE1BQU0sSUFBSSxTQUFTLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDL0YsUUFBUSxDQUFDO0FBQ1Q7SUFDQSxRQUFRLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtJQUN4RCxZQUFZLE1BQU0sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUM7QUFDdkQ7SUFDQSxZQUFZLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsRUFBRTtJQUM5QyxnQkFBZ0IsTUFBTSxJQUFJLEdBQUcsTUFBTSxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxFQUFFLE9BQU8sRUFBQztBQUM1RjtJQUNBLGdCQUFnQixNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEdBQUcsT0FBTyxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxFQUFDO0lBQ2pHLFlBQVksQ0FBQyxNQUFNO0lBQ25CLGdCQUFnQixNQUFNLFFBQVEsR0FBRyxNQUFNLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFDO0FBQzlFO0lBQ0EsZ0JBQWdCLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBQztJQUNsRCxZQUFZLENBQUM7SUFDYixRQUFRLENBQUM7QUFDVDtJQUNBLFFBQVEsT0FBTyxRQUFRLENBQUMsT0FBTztJQUMvQixJQUFJLENBQUM7QUFDTDtJQUNBLElBQUksd0JBQXdCLEdBQUc7SUFDL0IsUUFBUSxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUU7SUFDbEMsWUFBWSxNQUFNLElBQUksU0FBUyxDQUFDLDhEQUE4RCxDQUFDO0lBQy9GLFFBQVEsQ0FBQztJQUNULElBQUksQ0FBQztBQUNMO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0EsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRTtJQUMxQixRQUFRLE1BQU0sR0FBRyxHQUFHLEdBQUU7SUFDdEI7SUFDQSxRQUFRLElBQUksS0FBSyxHQUFHLEVBQUM7SUFDckIsUUFBUSxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssSUFBSSxFQUFFLEVBQUU7SUFDeEMsWUFBWSxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFDO0FBQ2xFO0lBQ0EsWUFBWSxJQUFJLEtBQUssSUFBSSxJQUFJLEVBQUU7SUFDL0IsZ0JBQWdCLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFDO0lBQy9CLFlBQVksQ0FBQztJQUNiLFFBQVEsQ0FBQztBQUNUO0lBQ0EsUUFBUSxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO0lBQzNCLElBQUksQ0FBQztBQUNMO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0EsSUFBSSxNQUFNLENBQUMsS0FBSyxFQUFFO0lBQ2xCLFFBQVEsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztJQUNqQyxJQUFJLENBQUM7QUFDTDtJQUNBLENBQUM7QUFDRDtBQUNBO0lBQ0E7SUFDQTtBQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBLE1BQU0sZUFBZSxHQUFHLHVDQUF1QyxDQUFDO0FBQ2hFO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQSxNQUFNLGtCQUFrQixHQUFHLEdBQUcsQ0FBQztBQUMvQjtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBLE1BQU0sU0FBUyxHQUFHO0FBQ2xCO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBLElBQUksS0FBSyxFQUFFLEtBQUs7QUFDaEI7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0EsSUFBSSxRQUFRLEVBQUUsUUFBUTtBQUN0QjtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQSxJQUFJLGFBQWEsRUFBRSxLQUFLO0FBQ3hCO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBLElBQUksZ0JBQWdCLEVBQUUsS0FBSztJQUMzQixFQUFDO0FBQ0Q7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQSxNQUFNLFVBQVUsR0FBRyxJQUFJLEdBQUcsR0FBRTtBQUM1QjtBQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtBQUNLLFVBQUMsS0FBSyxHQUFHO0FBQ2Q7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0EsSUFBSSxLQUFLLENBQUMsUUFBUSxFQUFFO0lBQ3BCLFFBQVEsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDM0MsSUFBSSxDQUFDO0lBQ0w7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBLElBQUksTUFBTSxNQUFNLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRTtJQUM5QjtJQUNBLFFBQVEsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUU7SUFDdEMsWUFBWSxNQUFNLElBQUksU0FBUyxDQUFDLHFDQUFxQyxDQUFDO0lBQ3RFLFFBQVEsQ0FBQztBQUNUO0lBQ0EsUUFBUSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRTtBQUMxQjtJQUNBLFFBQVEsSUFBSSxDQUFDLElBQUksRUFBRTtJQUNuQixZQUFZLE1BQU0sSUFBSSxTQUFTLENBQUMsa0NBQWtDLENBQUM7SUFDbkUsUUFBUSxDQUFDO0FBQ1Q7SUFDQSxRQUFRLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxrQkFBa0IsRUFBRTtJQUM5QyxZQUFZLE1BQU0sSUFBSSxVQUFVLENBQUMsQ0FBQyw2QkFBNkIsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxrQkFBa0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUN6RyxRQUFRLENBQUM7QUFDVDtJQUNBLFFBQVEsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7SUFDekMsWUFBWSxNQUFNLElBQUksU0FBUyxDQUFDLGlGQUFpRixDQUFDO0lBQ2xILFFBQVEsQ0FBQztBQUNUO0lBQ0E7SUFDQSxRQUFRLE1BQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFDO0FBQzdDO0lBQ0EsUUFBUSxJQUFJLFFBQVEsRUFBRSxTQUFTLFlBQVksSUFBSSxFQUFFO0lBQ2pELFlBQVksTUFBTSxJQUFJLFNBQVMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsRUFBRTtJQUNuRSxnQkFBZ0IsSUFBSSxFQUFFLFNBQVMsQ0FBQyxjQUFjO0lBQzlDLGFBQWEsQ0FBQztJQUNkLFFBQVEsQ0FBQztBQUNUO0lBQ0E7SUFDQSxRQUFRLElBQUksS0FBSyxLQUFLLElBQUksSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLEVBQUU7SUFDekQsWUFBWSxNQUFNLElBQUksU0FBUyxDQUFDLHFDQUFxQyxDQUFDO0lBQ3RFLFFBQVEsQ0FBQztBQUNUO0lBQ0E7SUFDQSxRQUFRLElBQUksUUFBUSxHQUFHLEtBQUk7QUFDM0I7SUFDQSxRQUFRLElBQUksS0FBSyxDQUFDLE9BQU8sSUFBSSxJQUFJLEVBQUU7SUFDbkMsWUFBWSxJQUFJLEdBQUcsR0FBRyxLQUFLLENBQUMsUUFBTztBQUNuQztJQUNBLFlBQVksSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLEVBQUU7SUFDekMsZ0JBQWdCLE1BQU0sSUFBSSxTQUFTLENBQUMsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO0lBQ3hFLFlBQVksQ0FBQztBQUNiO0lBQ0EsWUFBWSxHQUFHLEdBQUcsR0FBRyxDQUFDLElBQUksR0FBRTtBQUM1QjtJQUNBLFlBQVksSUFBSSxDQUFDLEdBQUcsRUFBRTtJQUN0QixnQkFBZ0IsTUFBTSxJQUFJLFNBQVMsQ0FBQyxDQUFDLDhCQUE4QixDQUFDLENBQUM7SUFDckUsWUFBWSxDQUFDO0FBQ2I7SUFDQSxZQUFZLElBQUksR0FBRyxLQUFLLElBQUksRUFBRTtJQUM5QixnQkFBZ0IsTUFBTSxJQUFJLFNBQVMsQ0FBQywrQ0FBK0MsQ0FBQztJQUNwRixZQUFZLENBQUM7QUFDYjtJQUNBLFlBQVksUUFBUSxHQUFHLE1BQU0sWUFBWSxDQUFDLEdBQUcsRUFBQztBQUM5QztJQUNBLFlBQVksSUFBSSxDQUFDLFFBQVEsRUFBRTtJQUMzQixnQkFBZ0IsTUFBTSxJQUFJLFNBQVMsQ0FBQyxDQUFDLHVCQUF1QixFQUFFLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUM7SUFDbEgsWUFBWSxDQUFDO0lBQ2IsUUFBUSxDQUFDO0FBQ1Q7SUFDQTtJQUNBLFFBQVEsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUM7QUFDbkQ7SUFDQSxRQUFRLElBQUksTUFBTSxLQUFLLE1BQU0sQ0FBQyxTQUFTLElBQUksTUFBTSxLQUFLLFFBQVEsQ0FBQyxTQUFTLEVBQUU7SUFDMUUsWUFBWSxNQUFNLElBQUksU0FBUyxDQUFDLHVGQUF1RixDQUFDO0lBQ3hILFFBQVEsQ0FBQztBQUNUO0lBQ0E7SUFDQSxRQUFRLE1BQU0sQ0FBQyxHQUFHLGNBQWMsUUFBUSxDQUFDLEdBQUU7QUFDM0M7SUFDQTtJQUNBLFFBQVEsTUFBTSxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLFNBQVMsRUFBQztBQUN4RDtJQUNBO0lBQ0EsUUFBUSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMseUJBQXlCLENBQUMsS0FBSyxFQUFDO0lBQzVELFFBQVEsT0FBTyxJQUFJLENBQUMsWUFBVztJQUMvQixRQUFRLE9BQU8sSUFBSSxDQUFDLFFBQU87SUFDM0IsUUFBUSxPQUFPLElBQUksQ0FBQyxPQUFNO0FBQzFCO0lBQ0E7SUFDQSxRQUFRLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLElBQUksRUFBQztBQUNsRDtJQUNBO0lBQ0EsUUFBUSxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUU7SUFDekMsWUFBWSxLQUFLLEVBQUUsSUFBSTtJQUN2QixZQUFZLFlBQVksRUFBRSxJQUFJO0lBQzlCLFNBQVMsRUFBQztBQUNWO0lBQ0E7SUFDQSxRQUFRLE1BQU0saUJBQWlCLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNwRDtJQUNBO0lBQ0EsUUFBUSxJQUFJLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssUUFBUSxFQUFFO0lBQy9DLFlBQVksTUFBTSxJQUFJLFNBQVMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsRUFBRTtJQUNuRSxnQkFBZ0IsSUFBSSxFQUFFLFNBQVMsQ0FBQyxjQUFjO0lBQzlDLGFBQWEsQ0FBQztJQUNkLFFBQVEsQ0FBQztBQUNUO0lBQ0E7SUFDQSxRQUFRLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2hDO0lBQ0E7SUFDQSxRQUFRLE9BQU8sQ0FBQyxDQUFDO0lBQ2pCLElBQUksQ0FBQztBQUNMO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0EsSUFBSSxNQUFNLE1BQU0sQ0FBQyxJQUFJLEVBQUUsT0FBTyxHQUFHLEVBQUUsRUFBRTtJQUNyQyxRQUFRLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxJQUFJLEVBQUUsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFO0lBQy9ELFlBQVksTUFBTSxJQUFJLFNBQVMsQ0FBQywrQ0FBK0MsQ0FBQztJQUNoRixRQUFRLENBQUM7SUFDVCxRQUFRLElBQUksSUFBSSxHQUFHLE1BQU0sWUFBWSxDQUFDLElBQUksRUFBQztJQUMzQyxRQUFRLElBQUksQ0FBQyxJQUFJLEVBQUU7SUFDbkIsWUFBWSxNQUFNLElBQUksU0FBUyxDQUFDLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztJQUNqRyxRQUFRLENBQUM7SUFDVCxRQUFRLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDO0lBQ2hDLElBQUksQ0FBQztBQUNMO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBLElBQUksTUFBTSxPQUFPLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUU7SUFDekMsUUFBUSxPQUFPLENBQUMsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsRUFBRSxPQUFPLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQzNFLElBQUksQ0FBQztBQUNMO0lBQ0EsRUFBQztBQUNEO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQSxlQUFlLFlBQVksQ0FBQyxJQUFJLEVBQUU7SUFDbEMsSUFBSSxNQUFNLElBQUksR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksRUFBQztBQUNyQztJQUNBLElBQUksSUFBSSxJQUFJLEVBQUU7SUFDZCxRQUFRLE9BQU8sSUFBSTtJQUNuQixJQUFJLENBQUM7QUFDTDtJQUNBLElBQUksTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLElBQUksRUFBQztBQUNyQztJQUNBLElBQUksVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFDO0FBQ2pDO0lBQ0EsSUFBSSxJQUFJO0lBQ1IsUUFBUSxPQUFPLE1BQU0sT0FBTztBQUM1QjtJQUNBLElBQUksQ0FBQyxDQUFDLE9BQU8sR0FBRyxFQUFFO0lBQ2xCLFFBQVEsSUFBSSxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLE9BQU8sRUFBRTtJQUM5QyxZQUFZLFVBQVUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFDO0lBQ25DLFFBQVEsQ0FBQztBQUNUO0lBQ0EsUUFBUSxNQUFNLEdBQUc7SUFDakIsSUFBSSxDQUFDO0lBQ0wsQ0FBQztBQUNEO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQSxlQUFlLFdBQVcsQ0FBQyxJQUFJLEVBQUU7SUFDakM7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtBQUNBO0lBQ0EsSUFBSSxNQUFNLE1BQU0sR0FBRyxHQUFFO0FBQ3JCO0lBQ0EsSUFBSSxLQUFLLE1BQU0sSUFBSSxJQUFJO0lBQ3ZCLFlBQVksQ0FBQyxFQUFFLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUM7SUFDOUMsWUFBWSxDQUFDLEVBQUUsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUU7SUFDdkQ7SUFDQSxRQUFRLElBQUksTUFBSztBQUNqQjtJQUNBLFFBQVEsSUFBSTtJQUNaLFlBQVksQ0FBQyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsR0FBRyxNQUFNLE9BQU8sSUFBSSxDQUFDLEVBQUM7SUFDckQsUUFBUSxDQUFDLENBQUMsT0FBTyxLQUFLLEVBQUU7SUFDeEIsWUFBWSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsdUJBQXVCLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUU7SUFDekYsZ0JBQWdCLElBQUksRUFBRSxTQUFTLENBQUMsVUFBVTtJQUMxQyxnQkFBZ0IsS0FBSztJQUNyQixhQUFhLENBQUMsRUFBQztJQUNmLFlBQVksUUFBUTtJQUNwQixRQUFRLENBQUM7QUFDVDtJQUNBO0lBQ0EsUUFBUSxJQUFJLEtBQUssS0FBSyxJQUFJLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFO0lBQ3pELFlBQVksTUFBTSxJQUFJLFNBQVMsQ0FBQyxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFO0lBQzFHLGdCQUFnQixJQUFJLEVBQUUsU0FBUyxDQUFDLFVBQVU7SUFDMUMsYUFBYSxDQUFDO0lBQ2QsUUFBUSxDQUFDO0FBQ1Q7SUFDQTtJQUNBLFFBQVEsT0FBTyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUM7SUFDeEMsSUFBSSxDQUFDO0FBQ0w7SUFDQSxJQUFJLE1BQU0sSUFBSSxTQUFTLENBQUMsQ0FBQyw4QkFBOEIsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUU7SUFDMUUsUUFBUSxJQUFJLEVBQUUsU0FBUyxDQUFDLFVBQVU7SUFDbEMsUUFBUSxLQUFLLEVBQUUsTUFBTTtJQUNyQixLQUFLLENBQUM7SUFDTixDQUFDO0FBQ0Q7QUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0EsZUFBZSxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFO0lBQy9DO0lBQ0EsSUFBSSxJQUFJLE9BQU8sTUFBTSxLQUFLLFVBQVUsRUFBRTtJQUN0QyxRQUFRLE1BQU0sR0FBRyxNQUFNLE1BQU0sR0FBRTtJQUMvQixJQUFJLENBQUM7SUFDTDtJQUNBLElBQUksSUFBSSxNQUFNLFlBQVksZ0JBQWdCLEVBQUU7SUFDNUMsUUFBUSxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUM7SUFDekMsUUFBUSxNQUFNO0lBQ2QsSUFBSSxDQUFDO0lBQ0w7SUFDQSxJQUFJLElBQUksTUFBTSxZQUFZLGFBQWEsRUFBRTtJQUN6QyxRQUFRLElBQUksQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFO0lBQzNELFlBQVksUUFBUSxDQUFDLGtCQUFrQixHQUFHLENBQUMsR0FBRyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsTUFBTSxFQUFDO0lBQ2xGLFFBQVEsQ0FBQztJQUNULFFBQVEsTUFBTTtJQUNkLElBQUksQ0FBQztBQUNMO0lBQ0E7SUFDQTtJQUNBLElBQUksSUFBSSxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRTtJQUNwRDtJQUNBO0lBQ0E7SUFDQSxRQUFRLE1BQU0sSUFBSSxHQUFHLENBQUMsRUFBRSxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUM7QUFDbEY7SUFDQSxRQUFRLElBQUksSUFBRztBQUNmO0lBQ0EsUUFBUSxJQUFJO0lBQ1osWUFBWSxHQUFHLEdBQUcsTUFBTSxLQUFLLENBQUMsSUFBSSxFQUFDO0FBQ25DO0lBQ0EsWUFBWSxJQUFJLEdBQUcsQ0FBQyxFQUFFLEVBQUU7SUFDeEIsZ0JBQWdCLE1BQU0sR0FBRyxNQUFNLEdBQUcsQ0FBQyxJQUFJLEdBQUU7SUFDekMsWUFBWSxDQUFDO0lBQ2IsUUFBUSxDQUFDLENBQUMsT0FBTyxHQUFHLEVBQUU7SUFDdEIsWUFBWSxNQUFNLElBQUksU0FBUyxDQUFDLENBQUMsaUNBQWlDLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFO0lBQzVHLGdCQUFnQixJQUFJLEVBQUUsU0FBUyxDQUFDLFVBQVU7SUFDMUMsZ0JBQWdCLEtBQUssRUFBRSxHQUFHO0lBQzFCLGFBQWEsQ0FBQztJQUNkLFFBQVEsQ0FBQztBQUNUO0lBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRTtJQUNyQixZQUFZLElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxHQUFHLEVBQUU7SUFDMUQsZ0JBQWdCLE1BQU0sSUFBSSxTQUFTLENBQUMsQ0FBQyxnQ0FBZ0MsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRTtJQUNsSSxvQkFBb0IsSUFBSSxFQUFFLFNBQVMsQ0FBQyxVQUFVO0lBQzlDLGlCQUFpQixDQUFDO0lBQ2xCLFlBQVksQ0FBQztBQUNiO0lBQ0EsWUFBWSxJQUFJLFNBQVMsQ0FBQyxLQUFLLEVBQUU7SUFDakMsZ0JBQWdCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQywwQkFBMEIsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBQztJQUNoRixZQUFZLENBQUM7SUFDYixRQUFRLENBQUM7SUFDVDtJQUNBLElBQUksQ0FBQztBQUNMO0lBQ0EsSUFBSSxJQUFJLE1BQU0sSUFBSSxJQUFJLEVBQUU7SUFDeEIsUUFBUSxNQUFNO0lBQ2QsSUFBSSxDQUFDO0FBQ0w7SUFDQSxJQUFJLElBQUksT0FBTyxNQUFNLEtBQUssUUFBUSxFQUFFO0lBQ3BDLFFBQVEsTUFBTSxJQUFJLFNBQVMsQ0FBQyxDQUFDLHlCQUF5QixFQUFFLElBQUksQ0FBQyxzREFBc0QsQ0FBQyxDQUFDO0lBQ3JILElBQUksQ0FBQztBQUNMO0lBQ0EsSUFBSSxNQUFNLEdBQUcsTUFBTSxDQUFDLElBQUksR0FBRTtBQUMxQjtJQUNBLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtJQUNqQixRQUFRLE1BQU07SUFDZCxJQUFJLENBQUM7QUFDTDtJQUNBLElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRTtJQUN4QixRQUFRLGFBQWEsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3hELFFBQVEsYUFBYSxDQUFDLEVBQUUsR0FBRyxjQUFjLENBQUM7SUFDMUMsUUFBUSxhQUFhLENBQUMsWUFBWSxDQUFDLGFBQWEsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUMzRCxRQUFRLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ2pELElBQUksQ0FBQztBQUNMO0lBQ0EsSUFBSSxhQUFhLENBQUMsV0FBVyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ2hFLENBQUM7QUFDRDtJQUNBO0lBQ0EsSUFBSSxNQUFNLEVBQUU7SUFDWixJQUFJLE1BQU0sQ0FBQyxLQUFLLEdBQUcsTUFBSztJQUN4Qjs7Ozs7Ozs7In0=
