/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */const directives=new WeakMap,isDirective=e=>"function"==typeof e&&directives.has(e),isCEPolyfill=window.customElements!==void 0&&window.customElements.polyfillWrapFlushCallback!==void 0,removeNodes=(e,t,n=null)=>{for(;t!==n;){const r=t.nextSibling;e.removeChild(t),t=r}},noChange={},nothing={},marker=`{{lit-${(Math.random()+"").slice(2)}}}`,nodeMarker=`<!--${marker}-->`,markerRegex=new RegExp(`${marker}|${nodeMarker}`),boundAttributeSuffix="$lit$";/**
 * An updateable Template that tracks the location of dynamic parts.
 */class Template{constructor(e,t){this.parts=[],this.element=t;const r=[],a=[],s=document.createTreeWalker(t.content,133/* NodeFilter.SHOW_{ELEMENT|COMMENT|TEXT} */,null,!1);// Keeps track of the last index associated with a part. We try to delete
// unnecessary nodes, but we never want to associate two different parts
// to the same index. They must have a constant node between.
let o=0,d=-1,p=0;for(const{strings:n,values:{length:i}}=e;p<i;){const e=s.nextNode();if(null===e){s.currentNode=a.pop();continue}if(d++,1===e.nodeType/* Node.ELEMENT_NODE */){if(e.hasAttributes()){const t=e.attributes,{length:r}=t;// Per
// https://developer.mozilla.org/en-US/docs/Web/API/NamedNodeMap,
// attributes are not guaranteed to be returned in document order.
// In particular, Edge/IE can return them out of order, so we cannot
// assume a correspondence between part index and attribute index.
let a=0;for(let e=0;e<r;e++)endsWith(t[e].name,boundAttributeSuffix)&&a++;for(;0<a--;){// Get the template literal section leading up to the first
// expression in this attribute
const t=n[p],r=lastAttributeNameRegex.exec(t)[2],a=r.toLowerCase()+boundAttributeSuffix,s=e.getAttribute(a);// Find the attribute name
e.removeAttribute(a);const o=s.split(markerRegex);this.parts.push({type:"attribute",index:d,name:r,strings:o}),p+=o.length-1}}"TEMPLATE"===e.tagName&&(a.push(e),s.currentNode=e.content)}else if(3===e.nodeType/* Node.TEXT_NODE */){const t=e.data;if(0<=t.indexOf(marker)){const n=e.parentNode,a=t.split(markerRegex),s=a.length-1;// Generate a new text node for each literal section
// These nodes are also used as the markers for node parts
for(let t=0;t<s;t++){let r,o=a[t];if(""===o)r=createMarker();else{const e=lastAttributeNameRegex.exec(o);null!==e&&endsWith(e[2],boundAttributeSuffix)&&(o=o.slice(0,e.index)+e[1]+e[2].slice(0,-boundAttributeSuffix.length)+e[3]),r=document.createTextNode(o)}n.insertBefore(r,e),this.parts.push({type:"node",index:++d})}// If there's no text, we must insert a comment to mark our place.
// Else, we can trust it will stick around after cloning.
""===a[s]?(n.insertBefore(createMarker(),e),r.push(e)):e.data=a[s],p+=s}}else if(8===e.nodeType/* Node.COMMENT_NODE */)if(e.data===marker){const t=e.parentNode;// Add a new marker node to be the startNode of the Part if any of
// the following are true:
//  * We don't have a previousSibling
//  * The previousSibling is already the start of a previous part
(null===e.previousSibling||d===o)&&(d++,t.insertBefore(createMarker(),e)),o=d,this.parts.push({type:"node",index:d}),null===e.nextSibling?e.data="":(r.push(e),d--),p++}else for(let t=-1;-1!==(t=e.data.indexOf(marker,t+1));)// Comment node has a binding marker inside, make an inactive part
// The binding won't work, but subsequent bindings will
// TODO (justinfagnani): consider whether it's even worth it to
// make bindings in comments work
this.parts.push({type:"node",index:-1}),p++}// Remove text binding nodes after the walk to not disturb the TreeWalker
for(const a of r)a.parentNode.removeChild(a)}}const endsWith=(e,t)=>{const n=e.length-t.length;return 0<=n&&e.slice(n)===t},isTemplatePartActive=e=>-1!==e.index,createMarker=()=>document.createComment(""),lastAttributeNameRegex=/([ \x09\x0a\x0c\x0d])([^\0-\x1F\x7F-\x9F "'>=/]+)([ \x09\x0a\x0c\x0d]*=[ \x09\x0a\x0c\x0d]*(?:[^ \x09\x0a\x0c\x0d"'`<>=]*|"[^"]*|'[^']*))$/;/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */ /**
 * An instance of a `Template` that can be attached to the DOM and updated
 * with new values.
 */class TemplateInstance{constructor(e,t,n){this.__parts=[],this.template=e,this.processor=t,this.options=n}update(e){let t=0;for(const n of this.__parts)void 0!==n&&n.setValue(e[t]),t++;for(const t of this.__parts)void 0!==t&&t.commit()}_clone(){// There are a number of steps in the lifecycle of a template instance's
// DOM fragment:
//  1. Clone - create the instance fragment
//  2. Adopt - adopt into the main document
//  3. Process - find part markers and create parts
//  4. Upgrade - upgrade custom elements
//  5. Update - set node, attribute, property, etc., values
//  6. Connect - connect to the document. Optional and outside of this
//     method.
//
// We have a few constraints on the ordering of these steps:
//  * We need to upgrade before updating, so that property values will pass
//    through any property setters.
//  * We would like to process before upgrading so that we're sure that the
//    cloned fragment is inert and not disturbed by self-modifying DOM.
//  * We want custom elements to upgrade even in disconnected fragments.
//
// Given these constraints, with full custom elements support we would
// prefer the order: Clone, Process, Adopt, Upgrade, Update, Connect
//
// But Safari dooes not implement CustomElementRegistry#upgrade, so we
// can not implement that order and still have upgrade-before-update and
// upgrade disconnected fragments. So we instead sacrifice the
// process-before-upgrade constraint, since in Custom Elements v1 elements
// must not modify their light DOM in the constructor. We still have issues
// when co-existing with CEv0 elements like Polymer 1, and with polyfills
// that don't strictly adhere to the no-modification rule because shadow
// DOM, which may be created in the constructor, is emulated by being placed
// in the light DOM.
//
// The resulting order is on native is: Clone, Adopt, Upgrade, Process,
// Update, Connect. document.importNode() performs Clone, Adopt, and Upgrade
// in one step.
//
// The Custom Elements v1 polyfill supports upgrade(), so the order when
// polyfilled is the more ideal: Clone, Process, Adopt, Upgrade, Update,
// Connect.
const e=isCEPolyfill?this.template.element.content.cloneNode(!0):document.importNode(this.template.element.content,!0),t=[],n=this.template.parts,r=document.createTreeWalker(e,133/* NodeFilter.SHOW_{ELEMENT|COMMENT|TEXT} */,null,!1);let a,s=0,o=0,i=r.nextNode();// Loop through all the nodes and parts of a template
for(;s<n.length;){if(a=n[s],!isTemplatePartActive(a)){this.__parts.push(void 0),s++;continue}// Progress the tree walker until we find our next part's node.
// Note that multiple parts may share the same node (attribute parts
// on a single element), so this loop may not run at all.
for(;o<a.index;)o++,"TEMPLATE"===i.nodeName&&(t.push(i),r.currentNode=i.content),null===(i=r.nextNode())&&(r.currentNode=t.pop(),i=r.nextNode());// We've arrived at our part's node.
if("node"===a.type){const e=this.processor.handleTextExpression(this.options);e.insertAfterNode(i.previousSibling),this.__parts.push(e)}else this.__parts.push(...this.processor.handleAttributeExpressions(i,a.name,a.strings,this.options));s++}return isCEPolyfill&&(document.adoptNode(e),customElements.upgrade(e)),e}}/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */const commentMarker=` ${marker} `;/**
 * The return type of `html`, which holds a Template and the values from
 * interpolated expressions.
 */class TemplateResult{constructor(e,t,n,r){this.strings=e,this.values=t,this.type=n,this.processor=r}/**
     * Returns a string of HTML used to create a `<template>` element.
     */getHTML(){const e=this.strings.length-1;let t="",n=!1;for(let r=0;r<e;r++){const e=this.strings[r],a=e.lastIndexOf("<!--");// For each binding we want to determine the kind of marker to insert
// into the template source before it's parsed by the browser's HTML
// parser. The marker type is based on whether the expression is in an
// attribute, text, or comment poisition.
//   * For node-position bindings we insert a comment with the marker
//     sentinel as its text content, like <!--{{lit-guid}}-->.
//   * For attribute bindings we insert just the marker sentinel for the
//     first binding, so that we support unquoted attribute bindings.
//     Subsequent bindings can use a comment marker because multi-binding
//     attributes must be quoted.
//   * For comment bindings we insert just the marker sentinel so we don't
//     close the comment.
//
// The following code scans the template source, but is *not* an HTML
// parser. We don't need to track the tree structure of the HTML, only
// whether a binding is inside a comment, and if not, if it appears to be
// the first binding in an attribute.
n=(-1<a||n)&&-1===e.indexOf("-->",a+1);// Check to see if we have an attribute-like sequence preceeding the
// expression. This can match "name=value" like structures in text,
// comments, and attribute values, so there can be false-positives.
const s=lastAttributeNameRegex.exec(e);t+=null===s?e+(n?commentMarker:nodeMarker):e.substr(0,s.index)+s[1]+s[2]+boundAttributeSuffix+s[3]+marker}return t+=this.strings[e],t}getTemplateElement(){const e=document.createElement("template");return e.innerHTML=this.getHTML(),e}}/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */const isPrimitive=e=>null===e||"object"!=typeof e&&"function"!=typeof e,isIterable=e=>Array.isArray(e)||// tslint:disable-next-line:no-any
!!(e&&e[Symbol.iterator]);/**
 * Writes attribute values to the DOM for a group of AttributeParts bound to a
 * single attibute. The value is only set once even if there are multiple parts
 * for an attribute.
 */class AttributeCommitter{constructor(e,t,n){this.dirty=!0,this.element=e,this.name=t,this.strings=n,this.parts=[];for(let r=0;r<n.length-1;r++)this.parts[r]=this._createPart()}/**
     * Creates a single part. Override this to create a differnt type of part.
     */_createPart(){return new AttributePart(this)}_getValue(){const e=this.strings,t=e.length-1;let n="";for(let r=0;r<t;r++){n+=e[r];const t=this.parts[r];if(void 0!==t){const e=t.value;if(isPrimitive(e)||!isIterable(e))n+="string"==typeof e?e:e+"";else for(const r of e)n+="string"==typeof r?r:r+""}}return n+=e[t],n}commit(){this.dirty&&(this.dirty=!1,this.element.setAttribute(this.name,this._getValue()))}}/**
 * A Part that controls all or part of an attribute value.
 */class AttributePart{constructor(e){this.value=void 0,this.committer=e}setValue(e){e===noChange||isPrimitive(e)&&e===this.value||(this.value=e,!isDirective(e)&&(this.committer.dirty=!0))}commit(){for(;isDirective(this.value);){const e=this.value;this.value=noChange,e(this)}this.value===noChange||this.committer.commit()}}/**
 * A Part that controls a location within a Node tree. Like a Range, NodePart
 * has start and end locations and can set and update the Nodes between those
 * locations.
 *
 * NodeParts support several value types: primitives, Nodes, TemplateResults,
 * as well as arrays and iterables of those types.
 */class NodePart{constructor(e){this.value=void 0,this.__pendingValue=void 0,this.options=e}/**
     * Appends this part into a container.
     *
     * This part must be empty, as its contents are not automatically moved.
     */appendInto(e){this.startNode=e.appendChild(createMarker()),this.endNode=e.appendChild(createMarker())}/**
     * Inserts this part after the `ref` node (between `ref` and `ref`'s next
     * sibling). Both `ref` and its next sibling must be static, unchanging nodes
     * such as those that appear in a literal section of a template.
     *
     * This part must be empty, as its contents are not automatically moved.
     */insertAfterNode(e){this.startNode=e,this.endNode=e.nextSibling}/**
     * Appends this part into a parent part.
     *
     * This part must be empty, as its contents are not automatically moved.
     */appendIntoPart(e){e.__insert(this.startNode=createMarker()),e.__insert(this.endNode=createMarker())}/**
     * Inserts this part after the `ref` part.
     *
     * This part must be empty, as its contents are not automatically moved.
     */insertAfterPart(e){e.__insert(this.startNode=createMarker()),this.endNode=e.endNode,e.endNode=this.startNode}setValue(e){this.__pendingValue=e}commit(){for(;isDirective(this.__pendingValue);){const e=this.__pendingValue;this.__pendingValue=noChange,e(this)}const e=this.__pendingValue;e===noChange||(isPrimitive(e)?e!==this.value&&this.__commitText(e):e instanceof TemplateResult?this.__commitTemplateResult(e):e instanceof Node?this.__commitNode(e):isIterable(e)?this.__commitIterable(e):e===nothing?(this.value=nothing,this.clear()):this.__commitText(e))}__insert(e){this.endNode.parentNode.insertBefore(e,this.endNode)}__commitNode(e){this.value===e||(this.clear(),this.__insert(e),this.value=e)}__commitText(e){const t=this.startNode.nextSibling;e=null==e?"":e;// If `value` isn't already a string, we explicitly convert it here in case
// it can't be implicitly converted - i.e. it's a symbol.
const n="string"==typeof e?e:e+"";t===this.endNode.previousSibling&&3===t.nodeType/* Node.TEXT_NODE */?t.data=n:this.__commitNode(document.createTextNode(n)),this.value=e}__commitTemplateResult(e){const t=this.options.templateFactory(e);if(this.value instanceof TemplateInstance&&this.value.template===t)this.value.update(e.values);else{// Make sure we propagate the template processor from the TemplateResult
// so that we use its syntax extension, etc. The template factory comes
// from the render function options so that it can control template
// caching and preprocessing.
const n=new TemplateInstance(t,e.processor,this.options),r=n._clone();n.update(e.values),this.__commitNode(r),this.value=n}}__commitIterable(e){Array.isArray(this.value)||(this.value=[],this.clear());// Lets us keep track of how many items we stamped so we can clear leftover
// items from a previous render
const t=this.value;let n,r=0;for(const a of e)// Try to reuse an existing part
n=t[r],void 0===n&&(n=new NodePart(this.options),t.push(n),0===r?n.appendIntoPart(this):n.insertAfterPart(t[r-1])),n.setValue(a),n.commit(),r++;r<t.length&&(t.length=r,this.clear(n&&n.endNode))}clear(e=this.startNode){removeNodes(this.startNode.parentNode,e.nextSibling,this.endNode)}}/**
 * Implements a boolean attribute, roughly as defined in the HTML
 * specification.
 *
 * If the value is truthy, then the attribute is present with a value of
 * ''. If the value is falsey, the attribute is removed.
 */class BooleanAttributePart{constructor(e,t,n){if(this.value=void 0,this.__pendingValue=void 0,2!==n.length||""!==n[0]||""!==n[1])throw new Error("Boolean attributes can only contain a single expression");this.element=e,this.name=t,this.strings=n}setValue(e){this.__pendingValue=e}commit(){for(;isDirective(this.__pendingValue);){const e=this.__pendingValue;this.__pendingValue=noChange,e(this)}if(this.__pendingValue!==noChange){const e=!!this.__pendingValue;this.value!==e&&(e?this.element.setAttribute(this.name,""):this.element.removeAttribute(this.name),this.value=e),this.__pendingValue=noChange}}}/**
 * Sets attribute values for PropertyParts, so that the value is only set once
 * even if there are multiple parts for a property.
 *
 * If an expression controls the whole property value, then the value is simply
 * assigned to the property under control. If there are string literals or
 * multiple expressions, then the strings are expressions are interpolated into
 * a string first.
 */class PropertyCommitter extends AttributeCommitter{constructor(e,t,n){super(e,t,n),this.single=2===n.length&&""===n[0]&&""===n[1]}_createPart(){return new PropertyPart(this)}_getValue(){return this.single?this.parts[0].value:super._getValue()}commit(){this.dirty&&(this.dirty=!1,this.element[this.name]=this._getValue())}}class PropertyPart extends AttributePart{}// Detect event listener options support. If the `capture` property is read
// from the options object, then options are supported. If not, then the thrid
// argument to add/removeEventListener is interpreted as the boolean capture
// value so we should only pass the `capture` property.
let eventOptionsSupported=!1;try{const e={get capture(){return eventOptionsSupported=!0,!1}};// tslint:disable-next-line:no-any
// tslint:disable-next-line:no-any
window.addEventListener("test",e,e),window.removeEventListener("test",e,e)}catch(e){}class EventPart{constructor(e,t,n){this.value=void 0,this.__pendingValue=void 0,this.element=e,this.eventName=t,this.eventContext=n,this.__boundHandleEvent=t=>this.handleEvent(t)}setValue(e){this.__pendingValue=e}commit(){for(;isDirective(this.__pendingValue);){const e=this.__pendingValue;this.__pendingValue=noChange,e(this)}if(this.__pendingValue===noChange)return;const e=this.__pendingValue,t=this.value,n=null==e||null!=t&&(e.capture!==t.capture||e.once!==t.once||e.passive!==t.passive);n&&this.element.removeEventListener(this.eventName,this.__boundHandleEvent,this.__options),null!=e&&(null==t||n)&&(this.__options=getOptions(e),this.element.addEventListener(this.eventName,this.__boundHandleEvent,this.__options)),this.value=e,this.__pendingValue=noChange}handleEvent(e){"function"==typeof this.value?this.value.call(this.eventContext||this.element,e):this.value.handleEvent(e)}}// We copy options because of the inconsistent behavior of browsers when reading
// the third argument of add/removeEventListener. IE11 doesn't support options
// at all. Chrome 41 only reads `capture` if the argument is an object.
const getOptions=e=>e&&(eventOptionsSupported?{capture:e.capture,passive:e.passive,once:e.once}:e.capture);/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */ /**
 * Creates Parts when a template is instantiated.
 */class DefaultTemplateProcessor{/**
     * Create parts for an attribute-position binding, given the event, attribute
     * name, and string literals.
     *
     * @param element The element containing the binding
     * @param name  The attribute name
     * @param strings The string literals. There are always at least two strings,
     *   event for fully-controlled bindings with a single expression.
     */handleAttributeExpressions(e,t,n,r){const a=t[0];if("."===a){const r=new PropertyCommitter(e,t.slice(1),n);return r.parts}if("@"===a)return[new EventPart(e,t.slice(1),r.eventContext)];if("?"===a)return[new BooleanAttributePart(e,t.slice(1),n)];const s=new AttributeCommitter(e,t,n);return s.parts}/**
     * Create parts for a text-position binding.
     * @param templateFactory
     */handleTextExpression(e){return new NodePart(e)}}const defaultTemplateProcessor=new DefaultTemplateProcessor;/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */ /**
 * The default TemplateFactory which caches Templates keyed on
 * result.type and result.strings.
 */function templateFactory(e){let t=templateCaches.get(e.type);void 0===t&&(t={stringsArray:new WeakMap,keyString:new Map},templateCaches.set(e.type,t));let n=t.stringsArray.get(e.strings);if(void 0!==n)return n;// If the TemplateStringsArray is new, generate a key from the strings
// This key is shared between all templates with identical content
const r=e.strings.join(marker);// Check if we already have a Template for this key
return n=t.keyString.get(r),void 0===n&&(n=new Template(e,e.getTemplateElement()),t.keyString.set(r,n)),t.stringsArray.set(e.strings,n),n}const templateCaches=new Map,parts=new WeakMap,render=(e,t,n)=>{let r=parts.get(t);r===void 0&&(removeNodes(t,t.firstChild),parts.set(t,r=new NodePart(Object.assign({templateFactory},n))),r.appendInto(t)),r.setValue(e),r.commit()};/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */(window.litHtmlVersions||(window.litHtmlVersions=[])).push("1.1.2");/**
 * Interprets a template literal as an HTML template that can efficiently
 * render to and update a container.
 */const html=(e,...t)=>new TemplateResult(e,t,"html",defaultTemplateProcessor),walkerNodeFilter=133/* NodeFilter.SHOW_{ELEMENT|COMMENT|TEXT} */;/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */ /**
 * Removes the list of nodes from a Template safely. In addition to removing
 * nodes from the Template, the Template part indices are updated to match
 * the mutated Template DOM.
 *
 * As the template is walked the removal state is tracked and
 * part indices are adjusted as needed.
 *
 * div
 *   div#1 (remove) <-- start removing (removing node is div#1)
 *     div
 *       div#2 (remove)  <-- continue removing (removing node is still div#1)
 *         div
 * div <-- stop removing since previous sibling is the removing node (div#1,
 * removed 4 nodes)
 */function removeNodesFromTemplate(e,t){const{element:{content:r},parts:n}=e,a=document.createTreeWalker(r,walkerNodeFilter,null,!1);let s=nextActiveIndexInTemplateParts(n),o=n[s],i=-1,d=0;const p=[];for(let r=null;a.nextNode();){i++;const e=a.currentNode;// End removal if stepped past the removing node
for(e.previousSibling===r&&(r=null),t.has(e)&&(p.push(e),null===r&&(r=e)),null!==r&&d++;o!==void 0&&o.index===i;)// If part is in a removed node deactivate it by setting index to -1 or
// adjust the index as needed.
// go to the next active part.
o.index=null===r?o.index-d:-1,s=nextActiveIndexInTemplateParts(n,s),o=n[s]}p.forEach(e=>e.parentNode.removeChild(e))}const countNodes=e=>{let t=11===e.nodeType/* Node.DOCUMENT_FRAGMENT_NODE */?0:1;for(const n=document.createTreeWalker(e,walkerNodeFilter,null,!1);n.nextNode();)t++;return t},nextActiveIndexInTemplateParts=(e,t=-1)=>{for(let n=t+1;n<e.length;n++){const t=e[n];if(isTemplatePartActive(t))return n}return-1};/**
 * Inserts the given node into the Template, optionally before the given
 * refNode. In addition to inserting the node into the Template, the Template
 * part indices are updated to match the mutated Template DOM.
 */function insertNodeIntoTemplate(e,t,n=null){const{element:{content:a},parts:r}=e;// If there's no refNode, then put node at end of template.
// No part indices need to be shifted in this case.
if(null===n||void 0===n)return void a.appendChild(t);const s=document.createTreeWalker(a,walkerNodeFilter,null,!1);let o=nextActiveIndexInTemplateParts(r),i=0,d=-1;for(;s.nextNode();){d++;const e=s.currentNode;for(e===n&&(i=countNodes(t),n.parentNode.insertBefore(t,n));-1!==o&&r[o].index===d;){// If we've inserted the node, simply adjust all subsequent parts
if(0<i){for(;-1!==o;)r[o].index+=i,o=nextActiveIndexInTemplateParts(r,o);return}o=nextActiveIndexInTemplateParts(r,o)}}}/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */ // Get a key to lookup in `templateCaches`.
const getTemplateCacheKey=(e,t)=>`${e}--${t}`;let compatibleShadyCSSVersion=!0;"undefined"==typeof window.ShadyCSS?compatibleShadyCSSVersion=!1:"undefined"==typeof window.ShadyCSS.prepareTemplateDom&&(console.warn("Incompatible ShadyCSS version detected. Please update to at least @webcomponents/webcomponentsjs@2.0.2 and @webcomponents/shadycss@1.3.1."),compatibleShadyCSSVersion=!1);/**
 * Template factory which scopes template DOM using ShadyCSS.
 * @param scopeName {string}
 */const shadyTemplateFactory=e=>t=>{const n=getTemplateCacheKey(t.type,e);let r=templateCaches.get(n);void 0===r&&(r={stringsArray:new WeakMap,keyString:new Map},templateCaches.set(n,r));let a=r.stringsArray.get(t.strings);if(void 0!==a)return a;const s=t.strings.join(marker);if(a=r.keyString.get(s),void 0===a){const n=t.getTemplateElement();compatibleShadyCSSVersion&&window.ShadyCSS.prepareTemplateDom(n,e),a=new Template(t,n),r.keyString.set(s,a)}return r.stringsArray.set(t.strings,a),a},TEMPLATE_TYPES=["html","svg"],removeStylesFromLitTemplates=e=>{TEMPLATE_TYPES.forEach(t=>{const n=templateCaches.get(getTemplateCacheKey(t,e));n!==void 0&&n.keyString.forEach(e=>{const{element:{content:t}}=e,n=new Set;// IE 11 doesn't support the iterable param Set constructor
Array.from(t.querySelectorAll("style")).forEach(e=>{n.add(e)}),removeNodesFromTemplate(e,n)})})},shadyRenderSet=new Set,prepareTemplateStyles=(e,t,n)=>{shadyRenderSet.add(e);// If `renderedDOM` is stamped from a Template, then we need to edit that
// Template's underlying template element. Otherwise, we create one here
// to give to ShadyCSS, which still requires one while scoping.
const r=!n?document.createElement("template"):n.element,a=t.querySelectorAll("style"),{length:s}=a;// Move styles out of rendered DOM and store.
// If there are no styles, skip unnecessary work
if(0===s)return void window.ShadyCSS.prepareTemplateStyles(r,e);const o=document.createElement("style");// Collect styles into a single style. This helps us make sure ShadyCSS
// manipulations will not prevent us from being able to fix up template
// part indices.
// NOTE: collecting styles is inefficient for browsers but ShadyCSS
// currently does this anyway. When it does not, this should be changed.
for(let r=0;r<s;r++){const e=a[r];e.parentNode.removeChild(e),o.textContent+=e.textContent}// Remove styles from nested templates in this scope.
removeStylesFromLitTemplates(e);// And then put the condensed style into the "root" template passed in as
// `template`.
const i=r.content;!n?i.insertBefore(o,i.firstChild):insertNodeIntoTemplate(n,o,i.firstChild),window.ShadyCSS.prepareTemplateStyles(r,e);const d=i.querySelector("style");if(window.ShadyCSS.nativeShadow&&null!==d)// When in native Shadow DOM, ensure the style created by ShadyCSS is
// included in initially rendered output (`renderedDOM`).
t.insertBefore(d.cloneNode(!0),t.firstChild);else if(!!n){i.insertBefore(o,i.firstChild);const e=new Set;e.add(o),removeNodesFromTemplate(n,e)}},render$1=(e,t,n)=>{if(!n||"object"!=typeof n||!n.scopeName)throw new Error("The `scopeName` option is required.");const r=n.scopeName,a=parts.has(t),s=compatibleShadyCSSVersion&&11===t.nodeType/* Node.DOCUMENT_FRAGMENT_NODE */&&!!t.host,o=s&&!shadyRenderSet.has(r),i=o?document.createDocumentFragment():t;// When performing first scope render,
// (1) We've rendered into a fragment so that there's a chance to
// `prepareTemplateStyles` before sub-elements hit the DOM
// (which might cause them to render based on a common pattern of
// rendering in a custom element's `connectedCallback`);
// (2) Scope the template with ShadyCSS one time only for this scope.
// (3) Render the fragment into the container and make sure the
// container knows its `part` is the one we just rendered. This ensures
// DOM will be re-used on subsequent renders.
if(render(e,i,Object.assign({templateFactory:shadyTemplateFactory(r)},n)),o){const e=parts.get(i);parts.delete(i);// ShadyCSS might have style sheets (e.g. from `prepareAdoptedCssText`)
// that should apply to `renderContainer` even if the rendered value is
// not a TemplateInstance. However, it will only insert scoped styles
// into the document if `prepareTemplateStyles` has already been called
// for the given scope name.
const n=e.value instanceof TemplateInstance?e.value.template:void 0;prepareTemplateStyles(r,i,n),removeNodes(t,t.firstChild),t.appendChild(i),parts.set(t,e)}// After elements have hit the DOM, update styling if this is the
// initial render to this container.
// This is needed whenever dynamic changes are made so it would be
// safest to do every render; however, this would regress performance
// so we leave it up to the user to call `ShadyCSS.styleElement`
// for dynamic changes.
!a&&s&&window.ShadyCSS.styleElement(t.host)};/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */var _a;/**
 * When using Closure Compiler, JSCompiler_renameProperty(property, object) is
 * replaced at compile time by the munged name for object[property]. We cannot
 * alias this function, so we have to use a small shim that has the same
 * behavior when not compiling.
 */window.JSCompiler_renameProperty=e=>e;const defaultConverter={toAttribute(e,t){return t===Boolean?e?"":null:t===Object||t===Array?null==e?e:JSON.stringify(e):e},fromAttribute(e,t){return t===Boolean?null!==e:t===Number?null===e?null:+e:t===Object||t===Array?JSON.parse(e):e}},notEqual=(e,t)=>t!==e&&(t===t||e===e),defaultPropertyDeclaration={attribute:!0,type:String,converter:defaultConverter,reflect:!1,hasChanged:notEqual},microtaskPromise=Promise.resolve(!0),STATE_HAS_UPDATED=1,STATE_UPDATE_REQUESTED=4,STATE_IS_REFLECTING_TO_ATTRIBUTE=8,STATE_IS_REFLECTING_TO_PROPERTY=16,STATE_HAS_CONNECTED=32,finalized="finalized";/**
 * Change function that returns true if `value` is different from `oldValue`.
 * This method is used as the default for a property's `hasChanged` function.
 */ /**
 * Base element class which manages element properties and attributes. When
 * properties change, the `update` method is asynchronously called. This method
 * should be supplied by subclassers to render updates as desired.
 */class UpdatingElement extends HTMLElement{constructor(){/**
         * Map with keys for any properties that have changed since the last
         * update cycle with previous values.
         */ /**
         * Map with keys of properties that should be reflected when updated.
         */super(),this._updateState=0,this._instanceProperties=void 0,this._updatePromise=microtaskPromise,this._hasConnectedResolver=void 0,this._changedProperties=new Map,this._reflectingProperties=void 0,this.initialize()}/**
     * Returns a list of attributes corresponding to the registered properties.
     * @nocollapse
     */static get observedAttributes(){this.finalize();const e=[];// Use forEach so this works even if for/of loops are compiled to for loops
// expecting arrays
return this._classProperties.forEach((t,n)=>{const r=this._attributeNameForProperty(n,t);void 0!==r&&(this._attributeToPropertyMap.set(r,n),e.push(r))}),e}/**
     * Ensures the private `_classProperties` property metadata is created.
     * In addition to `finalize` this is also called in `createProperty` to
     * ensure the `@property` decorator can add property metadata.
     */ /** @nocollapse */static _ensureClassProperties(){// ensure private storage for property declarations.
if(!this.hasOwnProperty(JSCompiler_renameProperty("_classProperties",this))){this._classProperties=new Map;// NOTE: Workaround IE11 not supporting Map constructor argument.
const e=Object.getPrototypeOf(this)._classProperties;e!==void 0&&e.forEach((e,t)=>this._classProperties.set(t,e))}}/**
     * Creates a property accessor on the element prototype if one does not exist.
     * The property setter calls the property's `hasChanged` property option
     * or uses a strict identity check to determine whether or not to request
     * an update.
     * @nocollapse
     */static createProperty(e,t=defaultPropertyDeclaration){// Do not generate an accessor if the prototype already has one, since
// it would be lost otherwise and that would never be the user's intention;
// Instead, we expect users to call `requestUpdate` themselves from
// user-defined accessors. Note that if the super has an accessor we will
// still overwrite it
if(this._ensureClassProperties(),this._classProperties.set(e,t),t.noAccessor||this.prototype.hasOwnProperty(e))return;const n="symbol"==typeof e?Symbol():`__${e}`;Object.defineProperty(this.prototype,e,{// tslint:disable-next-line:no-any no symbol in index
get(){return this[n]},set(t){const r=this[e];this[n]=t,this._requestUpdate(e,r)},configurable:!0,enumerable:!0})}/**
     * Creates property accessors for registered properties and ensures
     * any superclasses are also finalized.
     * @nocollapse
     */static finalize(){// finalize any superclasses
const e=Object.getPrototypeOf(this);// make any properties
// Note, only process "own" properties since this element will inherit
// any properties defined on the superClass, and finalization ensures
// the entire prototype chain is finalized.
if(e.hasOwnProperty(finalized)||e.finalize(),this[finalized]=!0,this._ensureClassProperties(),this._attributeToPropertyMap=new Map,this.hasOwnProperty(JSCompiler_renameProperty("properties",this))){const e=this.properties,t=[...Object.getOwnPropertyNames(e),...("function"==typeof Object.getOwnPropertySymbols?Object.getOwnPropertySymbols(e):[])];// support symbols in properties (IE11 does not support this)
// This for/of is ok because propKeys is an array
for(const n of t)// note, use of `any` is due to TypeSript lack of support for symbol in
// index types
// tslint:disable-next-line:no-any no symbol in index
this.createProperty(n,e[n])}}/**
     * Returns the property name for the given attribute `name`.
     * @nocollapse
     */static _attributeNameForProperty(e,t){const n=t.attribute;return!1===n?void 0:"string"==typeof n?n:"string"==typeof e?e.toLowerCase():void 0}/**
     * Returns true if a property should request an update.
     * Called when a property value is set and uses the `hasChanged`
     * option for the property if present or a strict identity check.
     * @nocollapse
     */static _valueHasChanged(e,t,n=notEqual){return n(e,t)}/**
     * Returns the property value for the given attribute value.
     * Called via the `attributeChangedCallback` and uses the property's
     * `converter` or `converter.fromAttribute` property option.
     * @nocollapse
     */static _propertyValueFromAttribute(e,t){const n=t.type,r=t.converter||defaultConverter,a="function"==typeof r?r:r.fromAttribute;return a?a(e,n):e}/**
     * Returns the attribute value for the given property value. If this
     * returns undefined, the property will *not* be reflected to an attribute.
     * If this returns null, the attribute will be removed, otherwise the
     * attribute will be set to the value.
     * This uses the property's `reflect` and `type.toAttribute` property options.
     * @nocollapse
     */static _propertyValueToAttribute(e,t){if(void 0===t.reflect)return;const n=t.type,r=t.converter,a=r&&r.toAttribute||defaultConverter.toAttribute;return a(e,n)}/**
     * Performs element initialization. By default captures any pre-set values for
     * registered properties.
     */initialize(){// ensures first update will be caught by an early access of
// `updateComplete`
this._saveInstanceProperties(),this._requestUpdate()}/**
     * Fixes any properties set on the instance before upgrade time.
     * Otherwise these would shadow the accessor and break these properties.
     * The properties are stored in a Map which is played back after the
     * constructor runs. Note, on very old versions of Safari (<=9) or Chrome
     * (<=41), properties created for native platform properties like (`id` or
     * `name`) may not have default values set in the element constructor. On
     * these browsers native properties appear on instances and therefore their
     * default value will overwrite any element default (e.g. if the element sets
     * this.id = 'id' in the constructor, the 'id' will become '' since this is
     * the native platform default).
     */_saveInstanceProperties(){// Use forEach so this works even if for/of loops are compiled to for loops
// expecting arrays
this.constructor._classProperties.forEach((e,t)=>{if(this.hasOwnProperty(t)){const e=this[t];delete this[t],this._instanceProperties||(this._instanceProperties=new Map),this._instanceProperties.set(t,e)}})}/**
     * Applies previously saved instance properties.
     */_applyInstanceProperties(){// Use forEach so this works even if for/of loops are compiled to for loops
// expecting arrays
// tslint:disable-next-line:no-any
this._instanceProperties.forEach((e,t)=>this[t]=e),this._instanceProperties=void 0}connectedCallback(){this._updateState|=STATE_HAS_CONNECTED,this._hasConnectedResolver&&(this._hasConnectedResolver(),this._hasConnectedResolver=void 0)}/**
     * Allows for `super.disconnectedCallback()` in extensions while
     * reserving the possibility of making non-breaking feature additions
     * when disconnecting at some point in the future.
     */disconnectedCallback(){}/**
     * Synchronizes property values when attributes change.
     */attributeChangedCallback(e,t,n){t!==n&&this._attributeToProperty(e,n)}_propertyToAttribute(e,t,n=defaultPropertyDeclaration){const r=this.constructor,a=r._attributeNameForProperty(e,n);if(a!==void 0){const e=r._propertyValueToAttribute(t,n);// an undefined value does not change the attribute.
if(e===void 0)return;// Track if the property is being reflected to avoid
// setting the property again via `attributeChangedCallback`. Note:
// 1. this takes advantage of the fact that the callback is synchronous.
// 2. will behave incorrectly if multiple attributes are in the reaction
// stack at time of calling. However, since we process attributes
// in `update` this should not be possible (or an extreme corner case
// that we'd like to discover).
// mark state reflecting
// mark state not reflecting
this._updateState|=STATE_IS_REFLECTING_TO_ATTRIBUTE,null==e?this.removeAttribute(a):this.setAttribute(a,e),this._updateState&=~STATE_IS_REFLECTING_TO_ATTRIBUTE}}_attributeToProperty(e,t){// Use tracking info to avoid deserializing attribute value if it was
// just set from a property setter.
if(this._updateState&STATE_IS_REFLECTING_TO_ATTRIBUTE)return;const n=this.constructor,r=n._attributeToPropertyMap.get(e);if(r!==void 0){const e=n._classProperties.get(r)||defaultPropertyDeclaration;// mark state reflecting
// mark state not reflecting
this._updateState|=STATE_IS_REFLECTING_TO_PROPERTY,this[r]=// tslint:disable-next-line:no-any
n._propertyValueFromAttribute(t,e),this._updateState&=~STATE_IS_REFLECTING_TO_PROPERTY}}/**
     * This private version of `requestUpdate` does not access or return the
     * `updateComplete` promise. This promise can be overridden and is therefore
     * not free to access.
     */_requestUpdate(e,t){let n=!0;// If we have a property key, perform property update steps.
if(e!==void 0){const r=this.constructor,a=r._classProperties.get(e)||defaultPropertyDeclaration;r._valueHasChanged(this[e],t,a.hasChanged)?(!this._changedProperties.has(e)&&this._changedProperties.set(e,t),!0===a.reflect&&!(this._updateState&STATE_IS_REFLECTING_TO_PROPERTY)&&(this._reflectingProperties===void 0&&(this._reflectingProperties=new Map),this._reflectingProperties.set(e,a))):n=!1}!this._hasRequestedUpdate&&n&&this._enqueueUpdate()}/**
     * Requests an update which is processed asynchronously. This should
     * be called when an element should update based on some state not triggered
     * by setting a property. In this case, pass no arguments. It should also be
     * called when manually implementing a property setter. In this case, pass the
     * property `name` and `oldValue` to ensure that any configured property
     * options are honored. Returns the `updateComplete` Promise which is resolved
     * when the update completes.
     *
     * @param name {PropertyKey} (optional) name of requesting property
     * @param oldValue {any} (optional) old value of requesting property
     * @returns {Promise} A Promise that is resolved when the update completes.
     */requestUpdate(e,t){return this._requestUpdate(e,t),this.updateComplete}/**
     * Sets up the element to asynchronously update.
     */async _enqueueUpdate(){this._updateState|=STATE_UPDATE_REQUESTED;let e,t;const n=this._updatePromise;this._updatePromise=new Promise((n,r)=>{e=n,t=r});try{// Ensure any previous update has resolved before updating.
// This `await` also ensures that property changes are batched.
await n}catch(t){}// Ignore any previous errors. We only care that the previous cycle is
// done. Any error should have been handled in the previous update.
// Make sure the element has connected before updating.
this._hasConnected||(await new Promise(e=>this._hasConnectedResolver=e));try{const e=this.performUpdate();// If `performUpdate` returns a Promise, we await it. This is done to
// enable coordinating updates with a scheduler. Note, the result is
// checked to avoid delaying an additional microtask unless we need to.
null!=e&&(await e)}catch(n){t(n)}e(!this._hasRequestedUpdate)}get _hasConnected(){return this._updateState&STATE_HAS_CONNECTED}get _hasRequestedUpdate(){return this._updateState&STATE_UPDATE_REQUESTED}get hasUpdated(){return this._updateState&STATE_HAS_UPDATED}/**
     * Performs an element update. Note, if an exception is thrown during the
     * update, `firstUpdated` and `updated` will not be called.
     *
     * You can override this method to change the timing of updates. If this
     * method is overridden, `super.performUpdate()` must be called.
     *
     * For instance, to schedule updates to occur just before the next frame:
     *
     * ```
     * protected async performUpdate(): Promise<unknown> {
     *   await new Promise((resolve) => requestAnimationFrame(() => resolve()));
     *   super.performUpdate();
     * }
     * ```
     */performUpdate(){this._instanceProperties&&this._applyInstanceProperties();let t=!1;const n=this._changedProperties;try{t=this.shouldUpdate(n),t&&this.update(n)}catch(n){throw t=!1,n}finally{// Ensure element can accept additional updates after an exception.
this._markUpdated()}t&&(!(this._updateState&STATE_HAS_UPDATED)&&(this._updateState|=STATE_HAS_UPDATED,this.firstUpdated(n)),this.updated(n))}_markUpdated(){this._changedProperties=new Map,this._updateState&=~STATE_UPDATE_REQUESTED}/**
     * Returns a Promise that resolves when the element has completed updating.
     * The Promise value is a boolean that is `true` if the element completed the
     * update without triggering another update. The Promise result is `false` if
     * a property was set inside `updated()`. If the Promise is rejected, an
     * exception was thrown during the update.
     *
     * To await additional asynchronous work, override the `_getUpdateComplete`
     * method. For example, it is sometimes useful to await a rendered element
     * before fulfilling this Promise. To do this, first await
     * `super._getUpdateComplete()`, then any subsequent state.
     *
     * @returns {Promise} The Promise returns a boolean that indicates if the
     * update resolved without triggering another update.
     */get updateComplete(){return this._getUpdateComplete()}/**
     * Override point for the `updateComplete` promise.
     *
     * It is not safe to override the `updateComplete` getter directly due to a
     * limitation in TypeScript which means it is not possible to call a
     * superclass getter (e.g. `super.updateComplete.then(...)`) when the target
     * language is ES5 (https://github.com/microsoft/TypeScript/issues/338).
     * This method should be overridden instead. For example:
     *
     *   class MyElement extends LitElement {
     *     async _getUpdateComplete() {
     *       await super._getUpdateComplete();
     *       await this._myChild.updateComplete;
     *     }
     *   }
     */_getUpdateComplete(){return this._updatePromise}/**
     * Controls whether or not `update` should be called when the element requests
     * an update. By default, this method always returns `true`, but this can be
     * customized to control when to update.
     *
     * * @param _changedProperties Map of changed properties with old values
     */shouldUpdate(e){return!0}/**
     * Updates the element. This method reflects property values to attributes.
     * It can be overridden to render and keep updated element DOM.
     * Setting properties inside this method will *not* trigger
     * another update.
     *
     * * @param _changedProperties Map of changed properties with old values
     */update(e){this._reflectingProperties!==void 0&&0<this._reflectingProperties.size&&(this._reflectingProperties.forEach((e,t)=>this._propertyToAttribute(t,this[t],e)),this._reflectingProperties=void 0)}/**
     * Invoked whenever the element is updated. Implement to perform
     * post-updating tasks via DOM APIs, for example, focusing an element.
     *
     * Setting properties inside this method will trigger the element to update
     * again after this update cycle completes.
     *
     * * @param _changedProperties Map of changed properties with old values
     */updated(e){}/**
     * Invoked when the element is first updated. Implement to perform one time
     * work on the element after update.
     *
     * Setting properties inside this method will trigger the element to update
     * again after this update cycle completes.
     *
     * * @param _changedProperties Map of changed properties with old values
     */firstUpdated(e){}}_a=finalized,UpdatingElement[_a]=!0;/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */const legacyCustomElement=(e,t)=>(window.customElements.define(e,t),t),standardCustomElement=(e,t)=>{const{kind:n,elements:r}=t;return{kind:n,elements:r,// This callback is called once the class is otherwise fully defined
finisher(t){window.customElements.define(e,t)}}},customElement=e=>t=>"function"==typeof t?legacyCustomElement(e,t):standardCustomElement(e,t),standardProperty=(e,t)=>"method"===t.kind&&t.descriptor&&!("value"in t.descriptor)?Object.assign({},t,{finisher(n){n.createProperty(t.key,e)}}):{kind:"field",key:Symbol(),placement:"own",descriptor:{},// When @babel/plugin-proposal-decorators implements initializers,
// do this instead of the initializer below. See:
// https://github.com/babel/babel/issues/9260 extras: [
//   {
//     kind: 'initializer',
//     placement: 'own',
//     initializer: descriptor.initializer,
//   }
// ],
initializer(){"function"==typeof t.initializer&&(this[t.key]=t.initializer.call(this))},finisher(n){n.createProperty(t.key,e)}},legacyProperty=(e,t,n)=>{t.constructor.createProperty(n,e)};/**
 * A property decorator which creates a LitElement property which reflects a
 * corresponding attribute value. A `PropertyDeclaration` may optionally be
 * supplied to configure property features.
 *
 * @ExportDecoratedItems
 */function property(e){// tslint:disable-next-line:no-any decorator
return(t,n)=>n===void 0?standardProperty(e,t):legacyProperty(e,t,n)}/**
@license
Copyright (c) 2019 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at
http://polymer.github.io/LICENSE.txt The complete set of authors may be found at
http://polymer.github.io/AUTHORS.txt The complete set of contributors may be
found at http://polymer.github.io/CONTRIBUTORS.txt Code distributed by Google as
part of the polymer project is also subject to an additional IP rights grant
found at http://polymer.github.io/PATENTS.txt
*/const supportsAdoptingStyleSheets="adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,constructionToken=Symbol();class CSSResult{constructor(e,t){if(t!==constructionToken)throw new Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e}// Note, this is a getter so that it's lazy. In practice, this means
// stylesheets are not created until the first element instance is made.
get styleSheet(){return void 0===this._styleSheet&&(supportsAdoptingStyleSheets?(this._styleSheet=new CSSStyleSheet,this._styleSheet.replaceSync(this.cssText)):this._styleSheet=null),this._styleSheet}toString(){return this.cssText}}const textFromCSSResult=e=>{if(e instanceof CSSResult)return e.cssText;if("number"==typeof e)return e;throw new Error(`Value passed to 'css' function must be a 'css' function result: ${e}. Use 'unsafeCSS' to pass non-literal values, but
            take care to ensure page security.`)},css=(e,...t)=>{const n=t.reduce((t,n,r)=>t+textFromCSSResult(n)+e[r+1],e[0]);return new CSSResult(n,constructionToken)};/**
 * Template tag which which can be used with LitElement's `style` property to
 * set element styles. For security reasons, only literal string values may be
 * used. To incorporate non-literal values `unsafeCSS` may be used inside a
 * template string part.
 */(window.litElementVersions||(window.litElementVersions=[])).push("2.2.1");/**
 * Minimal implementation of Array.prototype.flat
 * @param arr the array to flatten
 * @param result the accumlated result
 */function arrayFlat(e,t=[]){for(let n=0,r=e.length;n<r;n++){const r=e[n];Array.isArray(r)?arrayFlat(r,t):t.push(r)}return t}/** Deeply flattens styles array. Uses native flat if available. */const flattenStyles=e=>e.flat?e.flat(1/0):arrayFlat(e);class LitElement extends UpdatingElement{/** @nocollapse */static finalize(){// The Closure JS Compiler does not always preserve the correct "this"
// when calling static super methods (b/137460243), so explicitly bind.
// Prepare styling that is stamped at first render time. Styling
// is built from user provided `styles` or is inherited from the superclass.
super.finalize.call(this),this._styles=this.hasOwnProperty(JSCompiler_renameProperty("styles",this))?this._getUniqueStyles():this._styles||[]}/** @nocollapse */static _getUniqueStyles(){// Take care not to call `this.styles` multiple times since this generates
// new CSSResults each time.
// TODO(sorvell): Since we do not cache CSSResults by input, any
// shared styles will generate new stylesheet objects, which is wasteful.
// This should be addressed when a browser ships constructable
// stylesheets.
const e=this.styles,t=[];if(Array.isArray(e)){const n=flattenStyles(e),r=n.reduceRight((e,t)=>(e.add(t),e),new Set);// As a performance optimization to avoid duplicated styling that can
// occur especially when composing via subclassing, de-duplicate styles
// preserving the last item in the list. The last item is kept to
// try to preserve cascade order with the assumption that it's most
// important that last added styles override previous styles.
// Array.from does not work on Set in IE
r.forEach(e=>t.unshift(e))}else e&&t.push(e);return t}/**
     * Performs element initialization. By default this calls `createRenderRoot`
     * to create the element `renderRoot` node and captures any pre-set values for
     * registered properties.
     */initialize(){super.initialize(),this.renderRoot=this.createRenderRoot(),window.ShadowRoot&&this.renderRoot instanceof window.ShadowRoot&&this.adoptStyles()}/**
     * Returns the node into which the element should render and by default
     * creates and returns an open shadowRoot. Implement to customize where the
     * element's DOM is rendered. For example, to render into the element's
     * childNodes, return `this`.
     * @returns {Element|DocumentFragment} Returns a node into which to render.
     */createRenderRoot(){return this.attachShadow({mode:"open"})}/**
     * Applies styling to the element shadowRoot using the `static get styles`
     * property. Styling will apply using `shadowRoot.adoptedStyleSheets` where
     * available and will fallback otherwise. When Shadow DOM is polyfilled,
     * ShadyCSS scopes styles and adds them to the document. When Shadow DOM
     * is available but `adoptedStyleSheets` is not, styles are appended to the
     * end of the `shadowRoot` to [mimic spec
     * behavior](https://wicg.github.io/construct-stylesheets/#using-constructed-stylesheets).
     */adoptStyles(){const e=this.constructor._styles;0===e.length||(window.ShadyCSS===void 0||window.ShadyCSS.nativeShadow?supportsAdoptingStyleSheets?this.renderRoot.adoptedStyleSheets=e.map(e=>e.styleSheet):this._needsShimAdoptedStyleSheets=!0:window.ShadyCSS.ScopingShim.prepareAdoptedCssText(e.map(e=>e.cssText),this.localName));// There are three separate cases here based on Shadow DOM support.
// (1) shadowRoot polyfilled: use ShadyCSS
// (2) shadowRoot.adoptedStyleSheets available: use it.
// (3) shadowRoot.adoptedStyleSheets polyfilled: append styles after
// rendering
}connectedCallback(){super.connectedCallback(),this.hasUpdated&&window.ShadyCSS!==void 0&&window.ShadyCSS.styleElement(this)}/**
     * Updates the element. This method reflects property values to attributes
     * and calls `render` to render DOM via lit-html. Setting properties inside
     * this method will *not* trigger another update.
     * * @param _changedProperties Map of changed properties with old values
     */update(e){super.update(e);const t=this.render();t instanceof TemplateResult&&this.constructor.render(t,this.renderRoot,{scopeName:this.localName,eventContext:this}),this._needsShimAdoptedStyleSheets&&(this._needsShimAdoptedStyleSheets=!1,this.constructor._styles.forEach(e=>{const t=document.createElement("style");t.textContent=e.cssText,this.renderRoot.appendChild(t)}))}/**
     * Invoked on each update to perform rendering tasks. This method must return
     * a lit-html TemplateResult. Setting properties inside this method will *not*
     * trigger the element to update.
     */render(){}}/**
 * Ensure this class is marked as `finalized` as an optimization ensuring
 * it will not needlessly try to `finalize`.
 *
 * Note this property name is a string to prevent breaking Closure JS Compiler
 * optimizations. See updating-element.ts for more information.
 */LitElement.finalized=!0,LitElement.render=render$1;var __decorate=function(e,t,n,a){var s,o=arguments.length,p=3>o?t:null===a?a=Object.getOwnPropertyDescriptor(t,n):a;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)p=Reflect.decorate(e,t,n,a);else for(var l=e.length-1;0<=l;l--)(s=e[l])&&(p=(3>o?s(p):3<o?s(t,n,p):s(t,n))||p);return 3<o&&p&&Object.defineProperty(t,n,p),p};let pwainstall=class extends LitElement{constructor(){// check for beforeinstallprompt support
// handle iOS specifically
super(),this.manifestpath="manifest.json",this.hasprompt=!1,this.usecustom=!1,this.explainer="This app can be installed on your PC or mobile device.  This will allow this web app to look and behave like any other installed up.  You will find it in your app lists and be able to pin it to your home screen, start menus or task bars.  This installed web app will also be able to safely interact with other apps and your operating system. ",this.featuresheader="Key Features",this.descriptionheader="Description",this.installbuttontext="Install",this.cancelbuttontext="Cancel",this.iosinstallinfotext="Tap the share button and then 'Add to Homescreen'",this.isSupportingBrowser=window.hasOwnProperty("BeforeInstallPromptEvent"),this.isIOS=navigator.userAgent.includes("iPhone")||navigator.userAgent.includes("iPad"),this.installed=!1}static get styles(){return css`:host{--install-button-color:linear-gradient(90deg, #1FC2C8 0%, #9337D8 169.8%);--modal-z-index:auto;--modal-background-color:white}button{outline:0}#installModal{background:var(--modal-background-color);position:fixed;bottom:3em;top:3em;left:12em;right:12em;font-family:sans-serif;box-shadow:0 25px 26px rgba(32,36,50,.25),0 5px 9px rgba(51,58,83,.53);border-radius:10px;display:flex;flex-direction:column;padding:0;animation-name:opened;animation-duration:150ms;z-index:var(--modal-z-index)}@keyframes opened{from{transform:scale(.8,.8);opacity:.4}to{transform:scale(1,1);opacity:1}}@keyframes mobile{from{opacity:.6}to{opacity:1}}@keyframes fadein{from{opacity:.2}to{opacity:1}}#background{position:fixed;top:0;bottom:0;left:0;right:0;background:#e3e3e3b0;backdrop-filter:blur(5px);animation-name:fadein;animation-duration:250ms}#headerContainer{display:flex;justify-content:space-between;margin:40px;margin-bottom:32px}#headerContainer h1{font-size:34px;color:#3c3c3c;margin-top:20px;margin-bottom:7px}#headerContainer img{height:122px;width:122px;background:#d3d3d3;border-radius:10px;padding:12px;border-radius:24px;margin-right:24px}#buttonsContainer{display:flex;justify-content:flex-end;position:relative;bottom:-4em;height:100px;background:#dedede75;margin-top:auto;margin-bottom:63px;width:100%;right:0;border-radius:0 0 12px 12px}#installButton,#installCancelButton,#openButton{text-align:center;align-content:center;align-self:center;vertical-align:middle;justify-self:flex-end;line-height:200%;flex:0 0 auto;display:inline-block;background:#0078d4;color:#fff;cursor:pointer;border:solid 1px transparent;outline:0}#installButton,#installCancelButton{min-width:130px;margin-right:30px;background:var(--install-button-color);border-radius:20px;font-weight:600;font-size:14px;line-height:21px;padding-top:10px;padding-bottom:9px;padding-left:20px;padding-right:20px;outline:0;color:#fff}#closeButton{background:0 0;border:none;color:#000;padding-left:12px;padding-right:12px;padding-top:4px;padding-bottom:4px;border-radius:20px;font-weight:600;outline:0;cursor:pointer;align-self:self-end}#contentContainer{margin-left:40px;margin-right:40px}#contentContainer h3{font-size:22px;color:#3c3c3c;margin-bottom:12px}#contentContainer p{font-size:14px;color:#3c3c3c}#featuresScreenDiv{display:flex;justify-content:space-between;margin-right:20px}#featuresScreenDiv h3{font-style:normal;font-weight:600;font-size:22px;line-height:225%;margin-top:0}#keyFeatures{max-height:220px;overflow:hidden}#keyFeatures ul{padding-inline-start:22px;margin-block-start:12px}#featuresScreenDiv #keyFeatures li{font-style:normal;font-weight:600;font-size:16px;line-height:29px;color:rgba(51,51,51,.72)}#screenshotsContainer{display:flex}#screenshotsContainer button{border:none;width:4em;transition:background-color .2s}#screenshotsContainer button:hover{background-color:#bbb}#screenshotsContainer button svg{width:28px;fill:#6b6969}#screenshots{display:flex;scroll-snap-type:x mandatory;flex-wrap:wrap;flex-direction:column;overflow-x:scroll;width:24em;height:14em;-webkit-overflow-scrolling:touch}#screenshots div{display:flex;align-items:center;justify-content:center;scroll-snap-align:start;height:14em;width:100%;background:#efefef}#screenshots img{height:100%}#screenshots::-webkit-scrollbar{display:none}#tagsDiv{margin-top:1em;margin-bottom:1em}#desc{width:40em;font-size:14px;color:#7e7e7e;text-overflow:ellipsis;overflow:hidden}#logoContainer{display:flex}infinite-carousel-wc{background:#f0f0f0;padding-top:14px;padding-bottom:14px;border-radius:22px;max-width:27em;min-height:180px}infinite-carousel-wc>div{display:flex;justify-content:center;align-items:center}infinite-carousel-wc>div>img{max-width:20em;object-fit:contain}#tagsDiv span{background:grey;color:#fff;padding-left:12px;padding-right:12px;padding-bottom:4px;font-weight:700;border-radius:24px;margin-right:12px;padding-top:1px}#iosText{color:var(--install-button-color);margin:2em;text-align:center;font-weight:700;position:relative;bottom:0}@media(max-height:780px){#buttonsContainer{bottom:-1em;background:0 0}}@media(min-width:1445px){#installModal{left:22em;right:22em}}@media(min-width:1800px){#installModal{left:26em;right:26em}}@media(min-width:2000px){#installModal{left:38em;right:38em}}@media(max-width:1220px){#installModal{bottom:0;top:0;left:0;right:0;border-radius:0;animation-name:mobile;animation-duration:250ms}#screenshots{justify-content:center}}@media (max-width:962px){#desc{display:none}#headerContainer{margin-bottom:24px}#headerContainer img{height:42px;width:42px}}@media (max-width:800px){#background{display:none}#installModal{overflow:scroll;box-shadow:none}infinite-carousel-wc{width:100%}#screenshotsContainer{width:100%}#screenshots img{height:180px}#buttonsContainer{display:flex;justify-content:center;bottom:0;margin-bottom:0;border-radius:0;padding-top:1em;padding-bottom:1em}#buttonsContainer #installButton{margin-right:0}#featuresScreenDiv{flex-direction:column;align-items:flex-start;margin-right:0}#headerContainer{margin:20px}#desc{display:none}#contentContainer{margin-left:20px;margin-right:20px}#headerContainer img{height:60px;width:60px;margin-right:12px}}@media(max-width:400px){#headerContainer h1{font-size:26px}#headerContainer img{height:40px;width:40px}#featuresScreenDiv h3{font-size:18px;margin-bottom:0}#keyFeatures ul{margin-top:0}}`}connectedCallback(){super.connectedCallback(),window.addEventListener("beforeinstallprompt",e=>this.handleInstallPromptEvent(e)),document.onkeyup=t=>{"Escape"===t.key&&this.cancel()}}async firstUpdated(){if(this.manifestpath)try{await this.getManifestData()}catch(e){console.error("Error getting manifest, check that you have a valid web manifest")}this.deferredprompt===void 0&&window.addEventListener("beforeinstallprompt",e=>this.handleInstallPromptEvent(e))}handleInstallPromptEvent(e){this.deferredprompt=e,this.hasprompt=!0,e.preventDefault()}// Check that the manifest has our 3 required properties
// If not console an error to the user and return
checkManifest(e){return e.icons&&e.icons[0]?e.name?e.description?void 0:void console.error("Your web manifest must have a description listed"):void console.error("Your web manifest must have a name listed"):void console.error("Your web manifest must have atleast one icon listed")}async getManifestData(){try{const e=await fetch(this.manifestpath),t=await e.json();if(this.manifestdata=t,this.manifestdata)return this.updateButtonColor(this.manifestdata),this.checkManifest(this.manifestdata),t}catch(e){return null}}updateButtonColor(e){e.theme_color&&this.style.setProperty("--install-button-color",e.theme_color)}scrollToLeft(){const e=this.shadowRoot.querySelector("#screenshots");// screenshotsDiv.scrollBy(-10, 0);
e.scrollBy({left:-15,top:0,behavior:"smooth"})}scrollToRight(){const e=this.shadowRoot.querySelector("#screenshots");// screenshotsDiv.scrollBy(10, 0);
e.scrollBy({left:15,top:0,behavior:"smooth"})}openPrompt(){this.openmodal=!0;let e=new CustomEvent("show");this.dispatchEvent(e)}closePrompt(){this.openmodal=!1;let e=new CustomEvent("hide");this.dispatchEvent(e)}shouldShowInstall(){const e=!this.usecustom&&this.isSupportingBrowser&&!0===this.hasprompt||this.isIOS;// return eligibleUser;
return this.showopen||e}async install(){if(this.deferredprompt){this.deferredprompt.prompt();let e=new CustomEvent("show");this.dispatchEvent(e);const t=await this.deferredprompt.userChoice;if("accepted"===t.outcome){this.cancel(),this.installed=!0;let e=new CustomEvent("hide");return this.dispatchEvent(e),!0}else{this.cancel(),this.installed=!0;let e=new CustomEvent("hide");return this.dispatchEvent(e),!1}}}cancel(){this.openmodal=!1,this.hasAttribute("openmodal")&&this.removeAttribute("openmodal");let e=new CustomEvent("hide");this.dispatchEvent(e)}render(){return html`${!1===this.usecustom&&this.showopen||this.shouldShowInstall()&&!0!==this.installed?html`<button id=openButton @click=${()=>this.openPrompt()}><slot>${this.installbuttontext}</slot></button>`:null} ${this.openmodal?html`<div id=background @click=${()=>this.cancel()}></div>`:null} ${this.openmodal?html`<div id=installModal><div id=headerContainer><div id=logoContainer><img src=${this.iconpath?this.iconpath:this.manifestdata.icons[0].src} alt="App Logo"><div id=installTitle><h1>${this.manifestdata.name}</h1><p id=desc>${this.explainer}</p></div></div><button id=closeButton @click=${()=>this.cancel()}><svg width=23 height=22 viewBox="0 0 23 22" fill=none xmlns=http://www.w3.org/2000/svg><path opacity=0.33 fill-rule=evenodd clip-rule=evenodd d="M1.11932 0.357981C1.59693 -0.119327 2.37129 -0.119327 2.8489 0.357981L11.7681 9.27152L20.6873 0.357981C21.165 -0.119327 21.9393 -0.119327 22.4169 0.357981C22.8945 0.835288 22.8945 1.60916 22.4169 2.08646L13.4977 11L22.4169 19.9135C22.8945 20.3908 22.8945 21.1647 22.4169 21.642C21.9393 22.1193 21.165 22.1193 20.6873 21.642L11.7681 12.7285L2.8489 21.642C2.37129 22.1193 1.59693 22.1193 1.11932 21.642C0.641705 21.1647 0.641705 20.3908 1.11932 19.9135L10.0385 11L1.11932 2.08646C0.641705 1.60916 0.641705 0.835288 1.11932 0.357981Z" fill=#60656D /></svg></button></div><div id=contentContainer><div id=featuresScreenDiv>${this.manifestdata.features?html`<div id=keyFeatures><h3>${this.featuresheader}</h3><ul>${this.manifestdata.features?this.manifestdata.features.map(e=>html`<li>${e}</li>`):null}</ul></div>`:null} ${this.manifestdata.screenshots?html`<div id=screenshotsContainer><button @click=${()=>this.scrollToLeft()}><svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 512 512"><path d="M401.4 224h-214l83-79.4c11.9-12.5 11.9-32.7 0-45.2s-31.2-12.5-43.2 0L89 233.4c-6 5.8-9 13.7-9 22.4v.4c0 8.7 3 16.6 9 22.4l138.1 134c12 12.5 31.3 12.5 43.2 0 11.9-12.5 11.9-32.7 0-45.2l-83-79.4h214c16.9 0 30.6-14.3 30.6-32 .1-18-13.6-32-30.5-32z"/></svg></button><section id=screenshots>${this.manifestdata.screenshots.map(e=>html`<div><img alt="App Screenshot" src=${e.src}></div>`)}</section><button @click=${()=>this.scrollToRight()}><svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 512 512"><path d="M284.9 412.6l138.1-134c6-5.8 9-13.7 9-22.4v-.4c0-8.7-3-16.6-9-22.4l-138.1-134c-12-12.5-31.3-12.5-43.2 0-11.9 12.5-11.9 32.7 0 45.2l83 79.4h-214c-17 0-30.7 14.3-30.7 32 0 18 13.7 32 30.6 32h214l-83 79.4c-11.9 12.5-11.9 32.7 0 45.2 12 12.5 31.3 12.5 43.3 0z"/></svg></button></div>`:null}</div><div><h3>${this.descriptionheader}</h3><p>${this.manifestdata.description}</p></div></div>${this.isIOS?html`<p id=iosText>${this.iosinstallinfotext}</p>`:html`<div id=buttonsContainer>${this.deferredprompt?html`<button id=installButton @click=${()=>this.install()}>${this.installbuttontext} ${this.manifestdata.short_name}</button>`:html`<button @click=${()=>this.cancel()} id=installCancelButton>${this.cancelbuttontext}</button>`}</div>`}</div>`:null}`}};__decorate([property()],pwainstall.prototype,"manifestpath",void 0),__decorate([property()],pwainstall.prototype,"iconpath",void 0),__decorate([property()],pwainstall.prototype,"manifestdata",void 0),__decorate([property({type:Boolean})],pwainstall.prototype,"openmodal",void 0),__decorate([property({type:Boolean})],pwainstall.prototype,"showopen",void 0),__decorate([property({type:Boolean})],pwainstall.prototype,"isSupportingBrowser",void 0),__decorate([property({type:Boolean})],pwainstall.prototype,"isIOS",void 0),__decorate([property({type:Boolean})],pwainstall.prototype,"installed",void 0),__decorate([property({type:Boolean})],pwainstall.prototype,"hasprompt",void 0),__decorate([property({type:Boolean})],pwainstall.prototype,"usecustom",void 0),__decorate([property()],pwainstall.prototype,"explainer",void 0),__decorate([property()],pwainstall.prototype,"featuresheader",void 0),__decorate([property()],pwainstall.prototype,"descriptionheader",void 0),__decorate([property()],pwainstall.prototype,"installbuttontext",void 0),__decorate([property()],pwainstall.prototype,"cancelbuttontext",void 0),__decorate([property()],pwainstall.prototype,"iosinstallinfotext",void 0),__decorate([property()],pwainstall.prototype,"deferredprompt",void 0),pwainstall=__decorate([customElement("pwa-install")],pwainstall);export{pwainstall};
//# sourceMappingURL=pwa-install.js.map
