
* `connectionString` (type: `String`)
* `models` (type: `Array of Object`): 
  * `name` (type: `String`, required)
  * `path` (type: `String`, required)
  * `options` (type: `Object`): 
    * `name` (type: `String`)
    * `description` (type: `String`)
    * `fields` (type: `Object`): 
      * `only` (type: `Array of String`)
      * `remove` (type: `Array of String`)
      * `required` (type: `Array of String`)
    * `inputType` (type: `Object`): 
      * `name` (type: `String`)
      * `description` (type: `String`)
      * `fields` (type: `Object`): 
        * `only` (type: `Array of String`)
        * `remove` (type: `Array of String`)
        * `required` (type: `Array of String`)
      * `resolvers` (type: `Object`): 
        * `findById` -  One of: 
          * `Boolean`
          * `object`: 
            * `filter` (type: `Object`): 
              * `filterTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `onlyIndexed` (type: `Boolean`)
              * `requiredFields` (type: `Array of String`)
              * `operators` -  One of: 
                * `Boolean`
                * `JSON`
              * `removeFields` (type: `Array of String`)
            * `sort` (type: `Object`): 
              * `sortTypeName` (type: `String`)
            * `limit` (type: `Object`): 
              * `defaultValue` (type: `Int`)
            * `record` (type: `Object`): 
              * `recordTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `removeFields` (type: `Array of String`)
              * `requiredFields` (type: `Array of String`)
            * `skip` (type: `Boolean`)
        * `findByIds` -  One of: 
          * `Boolean`
          * `object`: 
            * `filter` (type: `Object`): 
              * `filterTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `onlyIndexed` (type: `Boolean`)
              * `requiredFields` (type: `Array of String`)
              * `operators` -  One of: 
                * `Boolean`
                * `JSON`
              * `removeFields` (type: `Array of String`)
            * `sort` (type: `Object`): 
              * `sortTypeName` (type: `String`)
            * `limit` (type: `Object`): 
              * `defaultValue` (type: `Int`)
            * `record` (type: `Object`): 
              * `recordTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `removeFields` (type: `Array of String`)
              * `requiredFields` (type: `Array of String`)
            * `skip` (type: `Boolean`)
        * `findOne` -  One of: 
          * `Boolean`
          * `object`: 
            * `filter` (type: `Object`): 
              * `filterTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `onlyIndexed` (type: `Boolean`)
              * `requiredFields` (type: `Array of String`)
              * `operators` -  One of: 
                * `Boolean`
                * `JSON`
              * `removeFields` (type: `Array of String`)
            * `sort` (type: `Object`): 
              * `sortTypeName` (type: `String`)
            * `limit` (type: `Object`): 
              * `defaultValue` (type: `Int`)
            * `record` (type: `Object`): 
              * `recordTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `removeFields` (type: `Array of String`)
              * `requiredFields` (type: `Array of String`)
            * `skip` (type: `Boolean`)
        * `findMany` -  One of: 
          * `Boolean`
          * `object`: 
            * `filter` (type: `Object`): 
              * `filterTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `onlyIndexed` (type: `Boolean`)
              * `requiredFields` (type: `Array of String`)
              * `operators` -  One of: 
                * `Boolean`
                * `JSON`
              * `removeFields` (type: `Array of String`)
            * `sort` (type: `Object`): 
              * `sortTypeName` (type: `String`)
            * `limit` (type: `Object`): 
              * `defaultValue` (type: `Int`)
            * `record` (type: `Object`): 
              * `recordTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `removeFields` (type: `Array of String`)
              * `requiredFields` (type: `Array of String`)
            * `skip` (type: `Boolean`)
        * `updateById` -  One of: 
          * `Boolean`
          * `object`: 
            * `filter` (type: `Object`): 
              * `filterTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `onlyIndexed` (type: `Boolean`)
              * `requiredFields` (type: `Array of String`)
              * `operators` -  One of: 
                * `Boolean`
                * `JSON`
              * `removeFields` (type: `Array of String`)
            * `sort` (type: `Object`): 
              * `sortTypeName` (type: `String`)
            * `limit` (type: `Object`): 
              * `defaultValue` (type: `Int`)
            * `record` (type: `Object`): 
              * `recordTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `removeFields` (type: `Array of String`)
              * `requiredFields` (type: `Array of String`)
            * `skip` (type: `Boolean`)
        * `updateOne` -  One of: 
          * `Boolean`
          * `object`: 
            * `filter` (type: `Object`): 
              * `filterTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `onlyIndexed` (type: `Boolean`)
              * `requiredFields` (type: `Array of String`)
              * `operators` -  One of: 
                * `Boolean`
                * `JSON`
              * `removeFields` (type: `Array of String`)
            * `sort` (type: `Object`): 
              * `sortTypeName` (type: `String`)
            * `limit` (type: `Object`): 
              * `defaultValue` (type: `Int`)
            * `record` (type: `Object`): 
              * `recordTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `removeFields` (type: `Array of String`)
              * `requiredFields` (type: `Array of String`)
            * `skip` (type: `Boolean`)
        * `updateMany` -  One of: 
          * `Boolean`
          * `object`: 
            * `filter` (type: `Object`): 
              * `filterTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `onlyIndexed` (type: `Boolean`)
              * `requiredFields` (type: `Array of String`)
              * `operators` -  One of: 
                * `Boolean`
                * `JSON`
              * `removeFields` (type: `Array of String`)
            * `sort` (type: `Object`): 
              * `sortTypeName` (type: `String`)
            * `limit` (type: `Object`): 
              * `defaultValue` (type: `Int`)
            * `record` (type: `Object`): 
              * `recordTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `removeFields` (type: `Array of String`)
              * `requiredFields` (type: `Array of String`)
            * `skip` (type: `Boolean`)
        * `removeById` -  One of: 
          * `Boolean`
          * `object`: 
            * `filter` (type: `Object`): 
              * `filterTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `onlyIndexed` (type: `Boolean`)
              * `requiredFields` (type: `Array of String`)
              * `operators` -  One of: 
                * `Boolean`
                * `JSON`
              * `removeFields` (type: `Array of String`)
            * `sort` (type: `Object`): 
              * `sortTypeName` (type: `String`)
            * `limit` (type: `Object`): 
              * `defaultValue` (type: `Int`)
            * `record` (type: `Object`): 
              * `recordTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `removeFields` (type: `Array of String`)
              * `requiredFields` (type: `Array of String`)
            * `skip` (type: `Boolean`)
        * `removeOne` -  One of: 
          * `Boolean`
          * `object`: 
            * `filter` (type: `Object`): 
              * `filterTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `onlyIndexed` (type: `Boolean`)
              * `requiredFields` (type: `Array of String`)
              * `operators` -  One of: 
                * `Boolean`
                * `JSON`
              * `removeFields` (type: `Array of String`)
            * `sort` (type: `Object`): 
              * `sortTypeName` (type: `String`)
            * `limit` (type: `Object`): 
              * `defaultValue` (type: `Int`)
            * `record` (type: `Object`): 
              * `recordTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `removeFields` (type: `Array of String`)
              * `requiredFields` (type: `Array of String`)
            * `skip` (type: `Boolean`)
        * `removeMany` -  One of: 
          * `Boolean`
          * `object`: 
            * `filter` (type: `Object`): 
              * `filterTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `onlyIndexed` (type: `Boolean`)
              * `requiredFields` (type: `Array of String`)
              * `operators` -  One of: 
                * `Boolean`
                * `JSON`
              * `removeFields` (type: `Array of String`)
            * `sort` (type: `Object`): 
              * `sortTypeName` (type: `String`)
            * `limit` (type: `Object`): 
              * `defaultValue` (type: `Int`)
            * `record` (type: `Object`): 
              * `recordTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `removeFields` (type: `Array of String`)
              * `requiredFields` (type: `Array of String`)
            * `skip` (type: `Boolean`)
        * `createOne` -  One of: 
          * `Boolean`
          * `object`: 
            * `filter` (type: `Object`): 
              * `filterTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `onlyIndexed` (type: `Boolean`)
              * `requiredFields` (type: `Array of String`)
              * `operators` -  One of: 
                * `Boolean`
                * `JSON`
              * `removeFields` (type: `Array of String`)
            * `sort` (type: `Object`): 
              * `sortTypeName` (type: `String`)
            * `limit` (type: `Object`): 
              * `defaultValue` (type: `Int`)
            * `record` (type: `Object`): 
              * `recordTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `removeFields` (type: `Array of String`)
              * `requiredFields` (type: `Array of String`)
            * `skip` (type: `Boolean`)
        * `createMany` -  One of: 
          * `Boolean`
          * `object`: 
            * `filter` (type: `Object`): 
              * `filterTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `onlyIndexed` (type: `Boolean`)
              * `requiredFields` (type: `Array of String`)
              * `operators` -  One of: 
                * `Boolean`
                * `JSON`
              * `removeFields` (type: `Array of String`)
            * `sort` (type: `Object`): 
              * `sortTypeName` (type: `String`)
            * `limit` (type: `Object`): 
              * `defaultValue` (type: `Int`)
            * `record` (type: `Object`): 
              * `recordTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `removeFields` (type: `Array of String`)
              * `requiredFields` (type: `Array of String`)
            * `skip` (type: `Boolean`)
        * `count` -  One of: 
          * `Boolean`
          * `object`: 
            * `filter` (type: `Object`): 
              * `filterTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `onlyIndexed` (type: `Boolean`)
              * `requiredFields` (type: `Array of String`)
              * `operators` -  One of: 
                * `Boolean`
                * `JSON`
              * `removeFields` (type: `Array of String`)
            * `sort` (type: `Object`): 
              * `sortTypeName` (type: `String`)
            * `limit` (type: `Object`): 
              * `defaultValue` (type: `Int`)
            * `record` (type: `Object`): 
              * `recordTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `removeFields` (type: `Array of String`)
              * `requiredFields` (type: `Array of String`)
            * `skip` (type: `Boolean`)
        * `connection` -  One of: 
          * `Boolean`
          * `JSON`
        * `pagination` -  One of: 
          * `Boolean`
          * `object`: 
            * `perPage` (type: `Int`)
    * `resolvers` (type: `Object`): 
      * `findById` -  One of: 
        * `Boolean`
        * `object`: 
          * `filter` (type: `Object`): 
            * `filterTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `onlyIndexed` (type: `Boolean`)
            * `requiredFields` (type: `Array of String`)
            * `operators` -  One of: 
              * `Boolean`
              * `JSON`
            * `removeFields` (type: `Array of String`)
          * `sort` (type: `Object`): 
            * `sortTypeName` (type: `String`)
          * `limit` (type: `Object`): 
            * `defaultValue` (type: `Int`)
          * `record` (type: `Object`): 
            * `recordTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `removeFields` (type: `Array of String`)
            * `requiredFields` (type: `Array of String`)
          * `skip` (type: `Boolean`)
      * `findByIds` -  One of: 
        * `Boolean`
        * `object`: 
          * `filter` (type: `Object`): 
            * `filterTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `onlyIndexed` (type: `Boolean`)
            * `requiredFields` (type: `Array of String`)
            * `operators` -  One of: 
              * `Boolean`
              * `JSON`
            * `removeFields` (type: `Array of String`)
          * `sort` (type: `Object`): 
            * `sortTypeName` (type: `String`)
          * `limit` (type: `Object`): 
            * `defaultValue` (type: `Int`)
          * `record` (type: `Object`): 
            * `recordTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `removeFields` (type: `Array of String`)
            * `requiredFields` (type: `Array of String`)
          * `skip` (type: `Boolean`)
      * `findOne` -  One of: 
        * `Boolean`
        * `object`: 
          * `filter` (type: `Object`): 
            * `filterTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `onlyIndexed` (type: `Boolean`)
            * `requiredFields` (type: `Array of String`)
            * `operators` -  One of: 
              * `Boolean`
              * `JSON`
            * `removeFields` (type: `Array of String`)
          * `sort` (type: `Object`): 
            * `sortTypeName` (type: `String`)
          * `limit` (type: `Object`): 
            * `defaultValue` (type: `Int`)
          * `record` (type: `Object`): 
            * `recordTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `removeFields` (type: `Array of String`)
            * `requiredFields` (type: `Array of String`)
          * `skip` (type: `Boolean`)
      * `findMany` -  One of: 
        * `Boolean`
        * `object`: 
          * `filter` (type: `Object`): 
            * `filterTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `onlyIndexed` (type: `Boolean`)
            * `requiredFields` (type: `Array of String`)
            * `operators` -  One of: 
              * `Boolean`
              * `JSON`
            * `removeFields` (type: `Array of String`)
          * `sort` (type: `Object`): 
            * `sortTypeName` (type: `String`)
          * `limit` (type: `Object`): 
            * `defaultValue` (type: `Int`)
          * `record` (type: `Object`): 
            * `recordTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `removeFields` (type: `Array of String`)
            * `requiredFields` (type: `Array of String`)
          * `skip` (type: `Boolean`)
      * `updateById` -  One of: 
        * `Boolean`
        * `object`: 
          * `filter` (type: `Object`): 
            * `filterTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `onlyIndexed` (type: `Boolean`)
            * `requiredFields` (type: `Array of String`)
            * `operators` -  One of: 
              * `Boolean`
              * `JSON`
            * `removeFields` (type: `Array of String`)
          * `sort` (type: `Object`): 
            * `sortTypeName` (type: `String`)
          * `limit` (type: `Object`): 
            * `defaultValue` (type: `Int`)
          * `record` (type: `Object`): 
            * `recordTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `removeFields` (type: `Array of String`)
            * `requiredFields` (type: `Array of String`)
          * `skip` (type: `Boolean`)
      * `updateOne` -  One of: 
        * `Boolean`
        * `object`: 
          * `filter` (type: `Object`): 
            * `filterTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `onlyIndexed` (type: `Boolean`)
            * `requiredFields` (type: `Array of String`)
            * `operators` -  One of: 
              * `Boolean`
              * `JSON`
            * `removeFields` (type: `Array of String`)
          * `sort` (type: `Object`): 
            * `sortTypeName` (type: `String`)
          * `limit` (type: `Object`): 
            * `defaultValue` (type: `Int`)
          * `record` (type: `Object`): 
            * `recordTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `removeFields` (type: `Array of String`)
            * `requiredFields` (type: `Array of String`)
          * `skip` (type: `Boolean`)
      * `updateMany` -  One of: 
        * `Boolean`
        * `object`: 
          * `filter` (type: `Object`): 
            * `filterTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `onlyIndexed` (type: `Boolean`)
            * `requiredFields` (type: `Array of String`)
            * `operators` -  One of: 
              * `Boolean`
              * `JSON`
            * `removeFields` (type: `Array of String`)
          * `sort` (type: `Object`): 
            * `sortTypeName` (type: `String`)
          * `limit` (type: `Object`): 
            * `defaultValue` (type: `Int`)
          * `record` (type: `Object`): 
            * `recordTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `removeFields` (type: `Array of String`)
            * `requiredFields` (type: `Array of String`)
          * `skip` (type: `Boolean`)
      * `removeById` -  One of: 
        * `Boolean`
        * `object`: 
          * `filter` (type: `Object`): 
            * `filterTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `onlyIndexed` (type: `Boolean`)
            * `requiredFields` (type: `Array of String`)
            * `operators` -  One of: 
              * `Boolean`
              * `JSON`
            * `removeFields` (type: `Array of String`)
          * `sort` (type: `Object`): 
            * `sortTypeName` (type: `String`)
          * `limit` (type: `Object`): 
            * `defaultValue` (type: `Int`)
          * `record` (type: `Object`): 
            * `recordTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `removeFields` (type: `Array of String`)
            * `requiredFields` (type: `Array of String`)
          * `skip` (type: `Boolean`)
      * `removeOne` -  One of: 
        * `Boolean`
        * `object`: 
          * `filter` (type: `Object`): 
            * `filterTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `onlyIndexed` (type: `Boolean`)
            * `requiredFields` (type: `Array of String`)
            * `operators` -  One of: 
              * `Boolean`
              * `JSON`
            * `removeFields` (type: `Array of String`)
          * `sort` (type: `Object`): 
            * `sortTypeName` (type: `String`)
          * `limit` (type: `Object`): 
            * `defaultValue` (type: `Int`)
          * `record` (type: `Object`): 
            * `recordTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `removeFields` (type: `Array of String`)
            * `requiredFields` (type: `Array of String`)
          * `skip` (type: `Boolean`)
      * `removeMany` -  One of: 
        * `Boolean`
        * `object`: 
          * `filter` (type: `Object`): 
            * `filterTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `onlyIndexed` (type: `Boolean`)
            * `requiredFields` (type: `Array of String`)
            * `operators` -  One of: 
              * `Boolean`
              * `JSON`
            * `removeFields` (type: `Array of String`)
          * `sort` (type: `Object`): 
            * `sortTypeName` (type: `String`)
          * `limit` (type: `Object`): 
            * `defaultValue` (type: `Int`)
          * `record` (type: `Object`): 
            * `recordTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `removeFields` (type: `Array of String`)
            * `requiredFields` (type: `Array of String`)
          * `skip` (type: `Boolean`)
      * `createOne` -  One of: 
        * `Boolean`
        * `object`: 
          * `filter` (type: `Object`): 
            * `filterTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `onlyIndexed` (type: `Boolean`)
            * `requiredFields` (type: `Array of String`)
            * `operators` -  One of: 
              * `Boolean`
              * `JSON`
            * `removeFields` (type: `Array of String`)
          * `sort` (type: `Object`): 
            * `sortTypeName` (type: `String`)
          * `limit` (type: `Object`): 
            * `defaultValue` (type: `Int`)
          * `record` (type: `Object`): 
            * `recordTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `removeFields` (type: `Array of String`)
            * `requiredFields` (type: `Array of String`)
          * `skip` (type: `Boolean`)
      * `createMany` -  One of: 
        * `Boolean`
        * `object`: 
          * `filter` (type: `Object`): 
            * `filterTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `onlyIndexed` (type: `Boolean`)
            * `requiredFields` (type: `Array of String`)
            * `operators` -  One of: 
              * `Boolean`
              * `JSON`
            * `removeFields` (type: `Array of String`)
          * `sort` (type: `Object`): 
            * `sortTypeName` (type: `String`)
          * `limit` (type: `Object`): 
            * `defaultValue` (type: `Int`)
          * `record` (type: `Object`): 
            * `recordTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `removeFields` (type: `Array of String`)
            * `requiredFields` (type: `Array of String`)
          * `skip` (type: `Boolean`)
      * `count` -  One of: 
        * `Boolean`
        * `object`: 
          * `filter` (type: `Object`): 
            * `filterTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `onlyIndexed` (type: `Boolean`)
            * `requiredFields` (type: `Array of String`)
            * `operators` -  One of: 
              * `Boolean`
              * `JSON`
            * `removeFields` (type: `Array of String`)
          * `sort` (type: `Object`): 
            * `sortTypeName` (type: `String`)
          * `limit` (type: `Object`): 
            * `defaultValue` (type: `Int`)
          * `record` (type: `Object`): 
            * `recordTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `removeFields` (type: `Array of String`)
            * `requiredFields` (type: `Array of String`)
          * `skip` (type: `Boolean`)
      * `connection` -  One of: 
        * `Boolean`
        * `JSON`
      * `pagination` -  One of: 
        * `Boolean`
        * `object`: 
          * `perPage` (type: `Int`)
