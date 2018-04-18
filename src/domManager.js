import { eventHookRe, XLINK_NS, xlinkRe } from "./util";
import { VNode } from './vnode';

export default domManager;

// dom mangager. Used internally.
const domManager = {
  append,
  insertBefore,
  remove,
  replace,
  nextSibling,
  create,
  setAttribute
};

/**
 * @param {Element} parentNode 
 * @param {Element} node 
 */
function append(parentNode, node) {
  parentNode.appendChild(node);
}

/**
 * @param {Element} parentNode
 * @param {Element} node 
 * @param {Element} domNode the reference node.
 */
function insertBefore(parentNode, node, domNode) {
  parentNode.insertBefore(node, domNode);
}

/**
 * @param {Element} parentNode 
 * @param {Element} domNode 
 * @param {Element} node 
 */
function replace(parentNode, node, domNode) {
  if (node.parentNode === parentNode)
    parentNode.replaceChild(node, domNode);
  return domNode;
}

/**
 * Remove a child on a node if it exists.
 * @param {Element} parentNode 
 * @param {Element} node 
 */
function remove(parentNode, node) {
  if (node.parentNode === parentNode)
    parentNode.removeChild(node);
  return node;
}

/**
 * Get next sibling of node.
 * @param {Element} node
 */
function nextSibling(node) {
  if (node instanceof Element) {
    return node.nextSibling;
  }
  return null;
}

/**
 * Create a DOM node represented by `vnode`
 * @param {String|Number|VNode} vnode 
 */
function create(vnode) {
  // create a text node if it is a string or a number.
  if (typeof vnode === 'string' || typeof vnode === 'number')
    return document.createTextNode(vnode);

  const tagName = vnode.tagName;
  const props = vnode.props;
  const children = vnode.children;
  const ns = vnode.ns;
  const element = ns
    ? document.createElementNS(ns, tagName)
    : document.createElement(tagName);

  // for next diff.
  element.$props = props;
  for (const propName in props) {
    const event = propName.match(eventHookRe);
    if (event) {
      const handler = typeof props[propName] === 'function'
        ? props[propName]
        : new Error(`Handler to ${event[1]} is not a function`);

      if (handler instanceof Error) {
        console.warn(`Failed to add listener for ${event[1]}: ${handler.message}`);
      }

      // for next diff.
      (element._listeners || (element._listeners = {}))[event[1]] = handler;
      element.addEventListener(event[1], handler, false);
    }

    else {
      setAttribute(element, propName, props[propName], !!ns);
    }
  }

  children.forEach(child => {
    let childElement;

    if (child instanceof VNode || typeof child === 'string') {
      childElement = create(child);
    }

    // TODO: add thunk.

    else {
      console.warn(`Unrecognizable node: ${child}`);
    }

    element.appendChild(childElement);
  });

  return element;
}

/**
 * Set attribute/property on an element.
 * @param {Element} element 
 * @param {String} attrName 
 * @param {String} value 
 */
function setAttribute(element, attrName, value, isNameSpaced) {
  let ns, oldValue;

  attrName = attrName === 'className' ? 'class' : attrName;

  switch(attrName) {
  case 'key':
    element.key = value;
    break;
  
  case 'style':   /** if style is an object, it'll always be patched. */
    oldValue = element.$style;

    if (!value || typeof value === 'string' || typeof oldValue === 'string') {
      // if `value` is an object, it will be reset below.
      element.style.cssText = value || '';
    }
    
    if (value && typeof value === 'object') {
      // set every old style field to empty.
      if (typeof oldValue !== 'string') {
        for (let i in old) {
          if (!(i in value))
            node.style[i] = '';
        }
      }
      
      for (let i in value) {
        node.style[i] = value[i];
      }
    }

    // for next diff.
    element.$style = value ? value : '';

    break;
  
  case 'class':
    element.className = value || '';
    break;

  case 'children':
    console.warn(`Failed to set "children" on element ${element.tagName}.`);
    break;

  case 'innerHTML':
    console.warn(`Failed to set "innerHTML" on a "${element.tagName.toLocaleLowerCase()}".`);
    break;

  default:
    if (!isNameSpaced && (attrName in element) && (attrName !== 'type')) {
      // set it as a property.
      try {
        element[attrName] = value ? value : '';
      } catch(e) {
        console.warn(`Failed to set attribute: ${attrName} on element "${element.id ? element.tagName + element.id : element.tagName }"`)
      }

      if (value == null) {
        element.removeAttribute(attrName);
      }
    }

    else {
      ns = isNameSpaced && !!(attrName = (attrName.match(xlinkRe))[1]);
      // set it as an attribute.
      if (value && ns) {
        element.setAttributeNS(XLINK_NS, attrName, value);
      } else if (!value && ns) {
        element.removeAttributeNS(XLINK_NS, attrName);
      } else if (value) {
        element.setAttribute(attrName, value);
      } else {
        element.removeAttribute(attrName);
      }
    }
  }
}
