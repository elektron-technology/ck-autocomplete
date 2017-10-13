(function() {
  'use strict';

  angular.module('ck-autocomplete')
    .filter('without', withoutFilter);

  /**
   * Filters out from the source array items from the exclusion array that match either by === equality or their id property
   * @returns {Function}
   */
  function withoutFilter() {
    return function(sourceArray, exclusionArray) {
      var filteredArray = [];

      if (exclusionArray && (exclusionArray.length > 0)) {
        angular.forEach(sourceArray, function(sourceItem) {
          var isUnique = true;
          angular.forEach(exclusionArray, function(exclusionItem) {
            if (sourceItem === exclusionItem || (sourceItem.id && exclusionItem.id &&
              angular.equals(sourceItem.id, exclusionItem.id))) {
              isUnique = false;
            }
          });
          if (isUnique) {
            filteredArray.push(sourceItem);
          }
        });
        return filteredArray;
      } else {
        return sourceArray;
      }
    };
  }
  
})();