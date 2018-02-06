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
    return function(sourceArray, exclusionArray, getId) {
      getId = getId || function(item) {
        return item.id;
      };

      if (exclusionArray && (exclusionArray.length > 0)) {
        return sourceArray.filter(function(sourceItem) {
          var sourceId = getId(sourceItem);

          return !exclusionArray.some(function(exclusionItem) {
            var exclusionId = getId(exclusionItem);

            return sourceItem === exclusionItem
              || (sourceId && exclusionId && angular.equals(sourceId, exclusionId));
          });
        });
      } else {
        return sourceArray;
      }
    };
  }
})();
