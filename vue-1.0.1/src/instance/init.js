var mergeOptions = require('../util').mergeOptions
var uid = 0

/**
 * The main init sequence. This is called for every
 * instance, including ones that are created from extended
 * constructors.
 * new Vue时调用_init方法，该方法主要设置实例的一些公共属性($xx)，私有属性(_xx)
 * 将传入的options与Vue对象默认options合并，然后
 * @param {Object} options - this options object should be
 *                           the result of merging class
 *                           options and the options passed
 *                           in to the constructor.
 */

exports._init = function (options) {
  options = options || {}

  this.$el = null
  this.$parent = options.parent
  this.$root = this.$parent
    ? this.$parent.$root
    : this
  this.$children = []
  this.$refs = {} // child vm references
  this.$els = {} // element references
  this._watchers = [] // all watchers as an array
  this._directives = [] // all directives

  // a uid
  this._uid = uid++

  // a flag to avoid this being observed
  this._isVue = true

  // events bookkeeping
  this._events = {} // registered callbacks
  this._eventsCount = {} // for $broadcast optimization
  this._shouldPropagate = false // for event propagation

  // fragment instance properties
  this._isFragment = false
  this._fragment = // @type {DocumentFragment}
  this._fragmentStart = // @type {Text|Comment}
  this._fragmentEnd = null // @type {Text|Comment}

  // lifecycle state
  this._isCompiled =
  this._isDestroyed =
  this._isReady =
  this._isAttached =
  this._isBeingDestroyed = false
  this._unlinkFn = null

  // context:
  // if this is a transcluded component, context
  // will be the common parent vm of this instance
  // and its host.
  this._context = options._context || this.$parent

  // scope:
  // if this is inside an inline v-for, the scope
  // will be the intermediate scope created for this
  // repeat fragment. this is used for linking props
  // and container directives.
  this._scope = options._scope

  // fragment:
  // if this instance is compiled inside a Fragment, it
  // needs to reigster itself as a child of that fragment
  // for attach/detach to work properly.
  this._frag = options._frag
  if (this._frag) {
    this._frag.children.push(this)
  }

  // push self into parent / transclusion host
  if (this.$parent) {
    this.$parent.$children.push(this)
  }

  // set ref
  if (options._ref) {
    (this._scope || this._context).$refs[options._ref] = this
  }

  // merge options.
  options = this.$options = mergeOptions( // 生成this.$options 包含this.$options.data = mergedInstanceDataFn
    this.constructor.options, // Vue对象的默认选项，每个vue实例都会拥有
    options,
    this
  )

  // initialize data as empty object.
  // it will be filled up in _initScope().
  this._data = {}

  // call init hook [src/instance/events.js]
  this._callHook('init')

  // initialize data observation and scope inheritance.[src/instance/state.js]
  // 设置实例作用域，包括要观察的数据data，computed属性，用户方法，元属性(meta properties)
  this._initState()

  // setup event system and option events.
  this._initEvents()

  // call created hook
  this._callHook('created')

  // if `el` option is passed, start compilation.
  if (options.el) {
    // 调用mount钩子函数[./lifecycle.js]
    this.$mount(options.el)
  }
}