* `discriminators` (type: `Array of Object`): 
  * `name` (type: `String`, required)
  * `path` (type: `String`, required)
  * `options` (type: `Object`): 
    * `name` (type: `String`)
    * `description` (type: `String`)
    * `fields` (type: `Object`): 
      * `only` (type: `Array of String`)
      * `remove` (type: `Array of String`)
      * `required` (type: `Array of String`)
    * `inputType` (type: `Object`): 
      * `name` (type: `String`)
      * `description` (type: `String`)
      * `fields` (type: `Object`): 
        * `only` (type: `Array of String`)
        * `remove` (type: `Array of String`)
        * `required` (type: `Array of String`)
      * `resolvers` (type: `Object`): 
        * `findById` -  One of: 
          * `Boolean`
          * `object`: 
            * `filter` (type: `Object`): 
              * `filterTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `onlyIndexed` (type: `Boolean`)
              * `requiredFields` (type: `Array of String`)
              * `operators` -  One of: 
                * `Boolean`
                * `JSON`
              * `removeFields` (type: `Array of String`)
            * `sort` (type: `Object`): 
              * `sortTypeName` (type: `String`)
            * `limit` (type: `Object`): 
              * `defaultValue` (type: `Int`)
            * `record` (type: `Object`): 
              * `recordTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `removeFields` (type: `Array of String`)
              * `requiredFields` (type: `Array of String`)
            * `skip` (type: `Boolean`)
        * `findByIds` -  One of: 
          * `Boolean`
          * `object`: 
            * `filter` (type: `Object`): 
              * `filterTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `onlyIndexed` (type: `Boolean`)
              * `requiredFields` (type: `Array of String`)
              * `operators` -  One of: 
                * `Boolean`
                * `JSON`
              * `removeFields` (type: `Array of String`)
            * `sort` (type: `Object`): 
              * `sortTypeName` (type: `String`)
            * `limit` (type: `Object`): 
              * `defaultValue` (type: `Int`)
            * `record` (type: `Object`): 
              * `recordTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `removeFields` (type: `Array of String`)
              * `requiredFields` (type: `Array of String`)
            * `skip` (type: `Boolean`)
        * `findOne` -  One of: 
          * `Boolean`
          * `object`: 
            * `filter` (type: `Object`): 
              * `filterTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `onlyIndexed` (type: `Boolean`)
              * `requiredFields` (type: `Array of String`)
              * `operators` -  One of: 
                * `Boolean`
                * `JSON`
              * `removeFields` (type: `Array of String`)
            * `sort` (type: `Object`): 
              * `sortTypeName` (type: `String`)
            * `limit` (type: `Object`): 
              * `defaultValue` (type: `Int`)
            * `record` (type: `Object`): 
              * `recordTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `removeFields` (type: `Array of String`)
              * `requiredFields` (type: `Array of String`)
            * `skip` (type: `Boolean`)
        * `findMany` -  One of: 
          * `Boolean`
          * `object`: 
            * `filter` (type: `Object`): 
              * `filterTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `onlyIndexed` (type: `Boolean`)
              * `requiredFields` (type: `Array of String`)
              * `operators` -  One of: 
                * `Boolean`
                * `JSON`
              * `removeFields` (type: `Array of String`)
            * `sort` (type: `Object`): 
              * `sortTypeName` (type: `String`)
            * `limit` (type: `Object`): 
              * `defaultValue` (type: `Int`)
            * `record` (type: `Object`): 
              * `recordTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `removeFields` (type: `Array of String`)
              * `requiredFields` (type: `Array of String`)
            * `skip` (type: `Boolean`)
        * `updateById` -  One of: 
          * `Boolean`
          * `object`: 
            * `filter` (type: `Object`): 
              * `filterTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `onlyIndexed` (type: `Boolean`)
              * `requiredFields` (type: `Array of String`)
              * `operators` -  One of: 
                * `Boolean`
                * `JSON`
              * `removeFields` (type: `Array of String`)
            * `sort` (type: `Object`): 
              * `sortTypeName` (type: `String`)
            * `limit` (type: `Object`): 
              * `defaultValue` (type: `Int`)
            * `record` (type: `Object`): 
              * `recordTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `removeFields` (type: `Array of String`)
              * `requiredFields` (type: `Array of String`)
            * `skip` (type: `Boolean`)
        * `updateOne` -  One of: 
          * `Boolean`
          * `object`: 
            * `filter` (type: `Object`): 
              * `filterTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `onlyIndexed` (type: `Boolean`)
              * `requiredFields` (type: `Array of String`)
              * `operators` -  One of: 
                * `Boolean`
                * `JSON`
              * `removeFields` (type: `Array of String`)
            * `sort` (type: `Object`): 
              * `sortTypeName` (type: `String`)
            * `limit` (type: `Object`): 
              * `defaultValue` (type: `Int`)
            * `record` (type: `Object`): 
              * `recordTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `removeFields` (type: `Array of String`)
              * `requiredFields` (type: `Array of String`)
            * `skip` (type: `Boolean`)
        * `updateMany` -  One of: 
          * `Boolean`
          * `object`: 
            * `filter` (type: `Object`): 
              * `filterTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `onlyIndexed` (type: `Boolean`)
              * `requiredFields` (type: `Array of String`)
              * `operators` -  One of: 
                * `Boolean`
                * `JSON`
              * `removeFields` (type: `Array of String`)
            * `sort` (type: `Object`): 
              * `sortTypeName` (type: `String`)
            * `limit` (type: `Object`): 
              * `defaultValue` (type: `Int`)
            * `record` (type: `Object`): 
              * `recordTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `removeFields` (type: `Array of String`)
              * `requiredFields` (type: `Array of String`)
            * `skip` (type: `Boolean`)
        * `removeById` -  One of: 
          * `Boolean`
          * `object`: 
            * `filter` (type: `Object`): 
              * `filterTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `onlyIndexed` (type: `Boolean`)
              * `requiredFields` (type: `Array of String`)
              * `operators` -  One of: 
                * `Boolean`
                * `JSON`
              * `removeFields` (type: `Array of String`)
            * `sort` (type: `Object`): 
              * `sortTypeName` (type: `String`)
            * `limit` (type: `Object`): 
              * `defaultValue` (type: `Int`)
            * `record` (type: `Object`): 
              * `recordTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `removeFields` (type: `Array of String`)
              * `requiredFields` (type: `Array of String`)
            * `skip` (type: `Boolean`)
        * `removeOne` -  One of: 
          * `Boolean`
          * `object`: 
            * `filter` (type: `Object`): 
              * `filterTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `onlyIndexed` (type: `Boolean`)
              * `requiredFields` (type: `Array of String`)
              * `operators` -  One of: 
                * `Boolean`
                * `JSON`
              * `removeFields` (type: `Array of String`)
            * `sort` (type: `Object`): 
              * `sortTypeName` (type: `String`)
            * `limit` (type: `Object`): 
              * `defaultValue` (type: `Int`)
            * `record` (type: `Object`): 
              * `recordTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `removeFields` (type: `Array of String`)
              * `requiredFields` (type: `Array of String`)
            * `skip` (type: `Boolean`)
        * `removeMany` -  One of: 
          * `Boolean`
          * `object`: 
            * `filter` (type: `Object`): 
              * `filterTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `onlyIndexed` (type: `Boolean`)
              * `requiredFields` (type: `Array of String`)
              * `operators` -  One of: 
                * `Boolean`
                * `JSON`
              * `removeFields` (type: `Array of String`)
            * `sort` (type: `Object`): 
              * `sortTypeName` (type: `String`)
            * `limit` (type: `Object`): 
              * `defaultValue` (type: `Int`)
            * `record` (type: `Object`): 
              * `recordTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `removeFields` (type: `Array of String`)
              * `requiredFields` (type: `Array of String`)
            * `skip` (type: `Boolean`)
        * `createOne` -  One of: 
          * `Boolean`
          * `object`: 
            * `filter` (type: `Object`): 
              * `filterTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `onlyIndexed` (type: `Boolean`)
              * `requiredFields` (type: `Array of String`)
              * `operators` -  One of: 
                * `Boolean`
                * `JSON`
              * `removeFields` (type: `Array of String`)
            * `sort` (type: `Object`): 
              * `sortTypeName` (type: `String`)
            * `limit` (type: `Object`): 
              * `defaultValue` (type: `Int`)
            * `record` (type: `Object`): 
              * `recordTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `removeFields` (type: `Array of String`)
              * `requiredFields` (type: `Array of String`)
            * `skip` (type: `Boolean`)
        * `createMany` -  One of: 
          * `Boolean`
          * `object`: 
            * `filter` (type: `Object`): 
              * `filterTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `onlyIndexed` (type: `Boolean`)
              * `requiredFields` (type: `Array of String`)
              * `operators` -  One of: 
                * `Boolean`
                * `JSON`
              * `removeFields` (type: `Array of String`)
            * `sort` (type: `Object`): 
              * `sortTypeName` (type: `String`)
            * `limit` (type: `Object`): 
              * `defaultValue` (type: `Int`)
            * `record` (type: `Object`): 
              * `recordTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `removeFields` (type: `Array of String`)
              * `requiredFields` (type: `Array of String`)
            * `skip` (type: `Boolean`)
        * `count` -  One of: 
          * `Boolean`
          * `object`: 
            * `filter` (type: `Object`): 
              * `filterTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `onlyIndexed` (type: `Boolean`)
              * `requiredFields` (type: `Array of String`)
              * `operators` -  One of: 
                * `Boolean`
                * `JSON`
              * `removeFields` (type: `Array of String`)
            * `sort` (type: `Object`): 
              * `sortTypeName` (type: `String`)
            * `limit` (type: `Object`): 
              * `defaultValue` (type: `Int`)
            * `record` (type: `Object`): 
              * `recordTypeName` (type: `String`)
              * `isRequired` (type: `Boolean`)
              * `removeFields` (type: `Array of String`)
              * `requiredFields` (type: `Array of String`)
            * `skip` (type: `Boolean`)
        * `connection` -  One of: 
          * `Boolean`
          * `JSON`
        * `pagination` -  One of: 
          * `Boolean`
          * `object`: 
            * `perPage` (type: `Int`)
    * `resolvers` (type: `Object`): 
      * `findById` -  One of: 
        * `Boolean`
        * `object`: 
          * `filter` (type: `Object`): 
            * `filterTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `onlyIndexed` (type: `Boolean`)
            * `requiredFields` (type: `Array of String`)
            * `operators` -  One of: 
              * `Boolean`
              * `JSON`
            * `removeFields` (type: `Array of String`)
          * `sort` (type: `Object`): 
            * `sortTypeName` (type: `String`)
          * `limit` (type: `Object`): 
            * `defaultValue` (type: `Int`)
          * `record` (type: `Object`): 
            * `recordTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `removeFields` (type: `Array of String`)
            * `requiredFields` (type: `Array of String`)
          * `skip` (type: `Boolean`)
      * `findByIds` -  One of: 
        * `Boolean`
        * `object`: 
          * `filter` (type: `Object`): 
            * `filterTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `onlyIndexed` (type: `Boolean`)
            * `requiredFields` (type: `Array of String`)
            * `operators` -  One of: 
              * `Boolean`
              * `JSON`
            * `removeFields` (type: `Array of String`)
          * `sort` (type: `Object`): 
            * `sortTypeName` (type: `String`)
          * `limit` (type: `Object`): 
            * `defaultValue` (type: `Int`)
          * `record` (type: `Object`): 
            * `recordTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `removeFields` (type: `Array of String`)
            * `requiredFields` (type: `Array of String`)
          * `skip` (type: `Boolean`)
      * `findOne` -  One of: 
        * `Boolean`
        * `object`: 
          * `filter` (type: `Object`): 
            * `filterTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `onlyIndexed` (type: `Boolean`)
            * `requiredFields` (type: `Array of String`)
            * `operators` -  One of: 
              * `Boolean`
              * `JSON`
            * `removeFields` (type: `Array of String`)
          * `sort` (type: `Object`): 
            * `sortTypeName` (type: `String`)
          * `limit` (type: `Object`): 
            * `defaultValue` (type: `Int`)
          * `record` (type: `Object`): 
            * `recordTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `removeFields` (type: `Array of String`)
            * `requiredFields` (type: `Array of String`)
          * `skip` (type: `Boolean`)
      * `findMany` -  One of: 
        * `Boolean`
        * `object`: 
          * `filter` (type: `Object`): 
            * `filterTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `onlyIndexed` (type: `Boolean`)
            * `requiredFields` (type: `Array of String`)
            * `operators` -  One of: 
              * `Boolean`
              * `JSON`
            * `removeFields` (type: `Array of String`)
          * `sort` (type: `Object`): 
            * `sortTypeName` (type: `String`)
          * `limit` (type: `Object`): 
            * `defaultValue` (type: `Int`)
          * `record` (type: `Object`): 
            * `recordTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `removeFields` (type: `Array of String`)
            * `requiredFields` (type: `Array of String`)
          * `skip` (type: `Boolean`)
      * `updateById` -  One of: 
        * `Boolean`
        * `object`: 
          * `filter` (type: `Object`): 
            * `filterTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `onlyIndexed` (type: `Boolean`)
            * `requiredFields` (type: `Array of String`)
            * `operators` -  One of: 
              * `Boolean`
              * `JSON`
            * `removeFields` (type: `Array of String`)
          * `sort` (type: `Object`): 
            * `sortTypeName` (type: `String`)
          * `limit` (type: `Object`): 
            * `defaultValue` (type: `Int`)
          * `record` (type: `Object`): 
            * `recordTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `removeFields` (type: `Array of String`)
            * `requiredFields` (type: `Array of String`)
          * `skip` (type: `Boolean`)
      * `updateOne` -  One of: 
        * `Boolean`
        * `object`: 
          * `filter` (type: `Object`): 
            * `filterTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `onlyIndexed` (type: `Boolean`)
            * `requiredFields` (type: `Array of String`)
            * `operators` -  One of: 
              * `Boolean`
              * `JSON`
            * `removeFields` (type: `Array of String`)
          * `sort` (type: `Object`): 
            * `sortTypeName` (type: `String`)
          * `limit` (type: `Object`): 
            * `defaultValue` (type: `Int`)
          * `record` (type: `Object`): 
            * `recordTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `removeFields` (type: `Array of String`)
            * `requiredFields` (type: `Array of String`)
          * `skip` (type: `Boolean`)
      * `updateMany` -  One of: 
        * `Boolean`
        * `object`: 
          * `filter` (type: `Object`): 
            * `filterTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `onlyIndexed` (type: `Boolean`)
            * `requiredFields` (type: `Array of String`)
            * `operators` -  One of: 
              * `Boolean`
              * `JSON`
            * `removeFields` (type: `Array of String`)
          * `sort` (type: `Object`): 
            * `sortTypeName` (type: `String`)
          * `limit` (type: `Object`): 
            * `defaultValue` (type: `Int`)
          * `record` (type: `Object`): 
            * `recordTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `removeFields` (type: `Array of String`)
            * `requiredFields` (type: `Array of String`)
          * `skip` (type: `Boolean`)
      * `removeById` -  One of: 
        * `Boolean`
        * `object`: 
          * `filter` (type: `Object`): 
            * `filterTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `onlyIndexed` (type: `Boolean`)
            * `requiredFields` (type: `Array of String`)
            * `operators` -  One of: 
              * `Boolean`
              * `JSON`
            * `removeFields` (type: `Array of String`)
          * `sort` (type: `Object`): 
            * `sortTypeName` (type: `String`)
          * `limit` (type: `Object`): 
            * `defaultValue` (type: `Int`)
          * `record` (type: `Object`): 
            * `recordTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `removeFields` (type: `Array of String`)
            * `requiredFields` (type: `Array of String`)
          * `skip` (type: `Boolean`)
      * `removeOne` -  One of: 
        * `Boolean`
        * `object`: 
          * `filter` (type: `Object`): 
            * `filterTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `onlyIndexed` (type: `Boolean`)
            * `requiredFields` (type: `Array of String`)
            * `operators` -  One of: 
              * `Boolean`
              * `JSON`
            * `removeFields` (type: `Array of String`)
          * `sort` (type: `Object`): 
            * `sortTypeName` (type: `String`)
          * `limit` (type: `Object`): 
            * `defaultValue` (type: `Int`)
          * `record` (type: `Object`): 
            * `recordTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `removeFields` (type: `Array of String`)
            * `requiredFields` (type: `Array of String`)
          * `skip` (type: `Boolean`)
      * `removeMany` -  One of: 
        * `Boolean`
        * `object`: 
          * `filter` (type: `Object`): 
            * `filterTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `onlyIndexed` (type: `Boolean`)
            * `requiredFields` (type: `Array of String`)
            * `operators` -  One of: 
              * `Boolean`
              * `JSON`
            * `removeFields` (type: `Array of String`)
          * `sort` (type: `Object`): 
            * `sortTypeName` (type: `String`)
          * `limit` (type: `Object`): 
            * `defaultValue` (type: `Int`)
          * `record` (type: `Object`): 
            * `recordTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `removeFields` (type: `Array of String`)
            * `requiredFields` (type: `Array of String`)
          * `skip` (type: `Boolean`)
      * `createOne` -  One of: 
        * `Boolean`
        * `object`: 
          * `filter` (type: `Object`): 
            * `filterTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `onlyIndexed` (type: `Boolean`)
            * `requiredFields` (type: `Array of String`)
            * `operators` -  One of: 
              * `Boolean`
              * `JSON`
            * `removeFields` (type: `Array of String`)
          * `sort` (type: `Object`): 
            * `sortTypeName` (type: `String`)
          * `limit` (type: `Object`): 
            * `defaultValue` (type: `Int`)
          * `record` (type: `Object`): 
            * `recordTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `removeFields` (type: `Array of String`)
            * `requiredFields` (type: `Array of String`)
          * `skip` (type: `Boolean`)
      * `createMany` -  One of: 
        * `Boolean`
        * `object`: 
          * `filter` (type: `Object`): 
            * `filterTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `onlyIndexed` (type: `Boolean`)
            * `requiredFields` (type: `Array of String`)
            * `operators` -  One of: 
              * `Boolean`
              * `JSON`
            * `removeFields` (type: `Array of String`)
          * `sort` (type: `Object`): 
            * `sortTypeName` (type: `String`)
          * `limit` (type: `Object`): 
            * `defaultValue` (type: `Int`)
          * `record` (type: `Object`): 
            * `recordTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `removeFields` (type: `Array of String`)
            * `requiredFields` (type: `Array of String`)
          * `skip` (type: `Boolean`)
      * `count` -  One of: 
        * `Boolean`
        * `object`: 
          * `filter` (type: `Object`): 
            * `filterTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `onlyIndexed` (type: `Boolean`)
            * `requiredFields` (type: `Array of String`)
            * `operators` -  One of: 
              * `Boolean`
              * `JSON`
            * `removeFields` (type: `Array of String`)
          * `sort` (type: `Object`): 
            * `sortTypeName` (type: `String`)
          * `limit` (type: `Object`): 
            * `defaultValue` (type: `Int`)
          * `record` (type: `Object`): 
            * `recordTypeName` (type: `String`)
            * `isRequired` (type: `Boolean`)
            * `removeFields` (type: `Array of String`)
            * `requiredFields` (type: `Array of String`)
          * `skip` (type: `Boolean`)
      * `connection` -  One of: 
        * `Boolean`
        * `JSON`
      * `pagination` -  One of: 
        * `Boolean`
        * `object`: 
          * `perPage` (type: `Int`)