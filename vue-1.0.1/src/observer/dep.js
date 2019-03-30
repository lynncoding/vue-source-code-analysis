var _ = require('../util')
var uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 * Dep 就是一个 Watcher 所对应的数据依赖，在这个对象中也存有一个 subs 数组，用来保存和这个依赖有关的 Watcher。其成员函数最主要的是 depend 和 notify ，
 * 前者用来设置某个 Watcher 的依赖，后者则用来通知与这个依赖相关的 Watcher 来运行其回调函数。
 * @constructor
 */

function Dep () {
  this.id = uid++
  this.subs = []
}

// the current target watcher being evaluated.
// this is globally unique because there could be only one
// watcher being evaluated at any time.
// 是一个watcher，不管这个数据又多少依赖，当前用来计算的watcher只有一个
// TODO: wathcer是做啥计算的呢？
Dep.target = null

/**
 * Add a directive subscriber.
 *
 * @param {Directive} sub
 */

Dep.prototype.addSub = function (sub) {
  this.subs.push(sub)
}

/**
 * Remove a directive subscriber.
 *
 * @param {Directive} sub
 */

Dep.prototype.removeSub = function (sub) {
  this.subs.$remove(sub)
}

/**
 * Add self as a dependency to the target watcher.
 */

Dep.prototype.depend = function () {
  Dep.target.addDep(this) // Dep.target是一个watcher(src/watcher.js)
}

/**
 * Notify all subscribers of a new value.
 */

Dep.prototype.notify = function () {
  // stablize the subscriber list first
  var subs = _.toArray(this.subs)
  for (var i = 0, l = subs.length; i < l; i++) {
    subs[i].update()
  }
}

module.exports = Dep
