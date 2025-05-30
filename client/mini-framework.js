// @ts-check

const MiniFramework = {
    // DOM Abstraction
    /**
     * Creates a virtual DOM element
     * @param {string} tag - HTML tag name
     * @param {Object} attrs - Attributes for the element
     * @param {...any} children - Child elements or text
     * @returns {Object} Virtual DOM node
     */
    createElement(tag, attrs = {}, ...children) {
        return { tag, attrs, children: children.flat(Infinity).filter(child => child != null) }
    },

    /**
     * Creates a real dom element from virtual dom node
     * (In some frameworks, this is called "mount")
     * @param {Object|string|number|boolean|bigint|symbol} vNode - Virtual Dom node
     * @returns {HTMLElement|Text} Real DOM node
     */
    createRealElement(vNode) {
        if (typeof vNode !== "object") {
            return document.createTextNode(String(vNode))
        }

        const isSvg = vNode.tag === "svg" || ["circle", "path", "line", "rect"].includes(vNode.tag);
        const element = isSvg ? document.createElementNS("http://www.w3.org/2000/svg", vNode.tag)
            : document.createElement(vNode.tag)

        for (const [attr, value] of Object.entries(vNode.attrs || {})) {
            if (attr.startsWith('on')) {
                const eventName = attr.slice(2).toLowerCase()
                element.addEventListener(eventName, value)
            } else if (attr === 'ref') {
                // Handle ref attribute for getting references to DOM elements
                value(element)
            } else if (attr === "checked" || attr === "disabled") {
                element[attr] = value // property not attribute
            } else {
                element.setAttribute(attr, value)
            }
        }

        // Add children recursively
        for (const child of vNode.children || []) {
            element.appendChild(this.createRealElement(child))
        }

        return element
    },


    /**
     * Store the current Virtual DOM tree for each container
     * @type {Map<HTMLElement,Object>}
     */
    _vDomTrees: new Map(),


    /**
     * Deep clones  a virtual DOM node to prevent reference issues
     * @param {Object|string|number|boolean|null|undefined} node - Node to clone
     * @returns {Object|string|number|boolean|null|undefined} Cloned node
     */
    _deepCloneVNode(node) {
        if (node == null || typeof node !== 'object') {
            return node;
        }

        // Clone the node
        const clone = { tag: node.tag };

        if (node.attrs) {
            clone.attrs = {};
            for (const [key, value] of Object.entries(node.attrs)) {
                clone.attrs[key] = value;
            }
        }

        if (node.children) {
            clone.children = node.children.map(child => this._deepCloneVNode(child))
        }

        return clone
    },

    /**
     * Renders a virtual DOM tree to a container using efficient diffing
     * @param {Object} vNode - Virtual DOM node
     * @param {HTMLElement} container - Container to render into
     */
    render(vNode, container) {
        const oldVNode = this._vDomTrees.get(container)

        if (!oldVNode) {
            container.innerHTML = ''
            container.appendChild(this.createRealElement(vNode))
        } else {
            this.updateElement(container, vNode, oldVNode, 0)
        }

        this._vDomTrees.set(container, this._deepCloneVNode(vNode))
    },

    /**
     * Compares two nodes to determine if they are different
     * @param {Object|string|number|boolean|null|undefined} node1 - First node
     * @param {Object|string|number|boolean|null|undefined} node2 - Second node
     * @returns {boolean} True if nodes are different
     */
    changed(node1, node2) {
        if (node1 == null || node2 == null) return node1 != node2

        if (typeof node1 !== typeof node2) return true

        if (typeof node1 !== 'object') return node1 !== node2

        return node1.tag !== node2.tag
    },

    /**
     * Updates DOM elements based on Virtual DOM differences (Diffing & Patching)
     * @param {HTMLElement} parent - Parent element
     * @param {Object|string|number|boolean|null|undefined} newNode - New Virtual Node
     * @param {Object|string|number|boolean|null|undefined} oldNode - Old Virtual Node
     * @param {number} index - Index of child in parent
     */
    updateElement(parent, newNode, oldNode, index = 0) {
        if (oldNode == null) {
            parent.appendChild(this.createRealElement(newNode))
            return
        }

        if (newNode == null) {
            // Find the right child even if indices have shifted
            let currentIndex = 0;
            let child = null;

            // For elements with IDs or data attributes, try to find them directly
            if (oldNode && typeof oldNode === 'object' && oldNode.attrs) {
                if (oldNode.attrs['data-id']) {
                    child = parent.querySelector(`[data-id="${oldNode.attrs['data-id']}"]`);
                } else if (oldNode.attrs.id) {
                    child = parent.querySelector(`#${oldNode.attrs.id}`);
                } else if (oldNode.attrs.class) {
                    // Try to find by tag + class as a fallback
                    const className = oldNode.attrs.class;
                    const tag = oldNode.tag;
                    child = parent.querySelector(`${tag}.${className.split(' ')[0]}`);
                }
            }

            // If we couldn't find by attributes, use index as fallback
            if (!child) {
                // Count from the beginning to handle index shifting
                for (let currentNode of parent.childNodes) {
                    if (currentIndex === index) {
                        child = currentNode;
                        break;
                    }
                    currentIndex++;
                }
            }

            // Now remove the child if found
            if (child) {
                parent.removeChild(child);
            }

            return;
        }

        if (this.changed(newNode, oldNode)) {
            const child = parent.childNodes[index];
            if (child) {
                parent.replaceChild(this.createRealElement(newNode), child);
            }
            return
        }

        if (typeof newNode !== 'object' || typeof oldNode !== 'object') {
            return;
        }

        // At this point we know both nodes are objects with the same tag

        /** 
         * @type {HTMLElement} 
         * => I skip this because I know for sure that I have Node element
         */
        // @ts-ignore
        const el = parent.childNodes[index]

        const newAttrs = newNode.attrs || {}
        const oldAttrs = oldNode.attrs || {}

        for (const [attr, value] of Object.entries(newAttrs)) {
            if (attr.startsWith('on') && !(attr in oldAttrs)) {
                const eventName = attr.slice(2).toLowerCase()
                el.addEventListener(eventName, value)
            } else if (oldAttrs[attr] !== value) {
                if (attr === 'checked' || attr === 'disabled') {
                    el[attr] = value  // set as property
                } else {
                    el.setAttribute(attr, value)
                }
            }
        }

        for (const attr in oldAttrs) {
            if (attr.startsWith('on')) {
                const eventName = attr.slice(2).toLowerCase()
                // Remove old handler if it doesn't exist in new attributes or is different
                if (!(attr in newAttrs)) {
                    el.removeEventListener(eventName, oldAttrs[attr])
                } else if (oldAttrs[attr] !== newAttrs[attr]) {
                    el.removeEventListener(eventName, oldAttrs[attr])
                    el.addEventListener(eventName, newAttrs[attr])
                }
            } else if (!(attr in newAttrs) && attr !== 'key') {
                el.removeAttribute(attr)
            }
        }

        // For lists of elements with keys, use key-based reconciliation
        if (typeof newNode === 'object' && typeof oldNode === 'object' &&
            newNode.children && oldNode.children &&
            ((newNode.children.length > 0 && newNode.children[0].attrs && newNode.children[0].attrs.key) ||
                (oldNode.children.length > 0 && oldNode.children[0].attrs && oldNode.children[0].attrs.key))) {

            // this is a problem occurs when I was filtering with completed 
            // console.log("newNode.children.length ->",newNode.children.length)
            // console.log("oldNode.children.length ->",oldNode.children.length)

            // This is a list with keyed children (or was previously a list with keyed children)
            this.updateKeyedChildren(el, newNode.children, oldNode.children);
            return;
        }

        const newChildren = newNode.children || []
        const oldChildren = oldNode.children || []
        const maxLength = Math.max(newChildren.length, oldChildren.length)

        for (let i = 0; i < maxLength; i++) {
            this.updateElement(
                el,
                i < newChildren.length ? newChildren[i] : null,
                i < oldChildren.length ? oldChildren[i] : null,
                i
            )
        }

    },

    /**
     * Updates children using key-based reconciliation
     * @param {HTMLElement} parent - Parent element
     * @param {Array} newChildren - New children array
     * @param {Array} oldChildren - Old children array
     */
    updateKeyedChildren(parent, newChildren, oldChildren) {
        // Create map of key -> oldIndex
        const oldKeyMap = {};
        oldChildren.forEach((child, i) => {
            if (child.attrs && child.attrs.key) {
                oldKeyMap[child.attrs.key] = i;
            }
        });

        // Create map of key -> newIndex
        const newKeyMap = {};
        newChildren.forEach((child, i) => {
            if (child.attrs && child.attrs.key) {
                newKeyMap[child.attrs.key] = i;
            }
        });

        // Track already processed elements to avoid duplicates
        const processed = {};

        // First pass: update and reorder existing nodes
        newChildren.forEach((newChild, newIndex) => {
            const key = newChild.attrs.key;
            if (key in oldKeyMap) {
                const oldIndex = oldKeyMap[key];
                const oldChild = oldChildren[oldIndex];

                // Update existing node
                this.updateElement(parent, newChild, oldChild, oldIndex);

                // If position changed, move DOM node to correct position
                if (newIndex !== oldIndex) {
                    const node = parent.childNodes[oldIndex];
                    // Move node to new position
                    if (newIndex >= parent.childNodes.length) {
                        parent.appendChild(node);
                    } else {
                        parent.insertBefore(node, parent.childNodes[newIndex]);
                    }
                }

                processed[key] = true;
            }
        });

        // Second pass: add new nodes
        newChildren.forEach((newChild, newIndex) => {
            const key = newChild.attrs.key;
            if (!(key in oldKeyMap)) {
                // Add new node
                const newElement = this.createRealElement(newChild);
                if (newIndex >= parent.childNodes.length) {
                    parent.appendChild(newElement);
                } else {
                    parent.insertBefore(newElement, parent.childNodes[newIndex]);
                }
            }
        });

        // Third pass: remove old nodes not present in new children
        oldChildren.forEach((oldChild) => {
            const key = oldChild.attrs?.key;
            if (key && !(key in newKeyMap)) {
                // Find and remove node
                for (let i = 0; i < parent.childNodes.length; i++) {
                    const domNode = parent.childNodes[i];
                    if (domNode instanceof HTMLElement && domNode.getAttribute && domNode.getAttribute('data-id') === key) {
                        parent.removeChild(domNode);
                        break;
                    }
                }
            }
        });
    },

    // STATE Management
    /**
     * Creates a state store
     * @param {Object} initialState - Initial State
     * @returns {Object} Store with methods for managing state
     */
    createStore(initialState = {}) {
        let state = { ...initialState }
        let listeners = []

        /**
         * Get Current State
         * @returns {object} current state
         */
        const getState = () => ({ ...state })

        /**
         * Update the State
         * @param {object} newState - change state
         */
        const setState = (newState) => {
            state = { ...state, ...newState }
            listeners.forEach(listener => listener(state))
        }

        /**
         * Subscribes to state changes
         * @param {Function} listener - function to call on state change
         * @returns {Function} Unsubscribe function
         */
        const subscribe = (listener) => {
            listeners.push(listener)
            return () => {
                const index = listeners.indexOf(listener)
                if (index > -1) {
                    listeners.splice(index, 1)
                }
            }
        }

        return { getState, setState, subscribe }
    },

    // Routing system
    router: {
        store: null,
        /**
         * @type {Array<{ path: string; component: Function }>}
         */
        routes: [],

        /**
         * Initialzes the router
         * @param {Object} store - state store
         */
        init(store) {
            this.store = store

            this.handleRouteChange();

            window.addEventListener('hashchange', () => {
                this.handleRouteChange();
            });
        },

        /**
         * Adds a route to the router
         * @param {string} path - URL path
         * @param {Function} component - Component to render for this route
         */
        addRoute(path, component) {
            this.routes.push({ path, component })
        },

        /**
         * Navigates to a path
         * @param {string} path - URL path
         */
        navigate(path) {
            window.location.hash = path;
        },

        /**
         * Handles Route changes
         */
        handleRouteChange() {
            const path = window.location.hash.slice(1) || '/'
            const route = this.routes.find(r => r.path === path) ||
                this.routes.find(r => r.path === '*')

            if (route) {
                if (this.store) {
                    route.component()
                }
            }
        }
    },


    // Event Handling System (Application level) 
    events: {},

    /**
     * Subscribes to Custom event
     * @param {string} eventName - Name of the event
     * @param {Function} handler - Event handler
     * @returns {Function} Unsubscribe function
     */
    on(eventName, handler) {
        if (!this.events[eventName]) {
            this.events[eventName] = []
        }
        this.events[eventName].push(handler)

        // remove this specific handler
        return () => {
            this.events[eventName] = this.events[eventName].filter(h => h !== handler)
        }
    },

    /**
     * Emits a custom event
     * @param {string} eventName - Name of the event
     * @param {any} data - Event Data
     */
    emit(eventName, data) {
        if (this.events[eventName]) {
            this.events[eventName].forEach(handler => handler(data))
        }
    },

    /**
     * Custom event listener
     * @param {string} eventName - Name of the event
     * @param {EventListener} handler - Event handler function
     * @param {boolean | AddEventListenerOptions} options - Event options
     * @returns {Function} Cleanup function to remove the listener
     */
    listener(eventName, handler, options = {}) {
        document.addEventListener(eventName, handler, options);
        
        return () => document.removeEventListener(eventName, handler);
    }
}

export default MiniFramework;
