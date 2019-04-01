# vue-source-code-analysis
Vue 1.0.1

相比于Vue2.X, 1.X版本没有用Flow进行类型检查，个人觉得看着没那么吃力(太懒)；但是类型信息还是挺有用的，它能帮助我们更好的理解源码，Vue3.0会用TypeScript

源码调试：
1. 直接链接到cdn的一个版本，比如<script src="https://cdn.jsdelivr.net/npm/vue@2.6.10/dist/vue.js"></script>, 然后F12 打断点进行调试

2. 进入项目文件node_modules里面的vue/dist 有多个vue版本; webpack构建的项目，要看webpack配置中alias中vue的真正入口，如下，可以在node_modules/vue/dist/vue.esm.js中需要调试的代码处 写个debugger，F12进行调试
```
  resolve: {
    extensions: ['.js', '.vue','.json'],
    alias: {
      'vue$': 'vue/dist/vue.esm.js',
      '@': resolve('src'),
    }
  },
```
