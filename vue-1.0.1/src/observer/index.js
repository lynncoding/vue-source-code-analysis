var _ = require('../util')
var Dep = require('./dep')
var arrayMethods = require('./array')
var arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * Observer class that are attached to each observed
 * object. Once attached, the observer converts target
 * object's property keys into getter/setters that
 * collect dependencies and dispatches updates.
 * Observer类关联到每个被观察的对象，一旦被attached，它将目标对象的属性转换为getter/setter方法，
 * 来收集依赖并分发相应更新
 * 一般来讲数据变化会触发钩子函数，由函数去执行一些操作。但是我们在data中改变数据可以它触发了DOM的变化，这里就是用了Observer
 * Observer 来监视一个对象的变化并且在变化时通知与其相关的 Watcher 来运行回调函数
 * 每个Observer中都有一个dep，一个依赖
 * 在建立Observer时先调用Observer.create()来动态返回一个Observer对象(eg:判断是否已存在observer)
 * @param {Array|Object} value
 * @constructor
 */

function Observer (value) {
  this.value = value
  this.dep = new Dep()
  _.define(value, '__ob__', this) // defineProperty可写，可配置，不可枚举
  if (_.isArray(value)) {
    var augment = _.hasProto
      ? protoAugment
      : copyAugment
    augment(value, arrayMethods, arrayKeys)
    this.observeArray(value)
  } else {
    // 如果不是数组，直接对对象建立getter/setter钩子函数
    this.walk(value)
  }
}

// Static methods

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 *
 * @param {*} value
 * @param {Vue} [vm]
 * @return {Observer|undefined}
 * @static
 */

Observer.create = function (value, vm) {
  if (!value || typeof value !== 'object') {
    return
  }
  var ob
  if (
    value.hasOwnProperty('__ob__') &&
    value.__ob__ instanceof Observer
  ) {
    ob = value.__ob__
  } else if (
    // Object.isFrozen()一个对象是冻结的是指它不可扩展，所有属性都是不可配置的，
    // 且所有数据属性（即没有getter或setter组件的访问器的属性）都是不可写的
    (_.isArray(value) || _.isPlainObject(value)) &&
    !Object.isFrozen(value) &&
    !value._isVue
  ) {
    ob = new Observer(value)
  }
  if (ob && vm) {
    ob.addVm(vm) // vue对象this的observer实例自己也有个this.vms存放这个this
  }
  return ob
}

// Instance methods

/**
 * Walk through each property and convert them into
 * getter/setters. This method should only be called when
 * value type is Object.
 *
 * @param {Object} obj
 */

Observer.prototype.walk = function (obj) {
  var keys = Object.keys(obj)
  var i = keys.length
  while (i--) {
    this.convert(keys[i], obj[keys[i]])
  }
}

/**
 * Observe a list of Array items.
 *
 * @param {Array} items
 */

Observer.prototype.observeArray = function (items) {
  var i = items.length
  while (i--) {
    Observer.create(items[i])
  }
}

/**
 * Convert a property into getter/setter so we can emit
 * the events when the property is accessed/changed.
 *
 * @param {String} key
 * @param {*} val
 */

Observer.prototype.convert = function (key, val) {
  defineReactive(this.value, key, val)
}

/**
 * Add an owner vm, so that when $set/$delete mutations
 * happen we can notify owner vms to proxy the keys and
 * digest the watchers. This is only called when the object
 * is observed as an instance's root $data.
 *
 * @param {Vue} vm
 */

Observer.prototype.addVm = function (vm) {
  (this.vms || (this.vms = [])).push(vm)
}

/**
 * Remove an owner vm. This is called when the object is
 * swapped out as an instance's $data object.
 *
 * @param {Vue} vm
 */

Observer.prototype.removeVm = function (vm) {
  this.vms.$remove(vm)
}

// helpers

/**
 * Augment an target Object or Array by intercepting
 * the prototype chain using __proto__
 *
 * @param {Object|Array} target
 * @param {Object} proto
 */

function protoAugment (target, src) {
  target.__proto__ = src
}

/**
 * Augment an target Object or Array by defining
 * hidden properties.
 *
 * @param {Object|Array} target
 * @param {Object} proto
 */

function copyAugment (target, src, keys) {
  var i = keys.length
  var key
  while (i--) {
    key = keys[i]
    _.define(target, key, src[key])
  }
}

/**
 * Define a reactive property on an Object.
 * 为data中每个属性添加getter/setter的拦截器，每次调用这个属性，都将它的dep自己也作为依赖传入target watcher.
 * 这个函数主要的职责是建立起某个对象属性的get 和 set 钩子，并且通过 observe 函数来获取该对象的 Observer 对象，
 * 新建一个数据依赖 Dep。 在 get 钩子函数中则去处理数据依赖和 Watcher 的关联，
 * 在 set 中调用依赖的 notify 函数通知关联的 Watcher 去运行回调函数。
 * @param {Object} obj
 * @param {String} key
 * @param {*} val
 */

function defineReactive (obj, key, val) {
  var dep = new Dep() // 收集依赖
  var childOb = Observer.create(val) // 数据可能是也是对象，又需要进一步为它创建observer
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function metaGetter () {
      // 什么时候调用getter，当然是用到它的时候，比如<div>{{data}}</div>
      if (Dep.target) { // Dep.target: the current target watcher being evaluated.
        dep.depend() // Add self(here is dep) as a dependency to the target watcher.
        if (childOb) {
          childOb.dep.depend() // 将childOb.dep加入taget wathcher, 而用来计算的wathcer始终只有一个是不是加入后加开始执行计算呢？
        }
        if (_.isArray(val)) { // 如果val是数组，为数组中每个值执行
          for (var e, i = 0, l = val.length; i < l; i++) {
            e = val[i]
            e && e.__ob__ && e.__ob__.dep.depend()
          }
        }
      }
      return val
    },
    set: function metaSetter (newVal) {
      if (newVal === val) return // * 赋值的数据没有变化就不需要执行dep的通知了。
      val = newVal
      childOb = Observer.create(newVal) // 同时为新来的值也设置observer.
      dep.notify()
    }
  })
}

// Attach to the util object so it can be used elsewhere.
_.defineReactive = defineReactive

module.exports = Observer
