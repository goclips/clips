// clips.js

//  import ejs from '../../util/ejs.js'
import escape from '../../util/escape.js'

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
const _roots = new WeakMap()

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
const _states = new WeakMap()

/**
 * Shared style element containing the styles of registered clips.
 *
 * @private
 * @type {HTMLStyleElement|undefined}
 */
let _styleElement


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
        })

        this.create(options)
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
            const clip = _roots.get(element)

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
        const clips = []

        const collect = element => {
            const clip = _roots.get(element)

            if (clip) {
                clips.push(clip)
                return
            }

            for (const child of element.children) {
                collect(child)
            }
        }

        const root = this.root

        if (root) {
            for (const child of root.children) {
                collect(child)
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
        options = { ...options }

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

        const state = _states.get(this)

        let listeners = state.listeners.get(type)

        if (!listeners) {
            state.listeners.set(type, listeners = new Set())
        }

        listeners.add(listener)

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

        const state = _states.get(this)
        const listeners = state.listeners.get(type)

        if (listeners) {
            listeners.delete(listener)

            if (listeners.size === 0) {
                state.listeners.delete(type)
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
                event = new ClipEvent(event)
            } else if (typeof event === 'object' && event !== null && typeof event.type === 'string') {
                event = new ClipEvent(event.type, event.detail)
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

        const eventState = _eventStates.get(event)

        // Se impide emitir la misma instancia del evento mientras se está procesando.
        if (eventState.target !== null) {
            throw new ClipError('The event is already being dispatched.')
        }

        const dispatch = clip => {
            // Se propaga en postorden.
            if (spread === 'post') {
                for (const child of clip.childClips) {
                    dispatch(child)
                }
            }

            // Se ejecutan los listeners de este clip.
            const state = _states.get(clip)
            const listeners = state.listeners.get(event.type)

            if (listeners) {
                const previousTarget = eventState.currentTarget
                eventState.currentTarget = clip

                try {
                    for (const listener of [...listeners]) {
                        try {
                            listener.call(clip, event)
                        } catch (err) {
                            console.error(
                                `Error calling event listener "${event.type}" in clip "${clip.clipName}":`,
                                err
                            )
                        }
                    }
                } finally {
                    eventState.currentTarget = previousTarget
                }
            }

            // Se propaga en preorden.
            if (spread === true) {
                for (const child of clip.childClips) {
                    dispatch(child)
                }
            }
        }

        eventState.target = this

        try {
            dispatch(this)
        } finally {
            eventState.target = null
            eventState.currentTarget = null
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

    // Se valida la posición especificada antes de renderizar.
    const position = options.position ?? Clip.Position.end

    if (!Object.values(Clip.Position).includes(position)) {
        throw new RangeError(`Invalid position: ${String(position)}.`)
    }

    // Los comentarios no pueden contener nodos.
    if (target.nodeType === Node.COMMENT_NODE && (position === Clip.Position.start || position === Clip.Position.end)) {
        throw new TypeError('Invalid position: start and end require an Element target.')
    }

    // Se comprueba las posiciones que requieren que el elemento destino esté contenido en otro elemento.
    if ([Clip.Position.before, Clip.Position.after, Clip.Position.replace].includes(position) && !target.parentNode) {
        throw new ClipError(`Invalid target: must have a parent node for position "${position}".`)
    }

    // Se recupera el estado del clip.
    const state = _states.get(this)

    // Se genera la raíz si todavía no existe.    
    let root = state.root, fresh = false
    if (!root) {
        const ctx = new RenderContext(this)
        
        let out
        try {
            out = await this.render(ctx, options)
        } catch (cause) {
            throw new ClipError(`Unable to render clip "${this.clipName}".`, { cause });
        }

        if (out == null) {
            throw new ClipError(`Missing render output for clip "${this.clipName}".`)
        }

        if (out.nodeType === Node.ELEMENT_NODE) {
            root = out;
        } else {
            if (typeof out === 'string') {
                ctx.print(out)
                out = await ctx.resolve()
                // const template = document.createElement('template')
                // template.innerHTML = out
                // out = template.content
            }

            if (out.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
                for (const node of out.childNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (root) {
                            throw new ClipError('Multiple root elements are not allowed.')
                        }
                        root = node
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
        const c = _roots.get(root)
        if (c && c !== this) {
            throw new ClipError('Clip root already belongs to another clip.')
        }

        // Se identifica el elemento raíz del clip.
        root.setAttribute('data-clip', this.clipName)

        // Se indica que la raíz es de reciente creación.
        fresh = true
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
        _roots.set(root, this)

        // Se guarda el elemento raíz en el estado interno de la instancia.
        state.root = root

        // Referencia para depuración.
        Object.defineProperty(root, '__clip', {
            value: this,
            configurable: true
        })
    } 

    // Se guarda si la raíz estaba conectada antes de incluirla en el destino.
    const wasConnected = root.isConnected

    // Receptores de eventos.
    const eventTargets = {
        detach: [], attach: []        
    }

    // Se inserta la raíz.
    switch (position) {
        case Clip.Position.after:
            target.after(root)
            break

        case Clip.Position.before:
            target.before(root)
            break

        case Clip.Position.replace:
            const connected = target.isConnected

            if (target.contains(root)) {
                target.before(root)
                target.remove()
            } else {
                target.replaceWith(root)
            }

            if (connected) {
                const collect = element => {
                    for (const child of [...element.children]) {
                        collect(child)
                    }
                    
                    const clip = _roots.get(element)
                    if (clip) {
                        eventTargets.detach.push(clip)
                    }
                }

                collect(target);
            }
            break

        case Clip.Position.start:
            target.prepend(root)
            break

        case Clip.Position.end:
            target.append(root)
            break
    }

    // Se determina si emitir el evento "attach" o "detach" sobre el clip incluído y los clips contenidos.
    const isConnected = root.isConnected
    if (isConnected !== wasConnected) {
        const collect = element => {
            const clip = _roots.get(element)

            if (clip && isConnected) {
                eventTargets.attach.push(clip);
            }

            for (const child of element.children) {
                collect(child)
            }

            if (clip && !isConnected) {
                eventTargets.detach.push(clip);
            }
        }

        collect(root)
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
        await this.ready({ ...options, fresh, reload: false })
    } catch (err) {
        throw new ClipError(`Unable to ready clip "${this.clipName}".`, { cause: err })
    }

    // Se inicia la carga de datos adicionales.
    if (!state.loadStarted) {
        state.loadStarted = true;

        void (async () => {
            let data
            try {
                data = await this.load({ ...options, reload: false })
                state.loadTime = Date.now()            
            } catch (cause) {
                throw new ClipError(`Unable to load data for clip "${this.clipName}".`, { cause })
            }

            try {
                await this.update({ ...options, data, reload: false })
            } catch (cause) {
                throw new ClipError(`Unable to update clip "${this.clipName}".`, { cause })
            }
        })().catch(err => {
            console.error(err);
        })
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
const _eventStates = new WeakMap()

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
        })

        Object.defineProperties(this, {
            type: {
                value: type,
                enumerable: true
            },
            detail: {
                value: detail,
                enumerable: true
            }
        })
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
        super(String(message), cause !== undefined ? { cause } : undefined)

        this.name = 'ClipError'
        this.code = code

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ClipError)
        }
    }
}


/* RENDER CONTEXT
 * ================================================================================================================== */



class RenderContext {

    #out = []

    #clip = null

    #includes = []

    constructor(clip) {
        this.#clip = clip
    }

    include(name, options) {
        const index = this.#includes.length
        this.#includes.push({ name, options })

        return `<!--[clip-slot:${index}]-->`
    }
    
    async resolve() {
        const template = document.createElement('template')
        template.innerHTML = this.#out.join('')

        const slots = new Map()

        const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_COMMENT)

        while (walker.nextNode()) {
            const node = walker.currentNode
            const match = /^\[clip-slot:(0|[1-9]\d*)\]$/.exec(node.data)

            if (!match) {
                continue
            }

            const index = Number(match[1])

            if (index >= this.#includes.length || slots.has(index)) {
                throw new Error(`Invalid include slot: ${node.data}`)
            }

            slots.set(index, node)
        }

        if (slots.size !== this.#includes.length) {
            throw new Error(`Includes mismatch: ${slots.size} vs ${this.#includes.length}`)
        }

        for (let i = 0; i < this.#includes.length; i++) {
            const { name, options } = this.#includes[i]

            if (name.startsWith(_clipPrefix)) {
                const clip = await clips.create(name.substring(_clipPrefix.length), options)

                await clip.include(slots.get(i), { position: Clip.Position.replace, ...options })
            } else {
                const fragment = await clips.render(this.#clip, name, options)

                slots.get(i).replaceWith(fragment)
            }
        }

        return template.content
    }

    print(value, esc = false) {
        value = String(value)
        this.#out.push(esc ? this.escape(value) : value)
    }

    escape(value) {
        return escape.html(value)
    }

    each(items, callback) {
        const out = []

        for (const item of items ?? []) {
            const value = callback.call(this.#clip, item, out.length)

            if (value != null) {
                out.push(value)
            }
        }

        return out.join('')
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
}

/**
 * Clips registrados por nombre.
 * 
 * @private
 * @type {Map<string, typeof Clip>}
 */
const _clipTypes = new Map()


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

        name = name.trim()

        if (!name) {
            throw new TypeError('Invalid clip name: empty string.')
        }

        if (name.length > _clipNameMaxLength) {
            throw new RangeError(`Invalid clip name: too long (${name.length} > ${_clipNameMaxLength}).`)
        }

        if (!_clipNameRegexp.test(name)) {
            throw new TypeError('Invalid clip name: expected path-like string without leading or trailing slash.')
        }

        if (_clipTypes.has(name)) {
            throw new ClipError(`Clip "${name}" already defined.`, {
                code: ClipError.alreadyDefined
            })
        }

        // Se valida el objeto prototipo.
        if (proto === null || typeof proto !== 'object') {
            throw new TypeError('Invalid prototype: object required.')
        }

        // Se valida y resuelve el tipo de clip base.
        let base = proto.extends

        if (base !== undefined) {
            if (typeof base !== 'string') {
                throw new TypeError(`Invalid extends: string required.`)
            }

            base = base.trim()

            if (!base) {
                throw new TypeError(`Invalid extends: empty string.`)
            }

            if (base === name) {
                throw new TypeError('Invalid extends: a clip cannot extend itself.')
            }

            if (!_clipTypes.has(base)) {
                await _loadClip(base)

                if (!_clipTypes.has(base)) {
                    throw new ClipError(`Invalid extends: clip "${base}" not defined.`, {
                        code: ClipError.notDefined
                    })
                }
            }
        }

        // Se determina el tipo base.
        const B = _clipTypes.get(base) ?? Clip

        // Se admite un objeto plano o uno previamente vinculado a esta clase base.
        const parent = Object.getPrototypeOf(proto)

        if (parent !== Object.prototype && parent !== B.prototype) {
            throw new TypeError('Invalid prototype: plain object or object linked to the base clip prototype required.')
        }

        // Se crea la clase del nuevo clip.
        const C = class extends B {}

        // Se establece el prototipo base para permitir el uso de super.
        Object.setPrototypeOf(proto, B.prototype)

        // Se obtienen los descriptores, excluyendo "constructor", "extends" y "styles".
        const desc = Object.getOwnPropertyDescriptors(proto)
        delete desc.constructor
        delete desc.extends
        delete desc.styles

        // Se incorporan los miembros al prototipo de la clase.
        Object.defineProperties(C.prototype, desc)

        // Se asigna a la clase el nombre del tipo de clip.
        Object.defineProperty(C, 'name', {
            value: name,
            configurable: true
        })

        // Se importan la estilos vinculados al clip.
        await _importClipStyles(name, proto.styles);

        // Se registra el constructor con el nombre del tipo de clip.
        if (_clipTypes.has(name)) {
            throw new ClipError(`Clip "${name}" already defined.`, {
                code: ClipError.alreadyDefined
            })
        }

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
            throw new TypeError('Invalid clip name: non-empty string required.');
        }
        if (!_clipTypes[name]) {
            await _loadClip(name);
        }
        const type = _clipTypes.get(name);
        if (!type) {
            throw new ClipError(`Clip "${name}" is not defined.`, {
                code: ClipError.NOT_DEFINED
            });
        }
        return new type(options);
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

}


/**
 * Carga el manejador de un clip especificado por nombre.
 * 
 * @private
 * @param {string} name Nombre del clip.
 * @returns {Promise<typeof Clip>} Tipo del clip cargado.
 */
async function _loadClip(name) {
    // TODO: Introducir aquí posibles mapeos para bundles.
    /*
        _settings.bundles?.forEach(bundle => {
            if (bundle.pattern.test(name)) {
                loadBundle(bundle.path);
            }
        });
    */

    const errors = []

    for (const path of [
            `${_settings.basePath}/${name}.js`,
            `${_settings.basePath}/${name}/index.js`]) {
                
        let proto

        try {
            ({ default: proto } = await import(path))
        } catch (cause) {
            errors.push(new ClipError(`Failed to import clip "${name}" from "${path}".`, {
                code: ClipError.loadFailed,
                cause
            }))
            continue
        }

        // Si la definición cargada no es válida, no se intenta la siguiente ruta.
        if (proto === null || typeof proto !== 'object') {
            throw new ClipError(`Invalid clip "${name}" in "${path}": default export must be a plain object.`, {
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
        styles = await styles()
    }
    // Si se definen como HTMLStyleElement, se añaden directamente al head.
    if (styles instanceof HTMLStyleElement) {
        document.head.appendChild(styles)
        return
    }
    // Si se definen como CSSStyleSheet, se añaden a las hojas de estilo adoptadas.
    if (styles instanceof CSSStyleSheet) {
        if (!document.adoptedStyleSheets.includes(styles)) {
            document.adoptedStyleSheets = [...document.adoptedStyleSheets, styles]
        }
        return
    }

    // Si el clip no define estilos en código y no están empaquetados, se intenta cargar la hoja de estilos por defecto 
    // ubicada en la misma ubicación que el clip.
    if (styles == null && !_settings.stylesBundled) {
        // TODO: Más que un flag que nos indique si los estilos están empaquetados o no, lo que realmente necesitamos es 
        // una definición de bundles con la especificación de nombres o patrones de clips incluidos en cada bundle, de 
        // forma que podamos introducir aquí la lógica de carga adecuada.
        const path = `${_settings.basePath}/${name}/${Clip.defaultStylesName}.css`

        let res

        try {
            res = await fetch(path)

            if (res.ok) {
                styles = await res.text()
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
                console.warn(`No styles found for clip "${name}" at "${path}".`)
            }
        }
            
    }

    if (styles == null) {
        return
    }

    if (typeof styles !== 'string') {
        throw new TypeError(`Invalid styles for clip "${name}": string, HTMLStyleElement or CSSStyleSheet required.`)
    }

    styles = styles.trim()

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


// Exports
export default clips