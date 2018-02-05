(function() {
  'use strict';

  angular.module('ck-autocomplete')
    .filter('without', withoutFilter);

  /**
   * Filters out from the source array items from the exclusion array that match either by === equality
   * or their id property
   * @returns {Function}
   */
  function withoutFilter() {
    return function(sourceArray, exclusionArray) {
      if (exclusionArray && (exclusionArray.length > 0)) {
        return sourceArray.filter(function(sourceItem) {
          return !exclusionArray.some(function(exclusionItem) {
            return sourceItem === exclusionItem
              || (sourceItem.id && exclusionItem.id && angular.equals(sourceItem.id, exclusionItem.id));
          });
        });
      } else {
        return sourceArray;
      }
    };
  }
})();
