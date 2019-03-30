var _ = require('../util')
var dirParser = require('../parsers/directive') // [src/parsers/directive.js]中的parse方法
var propDef = require('../directives/internal/prop')
var propBindingModes = require('../config')._propBindingModes
var empty = {}

// regexes
var identRE = require('../parsers/path').identRE
var settablePathRE = /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*|\[[^\[\]]+\])*$/

/**
 * Compile props on a root element and return
 * a props link function.
 * 解析拿到的props，其中每个prop格式化成
 * props: [
 *   prop1: {
 *    name, path, options, mode, raw, mode,filters, dynamic
 * }
 * ]
 * @param {Element|DocumentFragment} el
 * @param {Array} propOptions
 * @return {Function} propsLinkFn
 */

module.exports = function compileProps (el, propOptions) {
  var props = []
  var names = Object.keys(propOptions)
  var i = names.length
  var options, name, attr, value, path, parsed, prop
  while (i--) {
    name = names[i]
    options = propOptions[name] || empty

    if (process.env.NODE_ENV !== 'production' && name === '$data') {
      _.warn('Do not use $data as prop.')
      continue
    }

    // props could contain dashes, which will be
    // interpreted as minus calculations by the parser
    // so we need to camelize the path here
    // 如果prop的名称是'row-data'会被解释器解释为减法运算，这里要转换为驼峰形式
    path = _.camelize(name)
    if (!identRE.test(path)) {
      process.env.NODE_ENV !== 'production' && _.warn(
        'Invalid prop key: "' + name + '". Prop keys ' +
        'must be valid identifiers.'
      )
      continue
    }

    prop = {
      name: name,
      path: path,
      options: options,
      mode: propBindingModes.ONE_WAY
    }

    // first check literal version
    attr = _.hyphenate(name)
    // 如果在el的dom节点中发现连字符连接的name，则移除掉它
    value = prop.raw = _.attr(el, attr) // 将获取到的父级传入的prop值赋给prop.raw
    // 如果在子组件中定义了prop但父级没有传入值
    if (value === null) {
      // then check dynamic version
      // 如果绑定的是一个变量(通常以:propName，v-bind:propName绑定)，调用getBindAttr()返回绑定的变量名
      if ((value = _.getBindAttr(el, attr)) === null) {
        if ((value = _.getBindAttr(el, attr + '.sync')) !== null) {
          // v-bind加上.sync修饰符来做双向绑定，但是Props 现在只能单向传递。为了对父组件产生反向影响，子组件需要显式地传递一个事件而不是依赖于隐式地双向绑定
          prop.mode = propBindingModes.TWO_WAY
        } else if ((value = _.getBindAttr(el, attr + '.once')) !== null) {
          // v-bind的.once修饰符
          prop.mode = propBindingModes.ONE_TIME
        }
      }
      // 以下prop绑定的是变量
      prop.raw = value
      if (value !== null) {
        // prop的值如果带有filter, eg: user="selectedUser | nameFormater" 会将其转化为{expression: 'selectedUser', filters:{}}
        parsed = dirParser.parse(value)
        value = parsed.expression
        prop.filters = parsed.filters
        // check binding type
        if (_.isLiteral(value)) {
          // for expressions containing literal numbers and
          // booleans, there's no need to setup a prop binding,
          // so we can optimize them as a one-time set.
          // 如果传入prop的表达式直接是数字(非变量名)，布尔值就不要进行prop绑定了，将其优化成one-time设置，不许单向或双向绑定。
          prop.optimizedLiteral = true
        } else {
          prop.dynamic = true
          // check non-settable path for two-way bindings
          if (process.env.NODE_ENV !== 'production' &&
              prop.mode === propBindingModes.TWO_WAY &&
              !settablePathRE.test(value)) {
            prop.mode = propBindingModes.ONE_WAY
            _.warn(
              'Cannot bind two-way prop with non-settable ' +
              'parent path: ' + value
            )
          }
        }
        prop.parentPath = value

        // warn required two-way
        if (
          process.env.NODE_ENV !== 'production' &&
          options.twoWay &&
          prop.mode !== propBindingModes.TWO_WAY
        ) {
          _.warn(
            'Prop "' + name + '" expects a two-way binding type.'
          )
        }
      } else if (options.required) {
        // warn missing required
        process.env.NODE_ENV !== 'production' && _.warn(
          'Missing required prop: ' + name
        )
      }
    }

    // push prop (组装了name, path, options, mode, raw的属性)
    props.push(prop)
  }
  return makePropsLinkFn(props)
}

/**
 * Build a function that applies props to a vm.
 * 遍历props根据每个prop是否没有传值，是否是动态绑定，是否直接optimizedLiteral...initProp
 * 如果不是动态绑定，直接将传入的prop值传入initProp中，这里操作是vm[propName] = vm._data[propName] = value
 * 即可以通过this.propname,this._data.propname访问prop
 * @param {Array} props
 * @return {Function} propsLinkFn
 */

function makePropsLinkFn (props) {
  return function propsLinkFn (vm, scope) {
    // store resolved props info
    vm._props = {}
    var i = props.length
    var prop, path, options, value, raw
    while (i--) {
      prop = props[i]
      raw = prop.raw
      path = prop.path
      options = prop.options
      vm._props[path] = prop
      if (raw === null) {
        // initialize absent prop 父级没传入prop值，则用子组件中默认值进行初始化
        _.initProp(vm, prop, getDefault(vm, options))
      } else if (prop.dynamic) {
        // dynamic prop
        if (vm._context) {
          if (prop.mode === propBindingModes.ONE_TIME) {
            // one time binding
            value = (scope || vm._context).$get(prop.parentPath)
            _.initProp(vm, prop, value)
          } else {
            // dynamic binding
            // TODO: 如何绑定进行动态绑定的？(mime: 先要去解析父级中这个变量，在赋给当前vm, vm._data)
            vm._bindDir({ // [src/instance/lifecycle.js]
              name: 'prop',
              def: propDef,
              prop: prop
            }, null, null, scope) // el, host, scope
          }
        } else {
          process.env.NODE_ENV !== 'production' && _.warn(
            'Cannot bind dynamic prop on a root instance' +
            ' with no parent: ' + prop.name + '="' +
            raw + '"'
          )
        }
      } else if (prop.optimizedLiteral) {
        // 如果prop的表达式通过v-bind，但其值直接是非变量名，egL 11, true, false
        // optimized literal, cast it and just set once
        raw = _.stripQuotes(raw)
        value = _.toBoolean(_.toNumber(raw))
        _.initProp(vm, prop, value)
      } else {
        // string literal, but we need to cater for
        // Boolean props with no value; eg:<el-table-column show-overflow-tooltip> 这种没有传值的prop
        value = options.type === Boolean && raw === ''
          ? true
          : raw
        _.initProp(vm, prop, value)
      }
    }
  }
}

/**
 * Get the default value of a prop.
 *
 * @param {Vue} vm
 * @param {Object} options
 * @return {*}
 */

function getDefault (vm, options) {
  // no default, return undefined
  if (!options.hasOwnProperty('default')) {
    // absent boolean value defaults to false
    return options.type === Boolean
      ? false
      : undefined
  }
  var def = options.default
  // warn against non-factory defaults for Object & Array
  if (_.isObject(def)) {
    process.env.NODE_ENV !== 'production' && _.warn(
      'Object/Array as default prop values will be shared ' +
      'across multiple instances. Use a factory function ' +
      'to return the default value instead.'
    )
  }
  // call factory function for non-Function types
  return typeof def === 'function' && options.type !== Function
    ? def.call(vm)
    : def
}
