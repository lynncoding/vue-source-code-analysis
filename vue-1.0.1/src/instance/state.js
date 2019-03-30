var _ = require('../util')
var compiler = require('../compiler')
var Observer = require('../observer')
var Dep = require('../observer/dep')
var Watcher = require('../watcher')

/**
 * Setup the scope of an instance, which contains:
 * vue中的状态包括: props. meta, methods, data, computed
 * - observed data
 * - computed properties
 * - user methods
 * - meta properties
 */

exports._initState = function () {
  // 这里的this指向src/vue.js中Vue构造函数this._init(options)的this. 是生成的这个vue实例。
  this._initProps()
  this._initMeta()
  this._initMethods()
  this._initData() // TODO: 如何做数据监听
  this._initComputed()
}

/**
 * Initialize props.
 */

exports._initProps = function () {
  var options = this.$options
  var el = options.el
  var props = options.props
  if (props && !el) {
    process.env.NODE_ENV !== 'production' && _.warn(
      'Props will not be compiled if no `el` option is ' +
      'provided at instantiation.'
    )
  }
  // make sure to convert string selectors into element now
  el = options.el = _.query(el)
  // el.nodeType==1是元素节点
  this._propsUnlinkFn = el && el.nodeType === 1 && props
    // props must be linked in proper scope if inside v-for
    // compileAndLinkProps:
    ? compiler.compileAndLinkProps(this, el, props, this._scope)
    : null
}

/**
 * Initialize the data.
 */

exports._initData = function () {
  var propsData = this._data
  var optionsDataFn = this.$options.data // init时将mergedInstanceDataFn赋值给this.$options.data
  var optionsData = optionsDataFn && optionsDataFn() // optionsData合并了父级子级的options的数据
  if (optionsData) {
    this._data = optionsData
    for (var prop in propsData) {
      if (process.env.NODE_ENV !== 'production' &&
          optionsData.hasOwnProperty(prop)) {
        _.warn(
          'Data field "' + prop + '" is already defined ' +
          'as a prop. Use prop default value instead.'
        )
      }
      if (this._props[prop].raw !== null ||
          !optionsData.hasOwnProperty(prop)) {
        _.set(optionsData, prop, propsData[prop])
      }
    }
  }
  var data = this._data
  // 处理经合并的this._data, 遍历一层它的属性做proxy
  // proxy data on instance
  var keys = Object.keys(data)
  var i, key
  i = keys.length
  while (i--) {
    key = keys[i]
    this._proxy(key) // 代理就是让this._data.testData可以直接this.testData访问
  }
  // observe data **
  Observer.create(data, this) // Observer类的静态方法create()
}

/**
 * Swap the isntance's $data. Called in $data's setter.
 *
 * @param {Object} newData
 */

exports._setData = function (newData) {
  newData = newData || {}
  var oldData = this._data
  this._data = newData
  var keys, key, i
  // unproxy keys not present in new data
  keys = Object.keys(oldData)
  i = keys.length
  while (i--) {
    key = keys[i]
    if (!(key in newData)) {
      this._unproxy(key)
    }
  }
  // proxy keys not already proxied,
  // and trigger change for changed values
  keys = Object.keys(newData)
  i = keys.length
  while (i--) {
    key = keys[i]
    if (!this.hasOwnProperty(key)) {
      // new property
      this._proxy(key)
    }
  }
  oldData.__ob__.removeVm(this)
  Observer.create(newData, this)
  this._digest()
}

/**
 * Proxy a property, so that
 * vm.prop === vm._data.prop
 * 代理一个属性，就是让原本需this._data.prop访问可以直接通过this.prop访问
 * @param {String} key
 */

exports._proxy = function (key) {
  if (!_.isReserved(key)) { // 检查传入的数据是否是Vue的保留字,以$,_开头
    // need to store ref to self here
    // because these getter/setters might
    // be called by child scopes via
    // prototype inheritance.
    var self = this
    Object.defineProperty(self, key, {
      configurable: true,
      enumerable: true,
      get: function proxyGetter () {
        return self._data[key]
      },
      set: function proxySetter (val) {
        self._data[key] = val
      }
    })
  }
}

/**
 * Unproxy a property.
 *
 * @param {String} key
 */

exports._unproxy = function (key) {
  if (!_.isReserved(key)) {
    delete this[key]
  }
}

/**
 * Force update on every watcher in scope.
 */

exports._digest = function () {
  for (var i = 0, l = this._watchers.length; i < l; i++) {
    this._watchers[i].update(true) // shallow updates
  }
}

/**
 * Setup computed properties. They are essentially
 * special getter/setters
 */

function noop () {}
exports._initComputed = function () {
  var computed = this.$options.computed
  if (computed) {
    for (var key in computed) {
      var userDef = computed[key]
      var def = {
        enumerable: true,
        configurable: true
      }
      if (typeof userDef === 'function') {
        def.get = makeComputedGetter(userDef, this)
        def.set = noop
      } else {
        def.get = userDef.get
          ? userDef.cache !== false
            ? makeComputedGetter(userDef.get, this)
            : _.bind(userDef.get, this)
          : noop
        def.set = userDef.set
          ? _.bind(userDef.set, this)
          : noop
      }
      Object.defineProperty(this, key, def)
    }
  }
}

function makeComputedGetter (getter, owner) {
  var watcher = new Watcher(owner, getter, null, {
    lazy: true
  })
  return function computedGetter () {
    if (watcher.dirty) {
      watcher.evaluate()
    }
    if (Dep.target) {
      watcher.depend()
    }
    return watcher.value
  }
}

/**
 * Setup instance methods. Methods must be bound to the
 * instance since they might be passed down as a prop to
 * child components.
 */

exports._initMethods = function () {
  var methods = this.$options.methods
  if (methods) {
    for (var key in methods) {
      this[key] = _.bind(methods[key], this)
    }
  }
}

/**
 * Initialize meta information like $index, $key & $value.
 */

exports._initMeta = function () {
  var metas = this.$options._meta
  if (metas) {
    for (var key in metas) {
      _.defineReactive(this, key, metas[key])
    }
  }
}
