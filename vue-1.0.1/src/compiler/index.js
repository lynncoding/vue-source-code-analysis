var _ = require('../util')
// require('./compile')中有exports出多个方法，而exports本身是对象，通过extend这样的方式利于文件组织
// 在一处集中导出多个方法。
_.extend(exports, require('./compile'))
_.extend(exports, require('./transclude'))
