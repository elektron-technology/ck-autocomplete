(function() {
  'use strict';

  angular.module('ck-autocomplete', [
    'angucomplete-alt'
  ])
    .config(function($compileProvider) {
      // 1.5 components working with angular 1.6
      $compileProvider.preAssignBindingsEnabled(true);
    })
    .component('ckAutocomplete', {
      templateUrl: 'autocomplete.tpl.html',
      controller: autocompleteController,
      bindings: {
        model: '=', // Property to leave idField of the selection
        onSearch: '&', // Function to use to search for matches
        // optional
        onSelected: '&', // Function to call after a user has selected an item
        limit: '@', // If not provided will take constant value
        findById: '&?', // Function to find an entity given its id
        displayField: '@', // Property from entity to display in input
        descriptionField: '@', // Property to define the desciption field displayed under the title fields in the list
        idField: '@', // Property where entity's id is
        returnObject: '=?', // Return whole object to model instead of just the id (takes precedence over idField)
        placeholder: '@',
        minLength: '@',
        textSearching: '@',
        textNoResults: '@',
        textLoadMore: '@',
        clearOnNoSelection: '=?',
        clearSelected: '@',
        disableInput: '=?',
        exclusionList: '=',
        listClass: '@',
        elementId: '@', // Assign an ng-attr-id to the autocomplete element for identification,
        useCache: '<?'
      }

    });

  autocompleteController.$inject = ['$filter', '$scope', '$q', '$timeout', 'ckAutocompleteConfig'];

  function autocompleteController($filter, $scope, $q, $timeout, ckAutocompleteConfig) {
    var self = this;

    // Set up default values
    $scope.loadMore = false;
    self.limit = self.limit || 10;
    self.displayField = self.displayField || 'name';
    self.descriptionField = self.descriptionField || '';
    self.idField = self.idField || 'id.entityId';
    self.minLength = self.minLength || 0;
    self.textSearching = self.textSearching || ckAutocompleteConfig.getSearchingText();
    self.textNoResults = self.textNoResults || ckAutocompleteConfig.getNoResultsText();
    $scope.textLoadMore = self.textLoadMore || ckAutocompleteConfig.getLoadMoreText();
    self.disableInput = self.disableInput || false;
    self.clearOnNoSelection = self.clearOnNoSelection || false;
    self.returnObject = self.returnObject || false;
    self.listClass = self.listClass || 'form-control';
    self.useCache = self.useCache === undefined ? true : self.useCache;

    // If there is an initial value in model and a function
    // to fetch elements by id, go and grab it
    if (self.model && self.findById) {
      self.findById({ id: self.model }).then(function(entity) {
        self.initialDisplay = entity[self.displayField];
      });
    }

    self.cache = {};

    self.search = search;
    self.onSelect = onSelect;
    self.onChange = onChange;
    self.onFocusOut = onFocusOut;

    $scope.$on('ck-autocomplete:clearInput', function(event, id) {
      clearInput(id);
      self.cache = {};
    });

    /**
     * Performs search. Always asked for one more result than needed
     * in order to work out if we still have more documents to fetch.
     * Once evaluated, it takes it out.
     *
     * It provides first level cache through an dictionary.
     *
     * @param term
     * @returns {Promise}
     */
    function search(term) {
      // Escape any regular expression special characters
      term = term.toLowerCase().replace(/[-[\]{}()*+?.,\\/^$|#\s]/g, '\\$&');
      var thisSearch;
      // Do we have any items to be potentially excluded
      // if so we find out how many and ask for that many more so we will
      // always have at least the limit
      var excludedLength = 0;
      if (self.exclusionList) {
        excludedLength = self.exclusionList.length;
      }
      // If we have any exclusions then we need to abandon use of the cache as every query should be
      // fresh from the cloud
      var useCache = self.useCache && excludedLength === 0;

      if (useCache && term in self.cache) {
        thisSearch = $q.resolve(self.cache[term]);
      } else {
        // Fetch enough results to fulfil the limit even after exclusion
        thisSearch = self.onSearch({ skip: 0, limit: self.limit + 1 + excludedLength, term: term });
      }
      return thisSearch.then(function(results) {
        // If we're using the cache the add the result before filtering out any exclusions
        if (useCache) {
          self.cache[term] = angular.copy(results);
        }
        // Do we have any excluded items then filter them
        if (excludedLength > 0) {
          results = $filter('without')(results, self.exclusionList, function(item) {
            return propertyByString(item, self.idField);
          });
        }

        if (results.length > self.limit) {
          $scope.loadMore = true;
          // Chop the end of the array as we don't need the end items
          results.length = self.limit;
        } else {
          $scope.loadMore = false;
        }
        return results;
      });
    }

    /**
     * When an list item is selected, we set the model according
     * to the field specified as the id
     *
     * @param item
     */
    function onSelect(item) {
      if (!item) {
        if (self.clearOnNoSelection) {
          self.model = undefined;
        }
        return;
      }
      if (self.returnObject) {
        self.model = item.originalObject;
      } else {
        self.model = propertyByString(item.originalObject, self.idField);
      }
      if (self.onSelected) {
        // Using $timeout allows us to pass both function+args in from the template.
        $timeout(self.onSelected, 0);
      }
    }

    /**
     * Clears the model when there is no term to search for
     *
     * @param term
     */
    function onChange(term) {
      // This function can be executed along with/instead of
      // focus-out. However, with focus out we clear selection
      // only when user blurs the input
      if (!term) {
        self.model = undefined;
      }
    }

    /**
     * If clearOnNoSelection is true and no item has been
     * selected, clear any search text when user blurs the
     * input
     */
    function onFocusOut() {
      if (self.clearOnNoSelection && !self.model) {
        clearInput();
      }
    }

    /**
     * Send a broadcast to the 3rd party auto-complete to
     * clear its input. Optionally specify an id to clear
     * just one input, or if no id is given clear all inputs
     * in the current component scope.
     * @param {*} id of input field to clear
     */
    function clearInput(id) {
      if (id) {
        $scope.$broadcast('angucomplete-alt:clearInput', id);
      } else {
        $scope.$broadcast('angucomplete-alt:clearInput');
      }
    }

    /**
     * Given an object, returns the value of the property specified
     * by the string nestedStringProperty. It accepts dot notation.
     *
     * @param object
     * @param nestedStringProperty
     * @returns {*}
    */
    function propertyByString(object, nestedStringProperty) {
      nestedStringProperty = nestedStringProperty.replace(/\[(\w+)\]/g, '.$1'); // Convert indexes to properties
      nestedStringProperty = nestedStringProperty.replace(/^\./, ''); // Strip a leading dot
      var a = nestedStringProperty.split('.');
      for (var i = 0, n = a.length; i < n; ++i) {
        var k = a[i];
        if (k in object) {
          object = object[k];
        } else {
          return;
        }
      }
      return object;
    };

  }

})();