/**
 * @checkit/ck-autocomplete v1.0.11 (https://github.com/elektron-technology/ck-autocomplete)
 * Copyright 2019 Application Team (checkit.net)
 * Licensed under MIT
 */
(function () {
  'use strict';

  angular.module('ck-autocomplete', ['angucomplete-alt']).config(function ($compileProvider) {
    // 1.5 components working with angular 1.6
    $compileProvider.preAssignBindingsEnabled(true);
  }).component('ckAutocomplete', {
    templateUrl: '/autocomplete.tpl.html',
    controller: autocompleteController,
    bindings: {
      model: '=',
      // Property to leave idField of the selection
      onSearch: '&',
      // Function to use to search for matches
      // optional
      onSelected: '&',
      // Function to call after a user has selected an item
      limit: '@',
      // If not provided will take constant value
      findById: '&?',
      // Function to find an entity given its id
      displayField: '@',
      // Property from entity to display in input
      descriptionField: '@',
      // Property to define the desciption field displayed under the title fields in the list
      idField: '@',
      // Property where entity's id is
      returnObject: '=?',
      // Return whole object to model instead of just the id (takes precedence over idField)
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
      elementId: '@',
      // Assign an ng-attr-id to the autocomplete element for identification,
      useCache: '<?',
      fieldRequired: '=?',
      fieldRequiredClass: '@?',
      inputName: '@?'
    }
  });
  autocompleteController.$inject = ['$window', '$element', '$filter', '$scope', '$q', '$timeout', 'ckAutocompleteConfig'];

  function autocompleteController($window, $element, $filter, $scope, $q, $timeout, ckAutocompleteConfig) {
    var self = this; // Set up default values

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
    self.useCache = self.useCache === undefined ? true : self.useCache; // If there is an initial value in model and a function
    // to fetch elements by id, go and grab it

    if (self.model && self.findById) {
      self.findById({
        id: self.model
      }).then(function (entity) {
        self.initialDisplay = entity[self.displayField];
      });
    }

    self.cache = {};
    self.search = search;
    self.onSelect = onSelect;
    self.onChange = onChange;
    self.onFocusOut = onFocusOut;
    self.onFocusIn = onFocusIn; // The position timer is required to allow angucomplete to finish any digest cycles when data is returned

    self.positionTimer = null;
    self.positionTimeout = 100;
    $scope.$on('ck-autocomplete:clearInput', function (event, id) {
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
      var thisSearch; // Do we have any items to be potentially excluded
      // if so we find out how many and ask for that many more so we will
      // always have at least the limit

      var excludedLength = 0;

      if (self.exclusionList) {
        excludedLength = self.exclusionList.length;
      } // If we have any exclusions then we need to abandon use of the cache as every query should be
      // fresh from the cloud


      var useCache = self.useCache && excludedLength === 0;

      if (useCache && term in self.cache) {
        thisSearch = $q.resolve(self.cache[term]);
      } else {
        // Fetch enough results to fulfil the limit even after exclusion
        thisSearch = self.onSearch({
          skip: 0,
          limit: self.limit + 1 + excludedLength,
          term: term
        });
      }

      return thisSearch.then(function (results) {
        // If we're using the cache the add the result before filtering out any exclusions
        if (useCache) {
          self.cache[term] = angular.copy(results);
        } // Do we have any excluded items then filter them


        if (excludedLength > 0) {
          results = $filter('without')(results, self.exclusionList, function (item) {
            return propertyByString(item, self.idField);
          });
        }

        if (results.length > self.limit) {
          $scope.loadMore = true; // Chop the end of the array as we don't need the end items

          results.length = self.limit;
        } else {
          $scope.loadMore = false;
        } // When the drop down is initially displayed the height is indeterminate. It will be calculated once the result
        // set has been returned. The dropdown box position can then be determined


        if (self.positionTimer) {
          $timeout.cancel(self.positionTimer);
        }

        self.positionTimer = $timeout(setDropDownPosition, self.positionTimeout);
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

      resetDropDownPostion();
    }
    /**
     * Check for drop down position when the element gets focus
     */


    function onFocusIn() {
      resetDropDownPostion();

      if (self.positionTimer) {
        $timeout.cancel(self.positionTimer);
      } // Allow plenty of time for the backend to respond to a request before firing


      self.positionTimer = $timeout(setDropDownPosition, self.positionTimeout * 10);
    }
    /**
     * @function resetDropDownPosition
     * Reset the drop down position of the box to under the input field
     */


    function resetDropDownPostion() {
      var dropDown = $element[0].querySelector('.angucomplete-dropdown');
      dropDown.style.top = null;
      dropDown.style.height = null;
    }
    /**
     * @function setDropDownPosition
     * Set the location of the dropdown. If there is not enough space at the bottom of the page the height will be set
     * above the input field. If the dropdown can not all be displayed in the top it is moved either above or below the
     * field, and resized to fit in the remaining space depending on where there in the most space
     */


    function setDropDownPosition() {
      var docTop = $window.pageYOffset + 125,
          docBottom = docTop + $window.innerHeight - 125 - 50,
          fieldTop = $element[0].getBoundingClientRect().top,
          fieldBottom = $element[0].getBoundingClientRect().bottom,
          dropDown = $element[0].querySelector('.angucomplete-dropdown'),
          dropDownTop = dropDown.getBoundingClientRect().height - 6;
      resetDropDownPostion();

      if (self.positionTimer) {
        $timeout.cancel(self.positionTimer);
        self.positionTimer = null;
      } // Check that there is enough space at the bottom of the page


      if (docBottom < fieldBottom + dropDownTop) {
        // If no space at bottom move the dropdown list to the top
        dropDown.style.top = (-dropDownTop).toString() + 'px'; // Prevent top disappearing into menu area

        if (fieldTop - dropDownTop < docTop) {
          // Resize component to fit and move accordingly
          var spaceAtTop = Math.abs(fieldTop - docTop),
              spaceAtBottom = Math.abs(docBottom - fieldBottom);

          if (spaceAtTop > spaceAtBottom) {
            dropDown.style.top = (-(spaceAtTop - 14)).toString() + 'px';
            dropDown.style.height = (spaceAtTop - 8).toString() + 'px';
          } else {
            dropDown.style.top = null;
            dropDown.style.height = spaceAtBottom.toString() + 'px';
          }
        }
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
    }
  }
})();
(function () {
  'use strict';

  angular.module('ck-autocomplete').factory('ckAutocompleteConfig', function () {
    var textSearching = 'Searching...';
    var textNoResults = 'No results';
    var textLoadMore = 'Too many results. Please narrow search';
    return {
      setSearchingText: setSearchingText,
      setNoResultsText: setNoResultsText,
      setLoadMoreText: setLoadMoreText,
      getSearchingText: getSearchingText,
      getNoResultsText: getNoResultsText,
      getLoadMoreText: getLoadMoreText
    };

    function setSearchingText(text) {
      textSearching = text;
    }

    function setNoResultsText(text) {
      textNoResults = text;
    }

    function setLoadMoreText(text) {
      textLoadMore = text;
    }

    function getSearchingText() {
      return textSearching;
    }

    function getNoResultsText() {
      return textNoResults;
    }

    function getLoadMoreText() {
      return textLoadMore;
    }
  });
})();
angular.module('ck-autocomplete').run(['$templateCache', function ($templateCache) {
  $templateCache.put('/autocomplete.list.tpl.html', '<div class="angucomplete-holder" ng-class="{\'angucomplete-dropdown-visible\': showDropdown}">\n  <input id="{{id}}_value" name="{{inputName}}" tabindex="{{fieldTabindex}}"\n         ng-class="{\'angucomplete-input-not-empty\': notEmpty}" ng-model="searchStr" ng-disabled="disableInput"\n         type="{{inputType}}" placeholder="{{placeholder}}" maxlength="{{maxlength}}" ng-focus="onFocusHandler()"\n         class="{{inputClass}}" ng-focus="resetHideResults()" ng-blur="hideResults($event)" autocapitalize="off"\n         autocorrect="off" autocomplete="nope" ng-change="inputChangeHandler(searchStr)"/>\n\n  <div id="{{id}}_dropdown" class="angucomplete-dropdown" ng-show="showDropdown">\n\n    <div class="angucomplete-searching" ng-show="searching" ng-bind="textSearching"></div>\n    <div class="angucomplete-searching" ng-show="!searching && (!results || results.length == 0)"\n         ng-bind="textNoResults"></div>\n\n    <div class="angucomplete-loadmore" disabled ng-show="!searching && $parent.loadMore">\n      {{ $parent.textLoadMore }}\n    </div>\n\n    <div class="angucomplete-row" ng-repeat="result in results" ng-click="selectResult(result)"\n         ng-mouseenter="hoverRow($index)" ng-class="{\'angucomplete-selected-row\': $index == currentIndex}">\n\n      <div class="angucomplete-title"><span class="angucomplete-checkit" ng-repeat="part in result.title" ng-class="{[matchClass]: part.match}">{{part.string}}</span></div>\n\n      <div ng-if="result.description && result.description.length > 0" class="angucomplete-description"><span\n              class="angucomplete-checkit"\n              ng-repeat="part in result.description" ng-click="selectResult(result)"\n              ng-class="{[matchClass]: part.match}">{{part.string}}</span></div>\n    </div>\n\n  </div>\n</div>\n');
  $templateCache.put('/autocomplete.tpl.html', '<span class="autocomplete" angucomplete-alt\n    type="search"\n    ng-attr-id="{{ $ctrl.elementId || undefined }}"\n    placeholder="{{ $ctrl.placeholder }}"\n    minlength="{{ $ctrl.minLength }}"\n    text-searching="{{ $ctrl.textSearching }}"\n    text-no-results="{{ $ctrl.textNoResults }}"\n    template-url="/autocomplete.list.tpl.html"\n\n    remote-api-handler="$ctrl.search"\n    title-field="{{ $ctrl.displayField }}"\n    description-field="{{$ctrl.descriptionField}}"\n    initial-value="$ctrl.initialDisplay"\n\n    input-class="{{$ctrl.listClass}}"\n    match-class="angucomplete-highlight"\n    disable-input="$ctrl.disableInput"\n\n    selected-object="$ctrl.onSelect"\n    input-changed="$ctrl.onChange"\n    clear-selected="{{ $ctrl.clearSelected }}"\n\n    focus-out="$ctrl.onFocusOut()"\n    focus-in="$ctrl.onFocusIn()"\n\n    field-required="$ctrl.fieldRequired"\n    field-required-class="{{$ctrl.fieldRequiredClass}}"\n    input-name="{{$ctrl.inputName}}">\n</span>\n');
}]);
(function () {
  'use strict';

  angular.module('ck-autocomplete').filter('without', withoutFilter);
  /**
   * Filters out from the source array items from the exclusion array that match either by === equality
   * or their id property
   * @returns {Function}
   */

  function withoutFilter() {
    return function (sourceArray, exclusionArray, getId) {
      getId = getId || function (item) {
        return item.id;
      };

      if (exclusionArray && exclusionArray.length > 0) {
        return sourceArray.filter(function (sourceItem) {
          var sourceId = getId(sourceItem);
          return !exclusionArray.some(function (exclusionItem) {
            var exclusionId = getId(exclusionItem);
            return sourceItem === exclusionItem || sourceId && exclusionId && angular.equals(sourceId, exclusionId);
          });
        });
      } else {
        return sourceArray;
      }
    };
  }
})();