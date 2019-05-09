/**
 * @checkit/ck-autocomplete v2.0.0 (https://github.com/elektron-technology/ck-autocomplete)
 * Copyright 2019 Application Team (checkit.net)
 * Licensed under MIT
 */
(function () {
  'use strict';

  angular.module('ck-autocomplete', ['angucomplete-alt']).config(function ($compileProvider) {
    $compileProvider.preAssignBindingsEnabled(true);
  }).component('ckAutocomplete', {
    templateUrl: '/autocomplete.tpl.html',
    controller: autocompleteController,
    bindings: {
      model: '=',
      onSearch: '&',
      onSelected: '&',
      limit: '@',
      findById: '&?',
      displayField: '@',
      descriptionField: '@',
      idField: '@',
      returnObject: '=?',
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
      useCache: '<?',
      fieldRequired: '=?',
      fieldRequiredClass: '@?',
      inputName: '@?'
    }
  });
  autocompleteController.$inject = ['$window', '$element', '$filter', '$scope', '$q', '$timeout', 'ckAutocompleteConfig'];

  function autocompleteController($window, $element, $filter, $scope, $q, $timeout, ckAutocompleteConfig) {
    var self = this;
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
    self.onFocusIn = onFocusIn;
    self.positionTimer = null;
    self.positionTimeout = 100;
    $scope.$on('ck-autocomplete:clearInput', function (event, id) {
      clearInput(id);
      self.cache = {};
    });

    function search(term) {
      term = term.toLowerCase().replace(/[-[\]{}()*+?.,\\/^$|#\s]/g, '\\$&');
      var thisSearch;
      var excludedLength = 0;

      if (self.exclusionList) {
        excludedLength = self.exclusionList.length;
      }

      var useCache = self.useCache && excludedLength === 0;

      if (useCache && term in self.cache) {
        thisSearch = $q.resolve(self.cache[term]);
      } else {
        thisSearch = self.onSearch({
          skip: 0,
          limit: self.limit + 1 + excludedLength,
          term: term
        });
      }

      return thisSearch.then(function (results) {
        if (useCache) {
          self.cache[term] = angular.copy(results);
        }

        if (excludedLength > 0) {
          results = $filter('without')(results, self.exclusionList, function (item) {
            return propertyByString(item, self.idField);
          });
        }

        if (results.length > self.limit) {
          $scope.loadMore = true;
          results.length = self.limit;
        } else {
          $scope.loadMore = false;
        }

        if (self.positionTimer) {
          $timeout.cancel(self.positionTimer);
        }

        self.positionTimer = $timeout(setDropDownPosition, self.positionTimeout);
        return results;
      });
    }

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
        $timeout(self.onSelected, 0);
      }
    }

    function onChange(term) {
      if (!term) {
        self.model = undefined;
      }
    }

    function onFocusOut() {
      if (self.clearOnNoSelection && !self.model) {
        clearInput();
      }

      resetDropDownPostion();
    }

    function onFocusIn() {
      resetDropDownPostion();

      if (self.positionTimer) {
        $timeout.cancel(self.positionTimer);
      }

      self.positionTimer = $timeout(setDropDownPosition, self.positionTimeout * 10);
    }

    function resetDropDownPostion() {
      var dropDown = $element[0].querySelector('.angucomplete-dropdown');
      dropDown.style.top = null;
      dropDown.style.height = null;
    }

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
      }

      if (docBottom < fieldBottom + dropDownTop) {
        dropDown.style.top = (-dropDownTop).toString() + 'px';

        if (fieldTop - dropDownTop < docTop) {
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

    function clearInput(id) {
      if (id) {
        $scope.$broadcast('angucomplete-alt:clearInput', id);
      } else {
        $scope.$broadcast('angucomplete-alt:clearInput');
      }
    }

    function propertyByString(object, nestedStringProperty) {
      nestedStringProperty = nestedStringProperty.replace(/\[(\w+)\]/g, '.$1');
      nestedStringProperty = nestedStringProperty.replace(/^\./, '');
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
  $templateCache.put('/autocomplete.list.tpl.html', '<div class="angucomplete-holder" ng-class="{\'angucomplete-dropdown-visible\': showDropdown}">\n  <input id="{{id}}_value" name="{{inputName}}" tabindex="{{fieldTabindex}}"\n         ng-class="{\'angucomplete-input-not-empty\': notEmpty}" ng-model="searchStr" ng-disabled="disableInput"\n         type="{{inputType}}" placeholder="{{placeholder}}" maxlength="{{maxlength}}" ng-focus="onFocusHandler()"\n         class="{{inputClass}}" ng-focus="resetHideResults()" ng-blur="hideResults($event)" autocapitalize="off"\n         autocorrect="off" autocomplete="off" ng-change="inputChangeHandler(searchStr)"/>\n\n  <div id="{{id}}_dropdown" class="angucomplete-dropdown" ng-show="showDropdown">\n\n    <div class="angucomplete-searching" ng-show="searching" ng-bind="textSearching"></div>\n    <div class="angucomplete-searching" ng-show="!searching && (!results || results.length == 0)"\n         ng-bind="textNoResults"></div>\n\n    <div class="angucomplete-loadmore" disabled ng-show="!searching && $parent.loadMore">\n      {{ $parent.textLoadMore }}\n    </div>\n\n    <div class="angucomplete-row" ng-repeat="result in results" ng-click="selectResult(result)"\n         ng-mouseenter="hoverRow($index)" ng-class="{\'angucomplete-selected-row\': $index == currentIndex}">\n\n      <div class="angucomplete-title"><span class="angucomplete-checkit" ng-repeat="part in result.title" ng-class="{[matchClass]: part.match}">{{part.string}}</span></div>\n\n      <div ng-if="result.description && result.description.length > 0" class="angucomplete-description"><span\n              class="angucomplete-checkit"\n              ng-repeat="part in result.description" ng-click="selectResult(result)"\n              ng-class="{[matchClass]: part.match}">{{part.string}}</span></div>\n    </div>\n\n  </div>\n</div>\n');
  $templateCache.put('/autocomplete.tpl.html', '<span class="autocomplete" angucomplete-alt\n    type="search"\n    ng-attr-id="{{ $ctrl.elementId || undefined }}"\n    placeholder="{{ $ctrl.placeholder }}"\n    minlength="{{ $ctrl.minLength }}"\n    text-searching="{{ $ctrl.textSearching }}"\n    text-no-results="{{ $ctrl.textNoResults }}"\n    template-url="/autocomplete.list.tpl.html"\n\n    remote-api-handler="$ctrl.search"\n    title-field="{{ $ctrl.displayField }}"\n    description-field="{{$ctrl.descriptionField}}"\n    initial-value="$ctrl.initialDisplay"\n\n    input-class="{{$ctrl.listClass}}"\n    match-class="angucomplete-highlight"\n    disable-input="$ctrl.disableInput"\n\n    selected-object="$ctrl.onSelect"\n    input-changed="$ctrl.onChange"\n    clear-selected="{{ $ctrl.clearSelected }}"\n\n    focus-out="$ctrl.onFocusOut()"\n    focus-in="$ctrl.onFocusIn()"\n\n    field-required="$ctrl.fieldRequired"\n    field-required-class="{{$ctrl.fieldRequiredClass}}"\n    input-name="{{$ctrl.inputName}}">\n</span>\n');
}]);
(function () {
  'use strict';

  angular.module('ck-autocomplete').filter('without', withoutFilter);

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImF1dG9jb21wbGV0ZS5jb21wb25lbnQuanMiLCJhdXRvY29tcGxldGUuY29uZmlnLmZhY3RvcnkuanMiLCJ0ZW1wbGF0ZXMuanMiLCJmaWx0ZXJzL3dpdGhvdXQuZmlsdGVyLmpzIl0sIm5hbWVzIjpbImFuZ3VsYXIiLCJtb2R1bGUiLCJjb25maWciLCIkY29tcGlsZVByb3ZpZGVyIiwicHJlQXNzaWduQmluZGluZ3NFbmFibGVkIiwiY29tcG9uZW50IiwidGVtcGxhdGVVcmwiLCJjb250cm9sbGVyIiwiYXV0b2NvbXBsZXRlQ29udHJvbGxlciIsImJpbmRpbmdzIiwibW9kZWwiLCJvblNlYXJjaCIsIm9uU2VsZWN0ZWQiLCJsaW1pdCIsImZpbmRCeUlkIiwiZGlzcGxheUZpZWxkIiwiZGVzY3JpcHRpb25GaWVsZCIsImlkRmllbGQiLCJyZXR1cm5PYmplY3QiLCJwbGFjZWhvbGRlciIsIm1pbkxlbmd0aCIsInRleHRTZWFyY2hpbmciLCJ0ZXh0Tm9SZXN1bHRzIiwidGV4dExvYWRNb3JlIiwiY2xlYXJPbk5vU2VsZWN0aW9uIiwiY2xlYXJTZWxlY3RlZCIsImRpc2FibGVJbnB1dCIsImV4Y2x1c2lvbkxpc3QiLCJsaXN0Q2xhc3MiLCJlbGVtZW50SWQiLCJ1c2VDYWNoZSIsImZpZWxkUmVxdWlyZWQiLCJmaWVsZFJlcXVpcmVkQ2xhc3MiLCJpbnB1dE5hbWUiLCIkaW5qZWN0IiwiJHdpbmRvdyIsIiRlbGVtZW50IiwiJGZpbHRlciIsIiRzY29wZSIsIiRxIiwiJHRpbWVvdXQiLCJja0F1dG9jb21wbGV0ZUNvbmZpZyIsInNlbGYiLCJsb2FkTW9yZSIsImdldFNlYXJjaGluZ1RleHQiLCJnZXROb1Jlc3VsdHNUZXh0IiwiZ2V0TG9hZE1vcmVUZXh0IiwidW5kZWZpbmVkIiwiaWQiLCJ0aGVuIiwiZW50aXR5IiwiaW5pdGlhbERpc3BsYXkiLCJjYWNoZSIsInNlYXJjaCIsIm9uU2VsZWN0Iiwib25DaGFuZ2UiLCJvbkZvY3VzT3V0Iiwib25Gb2N1c0luIiwicG9zaXRpb25UaW1lciIsInBvc2l0aW9uVGltZW91dCIsIiRvbiIsImV2ZW50IiwiY2xlYXJJbnB1dCIsInRlcm0iLCJ0b0xvd2VyQ2FzZSIsInJlcGxhY2UiLCJ0aGlzU2VhcmNoIiwiZXhjbHVkZWRMZW5ndGgiLCJsZW5ndGgiLCJyZXNvbHZlIiwic2tpcCIsInJlc3VsdHMiLCJjb3B5IiwiaXRlbSIsInByb3BlcnR5QnlTdHJpbmciLCJjYW5jZWwiLCJzZXREcm9wRG93blBvc2l0aW9uIiwib3JpZ2luYWxPYmplY3QiLCJyZXNldERyb3BEb3duUG9zdGlvbiIsImRyb3BEb3duIiwicXVlcnlTZWxlY3RvciIsInN0eWxlIiwidG9wIiwiaGVpZ2h0IiwiZG9jVG9wIiwicGFnZVlPZmZzZXQiLCJkb2NCb3R0b20iLCJpbm5lckhlaWdodCIsImZpZWxkVG9wIiwiZ2V0Qm91bmRpbmdDbGllbnRSZWN0IiwiZmllbGRCb3R0b20iLCJib3R0b20iLCJkcm9wRG93blRvcCIsInRvU3RyaW5nIiwic3BhY2VBdFRvcCIsIk1hdGgiLCJhYnMiLCJzcGFjZUF0Qm90dG9tIiwiJGJyb2FkY2FzdCIsIm9iamVjdCIsIm5lc3RlZFN0cmluZ1Byb3BlcnR5IiwiYSIsInNwbGl0IiwiaSIsIm4iLCJrIiwiZmFjdG9yeSIsInNldFNlYXJjaGluZ1RleHQiLCJzZXROb1Jlc3VsdHNUZXh0Iiwic2V0TG9hZE1vcmVUZXh0IiwidGV4dCIsInJ1biIsIiR0ZW1wbGF0ZUNhY2hlIiwicHV0IiwiZmlsdGVyIiwid2l0aG91dEZpbHRlciIsInNvdXJjZUFycmF5IiwiZXhjbHVzaW9uQXJyYXkiLCJnZXRJZCIsInNvdXJjZUl0ZW0iLCJzb3VyY2VJZCIsInNvbWUiLCJleGNsdXNpb25JdGVtIiwiZXhjbHVzaW9uSWQiLCJlcXVhbHMiXSwibWFwcGluZ3MiOiJBQUFBLENBQUMsWUFBVztBQUNWOztBQUVBQSxFQUFBQSxPQUFPLENBQUNDLE1BQVIsQ0FBZSxpQkFBZixFQUFrQyxDQUNoQyxrQkFEZ0MsQ0FBbEMsRUFHR0MsTUFISCxDQUdVLFVBQVNDLGdCQUFULEVBQTJCO0FBRWpDQSxJQUFBQSxnQkFBZ0IsQ0FBQ0Msd0JBQWpCLENBQTBDLElBQTFDO0FBQ0QsR0FOSCxFQU9HQyxTQVBILENBT2EsZ0JBUGIsRUFPK0I7QUFDM0JDLElBQUFBLFdBQVcsRUFBRSx3QkFEYztBQUUzQkMsSUFBQUEsVUFBVSxFQUFFQyxzQkFGZTtBQUczQkMsSUFBQUEsUUFBUSxFQUFFO0FBQ1JDLE1BQUFBLEtBQUssRUFBRSxHQURDO0FBRVJDLE1BQUFBLFFBQVEsRUFBRSxHQUZGO0FBSVJDLE1BQUFBLFVBQVUsRUFBRSxHQUpKO0FBS1JDLE1BQUFBLEtBQUssRUFBRSxHQUxDO0FBTVJDLE1BQUFBLFFBQVEsRUFBRSxJQU5GO0FBT1JDLE1BQUFBLFlBQVksRUFBRSxHQVBOO0FBUVJDLE1BQUFBLGdCQUFnQixFQUFFLEdBUlY7QUFTUkMsTUFBQUEsT0FBTyxFQUFFLEdBVEQ7QUFVUkMsTUFBQUEsWUFBWSxFQUFFLElBVk47QUFXUkMsTUFBQUEsV0FBVyxFQUFFLEdBWEw7QUFZUkMsTUFBQUEsU0FBUyxFQUFFLEdBWkg7QUFhUkMsTUFBQUEsYUFBYSxFQUFFLEdBYlA7QUFjUkMsTUFBQUEsYUFBYSxFQUFFLEdBZFA7QUFlUkMsTUFBQUEsWUFBWSxFQUFFLEdBZk47QUFnQlJDLE1BQUFBLGtCQUFrQixFQUFFLElBaEJaO0FBaUJSQyxNQUFBQSxhQUFhLEVBQUUsR0FqQlA7QUFrQlJDLE1BQUFBLFlBQVksRUFBRSxJQWxCTjtBQW1CUkMsTUFBQUEsYUFBYSxFQUFFLEdBbkJQO0FBb0JSQyxNQUFBQSxTQUFTLEVBQUUsR0FwQkg7QUFxQlJDLE1BQUFBLFNBQVMsRUFBRSxHQXJCSDtBQXNCUkMsTUFBQUEsUUFBUSxFQUFFLElBdEJGO0FBdUJSQyxNQUFBQSxhQUFhLEVBQUUsSUF2QlA7QUF3QlJDLE1BQUFBLGtCQUFrQixFQUFFLElBeEJaO0FBeUJSQyxNQUFBQSxTQUFTLEVBQUU7QUF6Qkg7QUFIaUIsR0FQL0I7QUF3Q0F6QixFQUFBQSxzQkFBc0IsQ0FBQzBCLE9BQXZCLEdBQWlDLENBQUMsU0FBRCxFQUFZLFVBQVosRUFBd0IsU0FBeEIsRUFBbUMsUUFBbkMsRUFBNkMsSUFBN0MsRUFBbUQsVUFBbkQsRUFDL0Isc0JBRCtCLENBQWpDOztBQUdBLFdBQVMxQixzQkFBVCxDQUFnQzJCLE9BQWhDLEVBQXlDQyxRQUF6QyxFQUFtREMsT0FBbkQsRUFBNERDLE1BQTVELEVBQW9FQyxFQUFwRSxFQUF3RUMsUUFBeEUsRUFBa0ZDLG9CQUFsRixFQUF3RztBQUN0RyxRQUFJQyxJQUFJLEdBQUcsSUFBWDtBQUdBSixJQUFBQSxNQUFNLENBQUNLLFFBQVAsR0FBa0IsS0FBbEI7QUFDQUQsSUFBQUEsSUFBSSxDQUFDN0IsS0FBTCxHQUFhNkIsSUFBSSxDQUFDN0IsS0FBTCxJQUFjLEVBQTNCO0FBQ0E2QixJQUFBQSxJQUFJLENBQUMzQixZQUFMLEdBQW9CMkIsSUFBSSxDQUFDM0IsWUFBTCxJQUFxQixNQUF6QztBQUNBMkIsSUFBQUEsSUFBSSxDQUFDMUIsZ0JBQUwsR0FBd0IwQixJQUFJLENBQUMxQixnQkFBTCxJQUF5QixFQUFqRDtBQUNBMEIsSUFBQUEsSUFBSSxDQUFDekIsT0FBTCxHQUFleUIsSUFBSSxDQUFDekIsT0FBTCxJQUFnQixhQUEvQjtBQUNBeUIsSUFBQUEsSUFBSSxDQUFDdEIsU0FBTCxHQUFpQnNCLElBQUksQ0FBQ3RCLFNBQUwsSUFBa0IsQ0FBbkM7QUFDQXNCLElBQUFBLElBQUksQ0FBQ3JCLGFBQUwsR0FBcUJxQixJQUFJLENBQUNyQixhQUFMLElBQXNCb0Isb0JBQW9CLENBQUNHLGdCQUFyQixFQUEzQztBQUNBRixJQUFBQSxJQUFJLENBQUNwQixhQUFMLEdBQXFCb0IsSUFBSSxDQUFDcEIsYUFBTCxJQUFzQm1CLG9CQUFvQixDQUFDSSxnQkFBckIsRUFBM0M7QUFDQVAsSUFBQUEsTUFBTSxDQUFDZixZQUFQLEdBQXNCbUIsSUFBSSxDQUFDbkIsWUFBTCxJQUFxQmtCLG9CQUFvQixDQUFDSyxlQUFyQixFQUEzQztBQUNBSixJQUFBQSxJQUFJLENBQUNoQixZQUFMLEdBQW9CZ0IsSUFBSSxDQUFDaEIsWUFBTCxJQUFxQixLQUF6QztBQUNBZ0IsSUFBQUEsSUFBSSxDQUFDbEIsa0JBQUwsR0FBMEJrQixJQUFJLENBQUNsQixrQkFBTCxJQUEyQixLQUFyRDtBQUNBa0IsSUFBQUEsSUFBSSxDQUFDeEIsWUFBTCxHQUFvQndCLElBQUksQ0FBQ3hCLFlBQUwsSUFBcUIsS0FBekM7QUFDQXdCLElBQUFBLElBQUksQ0FBQ2QsU0FBTCxHQUFpQmMsSUFBSSxDQUFDZCxTQUFMLElBQWtCLGNBQW5DO0FBQ0FjLElBQUFBLElBQUksQ0FBQ1osUUFBTCxHQUFnQlksSUFBSSxDQUFDWixRQUFMLEtBQWtCaUIsU0FBbEIsR0FBOEIsSUFBOUIsR0FBcUNMLElBQUksQ0FBQ1osUUFBMUQ7O0FBSUEsUUFBSVksSUFBSSxDQUFDaEMsS0FBTCxJQUFjZ0MsSUFBSSxDQUFDNUIsUUFBdkIsRUFBaUM7QUFDL0I0QixNQUFBQSxJQUFJLENBQUM1QixRQUFMLENBQWM7QUFBRWtDLFFBQUFBLEVBQUUsRUFBRU4sSUFBSSxDQUFDaEM7QUFBWCxPQUFkLEVBQWtDdUMsSUFBbEMsQ0FBdUMsVUFBU0MsTUFBVCxFQUFpQjtBQUN0RFIsUUFBQUEsSUFBSSxDQUFDUyxjQUFMLEdBQXNCRCxNQUFNLENBQUNSLElBQUksQ0FBQzNCLFlBQU4sQ0FBNUI7QUFDRCxPQUZEO0FBR0Q7O0FBRUQyQixJQUFBQSxJQUFJLENBQUNVLEtBQUwsR0FBYSxFQUFiO0FBRUFWLElBQUFBLElBQUksQ0FBQ1csTUFBTCxHQUFjQSxNQUFkO0FBQ0FYLElBQUFBLElBQUksQ0FBQ1ksUUFBTCxHQUFnQkEsUUFBaEI7QUFDQVosSUFBQUEsSUFBSSxDQUFDYSxRQUFMLEdBQWdCQSxRQUFoQjtBQUNBYixJQUFBQSxJQUFJLENBQUNjLFVBQUwsR0FBa0JBLFVBQWxCO0FBQ0FkLElBQUFBLElBQUksQ0FBQ2UsU0FBTCxHQUFpQkEsU0FBakI7QUFFQWYsSUFBQUEsSUFBSSxDQUFDZ0IsYUFBTCxHQUFxQixJQUFyQjtBQUNBaEIsSUFBQUEsSUFBSSxDQUFDaUIsZUFBTCxHQUF1QixHQUF2QjtBQUVBckIsSUFBQUEsTUFBTSxDQUFDc0IsR0FBUCxDQUFXLDRCQUFYLEVBQXlDLFVBQVNDLEtBQVQsRUFBZ0JiLEVBQWhCLEVBQW9CO0FBQzNEYyxNQUFBQSxVQUFVLENBQUNkLEVBQUQsQ0FBVjtBQUNBTixNQUFBQSxJQUFJLENBQUNVLEtBQUwsR0FBYSxFQUFiO0FBQ0QsS0FIRDs7QUFlQSxhQUFTQyxNQUFULENBQWdCVSxJQUFoQixFQUFzQjtBQUVwQkEsTUFBQUEsSUFBSSxHQUFHQSxJQUFJLENBQUNDLFdBQUwsR0FBbUJDLE9BQW5CLENBQTJCLDJCQUEzQixFQUF3RCxNQUF4RCxDQUFQO0FBQ0EsVUFBSUMsVUFBSjtBQUlBLFVBQUlDLGNBQWMsR0FBRyxDQUFyQjs7QUFDQSxVQUFJekIsSUFBSSxDQUFDZixhQUFULEVBQXdCO0FBQ3RCd0MsUUFBQUEsY0FBYyxHQUFHekIsSUFBSSxDQUFDZixhQUFMLENBQW1CeUMsTUFBcEM7QUFDRDs7QUFHRCxVQUFJdEMsUUFBUSxHQUFHWSxJQUFJLENBQUNaLFFBQUwsSUFBaUJxQyxjQUFjLEtBQUssQ0FBbkQ7O0FBRUEsVUFBSXJDLFFBQVEsSUFBSWlDLElBQUksSUFBSXJCLElBQUksQ0FBQ1UsS0FBN0IsRUFBb0M7QUFDbENjLFFBQUFBLFVBQVUsR0FBRzNCLEVBQUUsQ0FBQzhCLE9BQUgsQ0FBVzNCLElBQUksQ0FBQ1UsS0FBTCxDQUFXVyxJQUFYLENBQVgsQ0FBYjtBQUNELE9BRkQsTUFFTztBQUVMRyxRQUFBQSxVQUFVLEdBQUd4QixJQUFJLENBQUMvQixRQUFMLENBQWM7QUFBRTJELFVBQUFBLElBQUksRUFBRSxDQUFSO0FBQVd6RCxVQUFBQSxLQUFLLEVBQUU2QixJQUFJLENBQUM3QixLQUFMLEdBQWEsQ0FBYixHQUFpQnNELGNBQW5DO0FBQW1ESixVQUFBQSxJQUFJLEVBQUVBO0FBQXpELFNBQWQsQ0FBYjtBQUNEOztBQUNELGFBQU9HLFVBQVUsQ0FBQ2pCLElBQVgsQ0FBZ0IsVUFBU3NCLE9BQVQsRUFBa0I7QUFFdkMsWUFBSXpDLFFBQUosRUFBYztBQUNaWSxVQUFBQSxJQUFJLENBQUNVLEtBQUwsQ0FBV1csSUFBWCxJQUFtQi9ELE9BQU8sQ0FBQ3dFLElBQVIsQ0FBYUQsT0FBYixDQUFuQjtBQUNEOztBQUVELFlBQUlKLGNBQWMsR0FBRyxDQUFyQixFQUF3QjtBQUN0QkksVUFBQUEsT0FBTyxHQUFHbEMsT0FBTyxDQUFDLFNBQUQsQ0FBUCxDQUFtQmtDLE9BQW5CLEVBQTRCN0IsSUFBSSxDQUFDZixhQUFqQyxFQUFnRCxVQUFTOEMsSUFBVCxFQUFlO0FBQ3ZFLG1CQUFPQyxnQkFBZ0IsQ0FBQ0QsSUFBRCxFQUFPL0IsSUFBSSxDQUFDekIsT0FBWixDQUF2QjtBQUNELFdBRlMsQ0FBVjtBQUdEOztBQUVELFlBQUlzRCxPQUFPLENBQUNILE1BQVIsR0FBaUIxQixJQUFJLENBQUM3QixLQUExQixFQUFpQztBQUMvQnlCLFVBQUFBLE1BQU0sQ0FBQ0ssUUFBUCxHQUFrQixJQUFsQjtBQUVBNEIsVUFBQUEsT0FBTyxDQUFDSCxNQUFSLEdBQWlCMUIsSUFBSSxDQUFDN0IsS0FBdEI7QUFDRCxTQUpELE1BSU87QUFDTHlCLFVBQUFBLE1BQU0sQ0FBQ0ssUUFBUCxHQUFrQixLQUFsQjtBQUNEOztBQUlELFlBQUlELElBQUksQ0FBQ2dCLGFBQVQsRUFBd0I7QUFDdEJsQixVQUFBQSxRQUFRLENBQUNtQyxNQUFULENBQWdCakMsSUFBSSxDQUFDZ0IsYUFBckI7QUFDRDs7QUFDRGhCLFFBQUFBLElBQUksQ0FBQ2dCLGFBQUwsR0FBcUJsQixRQUFRLENBQUNvQyxtQkFBRCxFQUFzQmxDLElBQUksQ0FBQ2lCLGVBQTNCLENBQTdCO0FBRUEsZUFBT1ksT0FBUDtBQUNELE9BNUJNLENBQVA7QUE2QkQ7O0FBUUQsYUFBU2pCLFFBQVQsQ0FBa0JtQixJQUFsQixFQUF3QjtBQUN0QixVQUFJLENBQUNBLElBQUwsRUFBVztBQUNULFlBQUkvQixJQUFJLENBQUNsQixrQkFBVCxFQUE2QjtBQUMzQmtCLFVBQUFBLElBQUksQ0FBQ2hDLEtBQUwsR0FBYXFDLFNBQWI7QUFDRDs7QUFDRDtBQUNEOztBQUNELFVBQUlMLElBQUksQ0FBQ3hCLFlBQVQsRUFBdUI7QUFDckJ3QixRQUFBQSxJQUFJLENBQUNoQyxLQUFMLEdBQWErRCxJQUFJLENBQUNJLGNBQWxCO0FBQ0QsT0FGRCxNQUVPO0FBQ0xuQyxRQUFBQSxJQUFJLENBQUNoQyxLQUFMLEdBQWFnRSxnQkFBZ0IsQ0FBQ0QsSUFBSSxDQUFDSSxjQUFOLEVBQXNCbkMsSUFBSSxDQUFDekIsT0FBM0IsQ0FBN0I7QUFDRDs7QUFDRCxVQUFJeUIsSUFBSSxDQUFDOUIsVUFBVCxFQUFxQjtBQUVuQjRCLFFBQUFBLFFBQVEsQ0FBQ0UsSUFBSSxDQUFDOUIsVUFBTixFQUFrQixDQUFsQixDQUFSO0FBQ0Q7QUFDRjs7QUFPRCxhQUFTMkMsUUFBVCxDQUFrQlEsSUFBbEIsRUFBd0I7QUFJdEIsVUFBSSxDQUFDQSxJQUFMLEVBQVc7QUFDVHJCLFFBQUFBLElBQUksQ0FBQ2hDLEtBQUwsR0FBYXFDLFNBQWI7QUFDRDtBQUNGOztBQU9ELGFBQVNTLFVBQVQsR0FBc0I7QUFDcEIsVUFBSWQsSUFBSSxDQUFDbEIsa0JBQUwsSUFBMkIsQ0FBQ2tCLElBQUksQ0FBQ2hDLEtBQXJDLEVBQTRDO0FBQzFDb0QsUUFBQUEsVUFBVTtBQUNYOztBQUNEZ0IsTUFBQUEsb0JBQW9CO0FBQ3JCOztBQUtELGFBQVNyQixTQUFULEdBQXFCO0FBQ25CcUIsTUFBQUEsb0JBQW9COztBQUVwQixVQUFJcEMsSUFBSSxDQUFDZ0IsYUFBVCxFQUF3QjtBQUN0QmxCLFFBQUFBLFFBQVEsQ0FBQ21DLE1BQVQsQ0FBZ0JqQyxJQUFJLENBQUNnQixhQUFyQjtBQUNEOztBQUVEaEIsTUFBQUEsSUFBSSxDQUFDZ0IsYUFBTCxHQUFxQmxCLFFBQVEsQ0FBQ29DLG1CQUFELEVBQXNCbEMsSUFBSSxDQUFDaUIsZUFBTCxHQUF1QixFQUE3QyxDQUE3QjtBQUNEOztBQU1ELGFBQVNtQixvQkFBVCxHQUFnQztBQUM5QixVQUFJQyxRQUFRLEdBQUczQyxRQUFRLENBQUMsQ0FBRCxDQUFSLENBQVk0QyxhQUFaLENBQTBCLHdCQUExQixDQUFmO0FBRUFELE1BQUFBLFFBQVEsQ0FBQ0UsS0FBVCxDQUFlQyxHQUFmLEdBQXFCLElBQXJCO0FBQ0FILE1BQUFBLFFBQVEsQ0FBQ0UsS0FBVCxDQUFlRSxNQUFmLEdBQXdCLElBQXhCO0FBQ0Q7O0FBUUQsYUFBU1AsbUJBQVQsR0FBK0I7QUFDN0IsVUFBSVEsTUFBTSxHQUFHakQsT0FBTyxDQUFDa0QsV0FBUixHQUFzQixHQUFuQztBQUFBLFVBQ0VDLFNBQVMsR0FBR0YsTUFBTSxHQUFHakQsT0FBTyxDQUFDb0QsV0FBakIsR0FBK0IsR0FBL0IsR0FBcUMsRUFEbkQ7QUFBQSxVQUVFQyxRQUFRLEdBQUdwRCxRQUFRLENBQUMsQ0FBRCxDQUFSLENBQVlxRCxxQkFBWixHQUFvQ1AsR0FGakQ7QUFBQSxVQUdFUSxXQUFXLEdBQUd0RCxRQUFRLENBQUMsQ0FBRCxDQUFSLENBQVlxRCxxQkFBWixHQUFvQ0UsTUFIcEQ7QUFBQSxVQUlFWixRQUFRLEdBQUczQyxRQUFRLENBQUMsQ0FBRCxDQUFSLENBQVk0QyxhQUFaLENBQTBCLHdCQUExQixDQUpiO0FBQUEsVUFLRVksV0FBVyxHQUFHYixRQUFRLENBQUNVLHFCQUFULEdBQWlDTixNQUFqQyxHQUEwQyxDQUwxRDtBQU9BTCxNQUFBQSxvQkFBb0I7O0FBRXBCLFVBQUlwQyxJQUFJLENBQUNnQixhQUFULEVBQXdCO0FBQ3RCbEIsUUFBQUEsUUFBUSxDQUFDbUMsTUFBVCxDQUFnQmpDLElBQUksQ0FBQ2dCLGFBQXJCO0FBQ0FoQixRQUFBQSxJQUFJLENBQUNnQixhQUFMLEdBQXFCLElBQXJCO0FBQ0Q7O0FBR0QsVUFBSTRCLFNBQVMsR0FBR0ksV0FBVyxHQUFHRSxXQUE5QixFQUEyQztBQUV6Q2IsUUFBQUEsUUFBUSxDQUFDRSxLQUFULENBQWVDLEdBQWYsR0FBcUIsQ0FBQyxDQUFDVSxXQUFGLEVBQWVDLFFBQWYsS0FBNEIsSUFBakQ7O0FBR0EsWUFBSUwsUUFBUSxHQUFHSSxXQUFYLEdBQXlCUixNQUE3QixFQUFxQztBQUVuQyxjQUFJVSxVQUFVLEdBQUdDLElBQUksQ0FBQ0MsR0FBTCxDQUFTUixRQUFRLEdBQUdKLE1BQXBCLENBQWpCO0FBQUEsY0FDRWEsYUFBYSxHQUFHRixJQUFJLENBQUNDLEdBQUwsQ0FBU1YsU0FBUyxHQUFHSSxXQUFyQixDQURsQjs7QUFHQSxjQUFJSSxVQUFVLEdBQUdHLGFBQWpCLEVBQWdDO0FBQzlCbEIsWUFBQUEsUUFBUSxDQUFDRSxLQUFULENBQWVDLEdBQWYsR0FBcUIsQ0FBQyxFQUFFWSxVQUFVLEdBQUcsRUFBZixDQUFELEVBQXFCRCxRQUFyQixLQUFrQyxJQUF2RDtBQUNBZCxZQUFBQSxRQUFRLENBQUNFLEtBQVQsQ0FBZUUsTUFBZixHQUF3QixDQUFDVyxVQUFVLEdBQUcsQ0FBZCxFQUFpQkQsUUFBakIsS0FBOEIsSUFBdEQ7QUFDRCxXQUhELE1BR087QUFDTGQsWUFBQUEsUUFBUSxDQUFDRSxLQUFULENBQWVDLEdBQWYsR0FBcUIsSUFBckI7QUFDQUgsWUFBQUEsUUFBUSxDQUFDRSxLQUFULENBQWVFLE1BQWYsR0FBd0JjLGFBQWEsQ0FBQ0osUUFBZCxLQUEyQixJQUFuRDtBQUNEO0FBQ0Y7QUFDRjtBQUNGOztBQVNELGFBQVMvQixVQUFULENBQW9CZCxFQUFwQixFQUF3QjtBQUN0QixVQUFJQSxFQUFKLEVBQVE7QUFDTlYsUUFBQUEsTUFBTSxDQUFDNEQsVUFBUCxDQUFrQiw2QkFBbEIsRUFBaURsRCxFQUFqRDtBQUNELE9BRkQsTUFFTztBQUNMVixRQUFBQSxNQUFNLENBQUM0RCxVQUFQLENBQWtCLDZCQUFsQjtBQUNEO0FBQ0Y7O0FBVUQsYUFBU3hCLGdCQUFULENBQTBCeUIsTUFBMUIsRUFBa0NDLG9CQUFsQyxFQUF3RDtBQUN0REEsTUFBQUEsb0JBQW9CLEdBQUdBLG9CQUFvQixDQUFDbkMsT0FBckIsQ0FBNkIsWUFBN0IsRUFBMkMsS0FBM0MsQ0FBdkI7QUFDQW1DLE1BQUFBLG9CQUFvQixHQUFHQSxvQkFBb0IsQ0FBQ25DLE9BQXJCLENBQTZCLEtBQTdCLEVBQW9DLEVBQXBDLENBQXZCO0FBQ0EsVUFBSW9DLENBQUMsR0FBR0Qsb0JBQW9CLENBQUNFLEtBQXJCLENBQTJCLEdBQTNCLENBQVI7O0FBQ0EsV0FBSyxJQUFJQyxDQUFDLEdBQUcsQ0FBUixFQUFXQyxDQUFDLEdBQUdILENBQUMsQ0FBQ2pDLE1BQXRCLEVBQThCbUMsQ0FBQyxHQUFHQyxDQUFsQyxFQUFxQyxFQUFFRCxDQUF2QyxFQUEwQztBQUN4QyxZQUFJRSxDQUFDLEdBQUdKLENBQUMsQ0FBQ0UsQ0FBRCxDQUFUOztBQUNBLFlBQUlFLENBQUMsSUFBSU4sTUFBVCxFQUFpQjtBQUNmQSxVQUFBQSxNQUFNLEdBQUdBLE1BQU0sQ0FBQ00sQ0FBRCxDQUFmO0FBQ0QsU0FGRCxNQUVPO0FBQ0w7QUFDRDtBQUNGOztBQUNELGFBQU9OLE1BQVA7QUFDRDtBQUVGO0FBRUYsQ0FwVEQ7QUNBQSxDQUFDLFlBQVc7QUFDVjs7QUFFQW5HLEVBQUFBLE9BQU8sQ0FBQ0MsTUFBUixDQUFlLGlCQUFmLEVBQ0d5RyxPQURILENBQ1csc0JBRFgsRUFDbUMsWUFBVztBQUMxQyxRQUFJckYsYUFBYSxHQUFHLGNBQXBCO0FBQ0EsUUFBSUMsYUFBYSxHQUFHLFlBQXBCO0FBQ0EsUUFBSUMsWUFBWSxHQUFHLHdDQUFuQjtBQUVBLFdBQU87QUFDTG9GLE1BQUFBLGdCQUFnQixFQUFFQSxnQkFEYjtBQUVMQyxNQUFBQSxnQkFBZ0IsRUFBRUEsZ0JBRmI7QUFHTEMsTUFBQUEsZUFBZSxFQUFFQSxlQUhaO0FBSUxqRSxNQUFBQSxnQkFBZ0IsRUFBRUEsZ0JBSmI7QUFLTEMsTUFBQUEsZ0JBQWdCLEVBQUVBLGdCQUxiO0FBTUxDLE1BQUFBLGVBQWUsRUFBRUE7QUFOWixLQUFQOztBQVNBLGFBQVM2RCxnQkFBVCxDQUEwQkcsSUFBMUIsRUFBZ0M7QUFDOUJ6RixNQUFBQSxhQUFhLEdBQUd5RixJQUFoQjtBQUNEOztBQUVELGFBQVNGLGdCQUFULENBQTBCRSxJQUExQixFQUFnQztBQUM5QnhGLE1BQUFBLGFBQWEsR0FBR3dGLElBQWhCO0FBQ0Q7O0FBRUQsYUFBU0QsZUFBVCxDQUF5QkMsSUFBekIsRUFBK0I7QUFDN0J2RixNQUFBQSxZQUFZLEdBQUd1RixJQUFmO0FBQ0Q7O0FBRUQsYUFBU2xFLGdCQUFULEdBQTRCO0FBQzFCLGFBQU92QixhQUFQO0FBQ0Q7O0FBRUQsYUFBU3dCLGdCQUFULEdBQTRCO0FBQzFCLGFBQU92QixhQUFQO0FBQ0Q7O0FBRUQsYUFBU3dCLGVBQVQsR0FBMkI7QUFDekIsYUFBT3ZCLFlBQVA7QUFDRDtBQUVGLEdBdkNIO0FBd0NELENBM0NEO0FDQUF2QixPQUFPLENBQUNDLE1BQVIsQ0FBZSxpQkFBZixFQUFrQzhHLEdBQWxDLENBQXNDLENBQUMsZ0JBQUQsRUFBbUIsVUFBU0MsY0FBVCxFQUF5QjtBQUFDQSxFQUFBQSxjQUFjLENBQUNDLEdBQWYsQ0FBbUIsNkJBQW5CLEVBQWlELG14REFBakQ7QUFDbkZELEVBQUFBLGNBQWMsQ0FBQ0MsR0FBZixDQUFtQix3QkFBbkIsRUFBNEMsaStCQUE1QztBQUFnaEMsQ0FEMStCLENBQXRDO0FDQUEsQ0FBQyxZQUFXO0FBQ1Y7O0FBRUFqSCxFQUFBQSxPQUFPLENBQUNDLE1BQVIsQ0FBZSxpQkFBZixFQUNHaUgsTUFESCxDQUNVLFNBRFYsRUFDcUJDLGFBRHJCOztBQVFBLFdBQVNBLGFBQVQsR0FBeUI7QUFDdkIsV0FBTyxVQUFTQyxXQUFULEVBQXNCQyxjQUF0QixFQUFzQ0MsS0FBdEMsRUFBNkM7QUFDbERBLE1BQUFBLEtBQUssR0FBR0EsS0FBSyxJQUFJLFVBQVM3QyxJQUFULEVBQWU7QUFDOUIsZUFBT0EsSUFBSSxDQUFDekIsRUFBWjtBQUNELE9BRkQ7O0FBSUEsVUFBSXFFLGNBQWMsSUFBS0EsY0FBYyxDQUFDakQsTUFBZixHQUF3QixDQUEvQyxFQUFtRDtBQUNqRCxlQUFPZ0QsV0FBVyxDQUFDRixNQUFaLENBQW1CLFVBQVNLLFVBQVQsRUFBcUI7QUFDN0MsY0FBSUMsUUFBUSxHQUFHRixLQUFLLENBQUNDLFVBQUQsQ0FBcEI7QUFFQSxpQkFBTyxDQUFDRixjQUFjLENBQUNJLElBQWYsQ0FBb0IsVUFBU0MsYUFBVCxFQUF3QjtBQUNsRCxnQkFBSUMsV0FBVyxHQUFHTCxLQUFLLENBQUNJLGFBQUQsQ0FBdkI7QUFFQSxtQkFBT0gsVUFBVSxLQUFLRyxhQUFmLElBQ0RGLFFBQVEsSUFBSUcsV0FBWixJQUEyQjNILE9BQU8sQ0FBQzRILE1BQVIsQ0FBZUosUUFBZixFQUF5QkcsV0FBekIsQ0FEakM7QUFFRCxXQUxPLENBQVI7QUFNRCxTQVRNLENBQVA7QUFVRCxPQVhELE1BV087QUFDTCxlQUFPUCxXQUFQO0FBQ0Q7QUFDRixLQW5CRDtBQW9CRDtBQUNGLENBakNEIiwiZmlsZSI6ImF1dG9jb21wbGV0ZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIGFuZ3VsYXIubW9kdWxlKCdjay1hdXRvY29tcGxldGUnLCBbXG4gICAgJ2FuZ3Vjb21wbGV0ZS1hbHQnXG4gIF0pXG4gICAgLmNvbmZpZyhmdW5jdGlvbigkY29tcGlsZVByb3ZpZGVyKSB7XG4gICAgICAvLyAxLjUgY29tcG9uZW50cyB3b3JraW5nIHdpdGggYW5ndWxhciAxLjZcbiAgICAgICRjb21waWxlUHJvdmlkZXIucHJlQXNzaWduQmluZGluZ3NFbmFibGVkKHRydWUpO1xuICAgIH0pXG4gICAgLmNvbXBvbmVudCgnY2tBdXRvY29tcGxldGUnLCB7XG4gICAgICB0ZW1wbGF0ZVVybDogJy9hdXRvY29tcGxldGUudHBsLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogYXV0b2NvbXBsZXRlQ29udHJvbGxlcixcbiAgICAgIGJpbmRpbmdzOiB7XG4gICAgICAgIG1vZGVsOiAnPScsIC8vIFByb3BlcnR5IHRvIGxlYXZlIGlkRmllbGQgb2YgdGhlIHNlbGVjdGlvblxuICAgICAgICBvblNlYXJjaDogJyYnLCAvLyBGdW5jdGlvbiB0byB1c2UgdG8gc2VhcmNoIGZvciBtYXRjaGVzXG4gICAgICAgIC8vIG9wdGlvbmFsXG4gICAgICAgIG9uU2VsZWN0ZWQ6ICcmJywgLy8gRnVuY3Rpb24gdG8gY2FsbCBhZnRlciBhIHVzZXIgaGFzIHNlbGVjdGVkIGFuIGl0ZW1cbiAgICAgICAgbGltaXQ6ICdAJywgLy8gSWYgbm90IHByb3ZpZGVkIHdpbGwgdGFrZSBjb25zdGFudCB2YWx1ZVxuICAgICAgICBmaW5kQnlJZDogJyY/JywgLy8gRnVuY3Rpb24gdG8gZmluZCBhbiBlbnRpdHkgZ2l2ZW4gaXRzIGlkXG4gICAgICAgIGRpc3BsYXlGaWVsZDogJ0AnLCAvLyBQcm9wZXJ0eSBmcm9tIGVudGl0eSB0byBkaXNwbGF5IGluIGlucHV0XG4gICAgICAgIGRlc2NyaXB0aW9uRmllbGQ6ICdAJywgLy8gUHJvcGVydHkgdG8gZGVmaW5lIHRoZSBkZXNjaXB0aW9uIGZpZWxkIGRpc3BsYXllZCB1bmRlciB0aGUgdGl0bGUgZmllbGRzIGluIHRoZSBsaXN0XG4gICAgICAgIGlkRmllbGQ6ICdAJywgLy8gUHJvcGVydHkgd2hlcmUgZW50aXR5J3MgaWQgaXNcbiAgICAgICAgcmV0dXJuT2JqZWN0OiAnPT8nLCAvLyBSZXR1cm4gd2hvbGUgb2JqZWN0IHRvIG1vZGVsIGluc3RlYWQgb2YganVzdCB0aGUgaWQgKHRha2VzIHByZWNlZGVuY2Ugb3ZlciBpZEZpZWxkKVxuICAgICAgICBwbGFjZWhvbGRlcjogJ0AnLFxuICAgICAgICBtaW5MZW5ndGg6ICdAJyxcbiAgICAgICAgdGV4dFNlYXJjaGluZzogJ0AnLFxuICAgICAgICB0ZXh0Tm9SZXN1bHRzOiAnQCcsXG4gICAgICAgIHRleHRMb2FkTW9yZTogJ0AnLFxuICAgICAgICBjbGVhck9uTm9TZWxlY3Rpb246ICc9PycsXG4gICAgICAgIGNsZWFyU2VsZWN0ZWQ6ICdAJyxcbiAgICAgICAgZGlzYWJsZUlucHV0OiAnPT8nLFxuICAgICAgICBleGNsdXNpb25MaXN0OiAnPScsXG4gICAgICAgIGxpc3RDbGFzczogJ0AnLFxuICAgICAgICBlbGVtZW50SWQ6ICdAJywgLy8gQXNzaWduIGFuIG5nLWF0dHItaWQgdG8gdGhlIGF1dG9jb21wbGV0ZSBlbGVtZW50IGZvciBpZGVudGlmaWNhdGlvbixcbiAgICAgICAgdXNlQ2FjaGU6ICc8PycsXG4gICAgICAgIGZpZWxkUmVxdWlyZWQ6ICc9PycsXG4gICAgICAgIGZpZWxkUmVxdWlyZWRDbGFzczogJ0A/JyxcbiAgICAgICAgaW5wdXROYW1lOiAnQD8nXG4gICAgICB9XG5cbiAgICB9KTtcblxuICBhdXRvY29tcGxldGVDb250cm9sbGVyLiRpbmplY3QgPSBbJyR3aW5kb3cnLCAnJGVsZW1lbnQnLCAnJGZpbHRlcicsICckc2NvcGUnLCAnJHEnLCAnJHRpbWVvdXQnLFxuICAgICdja0F1dG9jb21wbGV0ZUNvbmZpZyddO1xuXG4gIGZ1bmN0aW9uIGF1dG9jb21wbGV0ZUNvbnRyb2xsZXIoJHdpbmRvdywgJGVsZW1lbnQsICRmaWx0ZXIsICRzY29wZSwgJHEsICR0aW1lb3V0LCBja0F1dG9jb21wbGV0ZUNvbmZpZykge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIC8vIFNldCB1cCBkZWZhdWx0IHZhbHVlc1xuICAgICRzY29wZS5sb2FkTW9yZSA9IGZhbHNlO1xuICAgIHNlbGYubGltaXQgPSBzZWxmLmxpbWl0IHx8IDEwO1xuICAgIHNlbGYuZGlzcGxheUZpZWxkID0gc2VsZi5kaXNwbGF5RmllbGQgfHwgJ25hbWUnO1xuICAgIHNlbGYuZGVzY3JpcHRpb25GaWVsZCA9IHNlbGYuZGVzY3JpcHRpb25GaWVsZCB8fCAnJztcbiAgICBzZWxmLmlkRmllbGQgPSBzZWxmLmlkRmllbGQgfHwgJ2lkLmVudGl0eUlkJztcbiAgICBzZWxmLm1pbkxlbmd0aCA9IHNlbGYubWluTGVuZ3RoIHx8IDA7XG4gICAgc2VsZi50ZXh0U2VhcmNoaW5nID0gc2VsZi50ZXh0U2VhcmNoaW5nIHx8IGNrQXV0b2NvbXBsZXRlQ29uZmlnLmdldFNlYXJjaGluZ1RleHQoKTtcbiAgICBzZWxmLnRleHROb1Jlc3VsdHMgPSBzZWxmLnRleHROb1Jlc3VsdHMgfHwgY2tBdXRvY29tcGxldGVDb25maWcuZ2V0Tm9SZXN1bHRzVGV4dCgpO1xuICAgICRzY29wZS50ZXh0TG9hZE1vcmUgPSBzZWxmLnRleHRMb2FkTW9yZSB8fCBja0F1dG9jb21wbGV0ZUNvbmZpZy5nZXRMb2FkTW9yZVRleHQoKTtcbiAgICBzZWxmLmRpc2FibGVJbnB1dCA9IHNlbGYuZGlzYWJsZUlucHV0IHx8IGZhbHNlO1xuICAgIHNlbGYuY2xlYXJPbk5vU2VsZWN0aW9uID0gc2VsZi5jbGVhck9uTm9TZWxlY3Rpb24gfHwgZmFsc2U7XG4gICAgc2VsZi5yZXR1cm5PYmplY3QgPSBzZWxmLnJldHVybk9iamVjdCB8fCBmYWxzZTtcbiAgICBzZWxmLmxpc3RDbGFzcyA9IHNlbGYubGlzdENsYXNzIHx8ICdmb3JtLWNvbnRyb2wnO1xuICAgIHNlbGYudXNlQ2FjaGUgPSBzZWxmLnVzZUNhY2hlID09PSB1bmRlZmluZWQgPyB0cnVlIDogc2VsZi51c2VDYWNoZTtcblxuICAgIC8vIElmIHRoZXJlIGlzIGFuIGluaXRpYWwgdmFsdWUgaW4gbW9kZWwgYW5kIGEgZnVuY3Rpb25cbiAgICAvLyB0byBmZXRjaCBlbGVtZW50cyBieSBpZCwgZ28gYW5kIGdyYWIgaXRcbiAgICBpZiAoc2VsZi5tb2RlbCAmJiBzZWxmLmZpbmRCeUlkKSB7XG4gICAgICBzZWxmLmZpbmRCeUlkKHsgaWQ6IHNlbGYubW9kZWwgfSkudGhlbihmdW5jdGlvbihlbnRpdHkpIHtcbiAgICAgICAgc2VsZi5pbml0aWFsRGlzcGxheSA9IGVudGl0eVtzZWxmLmRpc3BsYXlGaWVsZF07XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBzZWxmLmNhY2hlID0ge307XG5cbiAgICBzZWxmLnNlYXJjaCA9IHNlYXJjaDtcbiAgICBzZWxmLm9uU2VsZWN0ID0gb25TZWxlY3Q7XG4gICAgc2VsZi5vbkNoYW5nZSA9IG9uQ2hhbmdlO1xuICAgIHNlbGYub25Gb2N1c091dCA9IG9uRm9jdXNPdXQ7XG4gICAgc2VsZi5vbkZvY3VzSW4gPSBvbkZvY3VzSW47XG4gICAgLy8gVGhlIHBvc2l0aW9uIHRpbWVyIGlzIHJlcXVpcmVkIHRvIGFsbG93IGFuZ3Vjb21wbGV0ZSB0byBmaW5pc2ggYW55IGRpZ2VzdCBjeWNsZXMgd2hlbiBkYXRhIGlzIHJldHVybmVkXG4gICAgc2VsZi5wb3NpdGlvblRpbWVyID0gbnVsbDtcbiAgICBzZWxmLnBvc2l0aW9uVGltZW91dCA9IDEwMDtcblxuICAgICRzY29wZS4kb24oJ2NrLWF1dG9jb21wbGV0ZTpjbGVhcklucHV0JywgZnVuY3Rpb24oZXZlbnQsIGlkKSB7XG4gICAgICBjbGVhcklucHV0KGlkKTtcbiAgICAgIHNlbGYuY2FjaGUgPSB7fTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIFBlcmZvcm1zIHNlYXJjaC4gQWx3YXlzIGFza2VkIGZvciBvbmUgbW9yZSByZXN1bHQgdGhhbiBuZWVkZWRcbiAgICAgKiBpbiBvcmRlciB0byB3b3JrIG91dCBpZiB3ZSBzdGlsbCBoYXZlIG1vcmUgZG9jdW1lbnRzIHRvIGZldGNoLlxuICAgICAqIE9uY2UgZXZhbHVhdGVkLCBpdCB0YWtlcyBpdCBvdXQuXG4gICAgICpcbiAgICAgKiBJdCBwcm92aWRlcyBmaXJzdCBsZXZlbCBjYWNoZSB0aHJvdWdoIGFuIGRpY3Rpb25hcnkuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGVybVxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNlYXJjaCh0ZXJtKSB7XG4gICAgICAvLyBFc2NhcGUgYW55IHJlZ3VsYXIgZXhwcmVzc2lvbiBzcGVjaWFsIGNoYXJhY3RlcnNcbiAgICAgIHRlcm0gPSB0ZXJtLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvWy1bXFxde30oKSorPy4sXFxcXC9eJHwjXFxzXS9nLCAnXFxcXCQmJyk7XG4gICAgICB2YXIgdGhpc1NlYXJjaDtcbiAgICAgIC8vIERvIHdlIGhhdmUgYW55IGl0ZW1zIHRvIGJlIHBvdGVudGlhbGx5IGV4Y2x1ZGVkXG4gICAgICAvLyBpZiBzbyB3ZSBmaW5kIG91dCBob3cgbWFueSBhbmQgYXNrIGZvciB0aGF0IG1hbnkgbW9yZSBzbyB3ZSB3aWxsXG4gICAgICAvLyBhbHdheXMgaGF2ZSBhdCBsZWFzdCB0aGUgbGltaXRcbiAgICAgIHZhciBleGNsdWRlZExlbmd0aCA9IDA7XG4gICAgICBpZiAoc2VsZi5leGNsdXNpb25MaXN0KSB7XG4gICAgICAgIGV4Y2x1ZGVkTGVuZ3RoID0gc2VsZi5leGNsdXNpb25MaXN0Lmxlbmd0aDtcbiAgICAgIH1cbiAgICAgIC8vIElmIHdlIGhhdmUgYW55IGV4Y2x1c2lvbnMgdGhlbiB3ZSBuZWVkIHRvIGFiYW5kb24gdXNlIG9mIHRoZSBjYWNoZSBhcyBldmVyeSBxdWVyeSBzaG91bGQgYmVcbiAgICAgIC8vIGZyZXNoIGZyb20gdGhlIGNsb3VkXG4gICAgICB2YXIgdXNlQ2FjaGUgPSBzZWxmLnVzZUNhY2hlICYmIGV4Y2x1ZGVkTGVuZ3RoID09PSAwO1xuXG4gICAgICBpZiAodXNlQ2FjaGUgJiYgdGVybSBpbiBzZWxmLmNhY2hlKSB7XG4gICAgICAgIHRoaXNTZWFyY2ggPSAkcS5yZXNvbHZlKHNlbGYuY2FjaGVbdGVybV0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRmV0Y2ggZW5vdWdoIHJlc3VsdHMgdG8gZnVsZmlsIHRoZSBsaW1pdCBldmVuIGFmdGVyIGV4Y2x1c2lvblxuICAgICAgICB0aGlzU2VhcmNoID0gc2VsZi5vblNlYXJjaCh7IHNraXA6IDAsIGxpbWl0OiBzZWxmLmxpbWl0ICsgMSArIGV4Y2x1ZGVkTGVuZ3RoLCB0ZXJtOiB0ZXJtIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXNTZWFyY2gudGhlbihmdW5jdGlvbihyZXN1bHRzKSB7XG4gICAgICAgIC8vIElmIHdlJ3JlIHVzaW5nIHRoZSBjYWNoZSB0aGUgYWRkIHRoZSByZXN1bHQgYmVmb3JlIGZpbHRlcmluZyBvdXQgYW55IGV4Y2x1c2lvbnNcbiAgICAgICAgaWYgKHVzZUNhY2hlKSB7XG4gICAgICAgICAgc2VsZi5jYWNoZVt0ZXJtXSA9IGFuZ3VsYXIuY29weShyZXN1bHRzKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBEbyB3ZSBoYXZlIGFueSBleGNsdWRlZCBpdGVtcyB0aGVuIGZpbHRlciB0aGVtXG4gICAgICAgIGlmIChleGNsdWRlZExlbmd0aCA+IDApIHtcbiAgICAgICAgICByZXN1bHRzID0gJGZpbHRlcignd2l0aG91dCcpKHJlc3VsdHMsIHNlbGYuZXhjbHVzaW9uTGlzdCwgZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICAgICAgcmV0dXJuIHByb3BlcnR5QnlTdHJpbmcoaXRlbSwgc2VsZi5pZEZpZWxkKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyZXN1bHRzLmxlbmd0aCA+IHNlbGYubGltaXQpIHtcbiAgICAgICAgICAkc2NvcGUubG9hZE1vcmUgPSB0cnVlO1xuICAgICAgICAgIC8vIENob3AgdGhlIGVuZCBvZiB0aGUgYXJyYXkgYXMgd2UgZG9uJ3QgbmVlZCB0aGUgZW5kIGl0ZW1zXG4gICAgICAgICAgcmVzdWx0cy5sZW5ndGggPSBzZWxmLmxpbWl0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICRzY29wZS5sb2FkTW9yZSA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gV2hlbiB0aGUgZHJvcCBkb3duIGlzIGluaXRpYWxseSBkaXNwbGF5ZWQgdGhlIGhlaWdodCBpcyBpbmRldGVybWluYXRlLiBJdCB3aWxsIGJlIGNhbGN1bGF0ZWQgb25jZSB0aGUgcmVzdWx0XG4gICAgICAgIC8vIHNldCBoYXMgYmVlbiByZXR1cm5lZC4gVGhlIGRyb3Bkb3duIGJveCBwb3NpdGlvbiBjYW4gdGhlbiBiZSBkZXRlcm1pbmVkXG4gICAgICAgIGlmIChzZWxmLnBvc2l0aW9uVGltZXIpIHtcbiAgICAgICAgICAkdGltZW91dC5jYW5jZWwoc2VsZi5wb3NpdGlvblRpbWVyKTtcbiAgICAgICAgfVxuICAgICAgICBzZWxmLnBvc2l0aW9uVGltZXIgPSAkdGltZW91dChzZXREcm9wRG93blBvc2l0aW9uLCBzZWxmLnBvc2l0aW9uVGltZW91dCk7XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBXaGVuIGFuIGxpc3QgaXRlbSBpcyBzZWxlY3RlZCwgd2Ugc2V0IHRoZSBtb2RlbCBhY2NvcmRpbmdcbiAgICAgKiB0byB0aGUgZmllbGQgc3BlY2lmaWVkIGFzIHRoZSBpZFxuICAgICAqXG4gICAgICogQHBhcmFtIGl0ZW1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBvblNlbGVjdChpdGVtKSB7XG4gICAgICBpZiAoIWl0ZW0pIHtcbiAgICAgICAgaWYgKHNlbGYuY2xlYXJPbk5vU2VsZWN0aW9uKSB7XG4gICAgICAgICAgc2VsZi5tb2RlbCA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAoc2VsZi5yZXR1cm5PYmplY3QpIHtcbiAgICAgICAgc2VsZi5tb2RlbCA9IGl0ZW0ub3JpZ2luYWxPYmplY3Q7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZWxmLm1vZGVsID0gcHJvcGVydHlCeVN0cmluZyhpdGVtLm9yaWdpbmFsT2JqZWN0LCBzZWxmLmlkRmllbGQpO1xuICAgICAgfVxuICAgICAgaWYgKHNlbGYub25TZWxlY3RlZCkge1xuICAgICAgICAvLyBVc2luZyAkdGltZW91dCBhbGxvd3MgdXMgdG8gcGFzcyBib3RoIGZ1bmN0aW9uK2FyZ3MgaW4gZnJvbSB0aGUgdGVtcGxhdGUuXG4gICAgICAgICR0aW1lb3V0KHNlbGYub25TZWxlY3RlZCwgMCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2xlYXJzIHRoZSBtb2RlbCB3aGVuIHRoZXJlIGlzIG5vIHRlcm0gdG8gc2VhcmNoIGZvclxuICAgICAqXG4gICAgICogQHBhcmFtIHRlcm1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBvbkNoYW5nZSh0ZXJtKSB7XG4gICAgICAvLyBUaGlzIGZ1bmN0aW9uIGNhbiBiZSBleGVjdXRlZCBhbG9uZyB3aXRoL2luc3RlYWQgb2ZcbiAgICAgIC8vIGZvY3VzLW91dC4gSG93ZXZlciwgd2l0aCBmb2N1cyBvdXQgd2UgY2xlYXIgc2VsZWN0aW9uXG4gICAgICAvLyBvbmx5IHdoZW4gdXNlciBibHVycyB0aGUgaW5wdXRcbiAgICAgIGlmICghdGVybSkge1xuICAgICAgICBzZWxmLm1vZGVsID0gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIElmIGNsZWFyT25Ob1NlbGVjdGlvbiBpcyB0cnVlIGFuZCBubyBpdGVtIGhhcyBiZWVuXG4gICAgICogc2VsZWN0ZWQsIGNsZWFyIGFueSBzZWFyY2ggdGV4dCB3aGVuIHVzZXIgYmx1cnMgdGhlXG4gICAgICogaW5wdXRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBvbkZvY3VzT3V0KCkge1xuICAgICAgaWYgKHNlbGYuY2xlYXJPbk5vU2VsZWN0aW9uICYmICFzZWxmLm1vZGVsKSB7XG4gICAgICAgIGNsZWFySW5wdXQoKTtcbiAgICAgIH1cbiAgICAgIHJlc2V0RHJvcERvd25Qb3N0aW9uKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgZm9yIGRyb3AgZG93biBwb3NpdGlvbiB3aGVuIHRoZSBlbGVtZW50IGdldHMgZm9jdXNcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBvbkZvY3VzSW4oKSB7XG4gICAgICByZXNldERyb3BEb3duUG9zdGlvbigpO1xuXG4gICAgICBpZiAoc2VsZi5wb3NpdGlvblRpbWVyKSB7XG4gICAgICAgICR0aW1lb3V0LmNhbmNlbChzZWxmLnBvc2l0aW9uVGltZXIpO1xuICAgICAgfVxuICAgICAgLy8gQWxsb3cgcGxlbnR5IG9mIHRpbWUgZm9yIHRoZSBiYWNrZW5kIHRvIHJlc3BvbmQgdG8gYSByZXF1ZXN0IGJlZm9yZSBmaXJpbmdcbiAgICAgIHNlbGYucG9zaXRpb25UaW1lciA9ICR0aW1lb3V0KHNldERyb3BEb3duUG9zaXRpb24sIHNlbGYucG9zaXRpb25UaW1lb3V0ICogMTApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBmdW5jdGlvbiByZXNldERyb3BEb3duUG9zaXRpb25cbiAgICAgKiBSZXNldCB0aGUgZHJvcCBkb3duIHBvc2l0aW9uIG9mIHRoZSBib3ggdG8gdW5kZXIgdGhlIGlucHV0IGZpZWxkXG4gICAgICovXG4gICAgZnVuY3Rpb24gcmVzZXREcm9wRG93blBvc3Rpb24oKSB7XG4gICAgICB2YXIgZHJvcERvd24gPSAkZWxlbWVudFswXS5xdWVyeVNlbGVjdG9yKCcuYW5ndWNvbXBsZXRlLWRyb3Bkb3duJyk7XG5cbiAgICAgIGRyb3BEb3duLnN0eWxlLnRvcCA9IG51bGw7XG4gICAgICBkcm9wRG93bi5zdHlsZS5oZWlnaHQgPSBudWxsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBmdW5jdGlvbiBzZXREcm9wRG93blBvc2l0aW9uXG4gICAgICogU2V0IHRoZSBsb2NhdGlvbiBvZiB0aGUgZHJvcGRvd24uIElmIHRoZXJlIGlzIG5vdCBlbm91Z2ggc3BhY2UgYXQgdGhlIGJvdHRvbSBvZiB0aGUgcGFnZSB0aGUgaGVpZ2h0IHdpbGwgYmUgc2V0XG4gICAgICogYWJvdmUgdGhlIGlucHV0IGZpZWxkLiBJZiB0aGUgZHJvcGRvd24gY2FuIG5vdCBhbGwgYmUgZGlzcGxheWVkIGluIHRoZSB0b3AgaXQgaXMgbW92ZWQgZWl0aGVyIGFib3ZlIG9yIGJlbG93IHRoZVxuICAgICAqIGZpZWxkLCBhbmQgcmVzaXplZCB0byBmaXQgaW4gdGhlIHJlbWFpbmluZyBzcGFjZSBkZXBlbmRpbmcgb24gd2hlcmUgdGhlcmUgaW4gdGhlIG1vc3Qgc3BhY2VcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzZXREcm9wRG93blBvc2l0aW9uKCkge1xuICAgICAgdmFyIGRvY1RvcCA9ICR3aW5kb3cucGFnZVlPZmZzZXQgKyAxMjUsXG4gICAgICAgIGRvY0JvdHRvbSA9IGRvY1RvcCArICR3aW5kb3cuaW5uZXJIZWlnaHQgLSAxMjUgLSA1MCxcbiAgICAgICAgZmllbGRUb3AgPSAkZWxlbWVudFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS50b3AsXG4gICAgICAgIGZpZWxkQm90dG9tID0gJGVsZW1lbnRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuYm90dG9tLFxuICAgICAgICBkcm9wRG93biA9ICRlbGVtZW50WzBdLnF1ZXJ5U2VsZWN0b3IoJy5hbmd1Y29tcGxldGUtZHJvcGRvd24nKSxcbiAgICAgICAgZHJvcERvd25Ub3AgPSBkcm9wRG93bi5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHQgLSA2O1xuXG4gICAgICByZXNldERyb3BEb3duUG9zdGlvbigpO1xuXG4gICAgICBpZiAoc2VsZi5wb3NpdGlvblRpbWVyKSB7XG4gICAgICAgICR0aW1lb3V0LmNhbmNlbChzZWxmLnBvc2l0aW9uVGltZXIpO1xuICAgICAgICBzZWxmLnBvc2l0aW9uVGltZXIgPSBudWxsO1xuICAgICAgfVxuXG4gICAgICAvLyBDaGVjayB0aGF0IHRoZXJlIGlzIGVub3VnaCBzcGFjZSBhdCB0aGUgYm90dG9tIG9mIHRoZSBwYWdlXG4gICAgICBpZiAoZG9jQm90dG9tIDwgZmllbGRCb3R0b20gKyBkcm9wRG93blRvcCkge1xuICAgICAgICAvLyBJZiBubyBzcGFjZSBhdCBib3R0b20gbW92ZSB0aGUgZHJvcGRvd24gbGlzdCB0byB0aGUgdG9wXG4gICAgICAgIGRyb3BEb3duLnN0eWxlLnRvcCA9ICgtZHJvcERvd25Ub3ApLnRvU3RyaW5nKCkgKyAncHgnO1xuXG4gICAgICAgIC8vIFByZXZlbnQgdG9wIGRpc2FwcGVhcmluZyBpbnRvIG1lbnUgYXJlYVxuICAgICAgICBpZiAoZmllbGRUb3AgLSBkcm9wRG93blRvcCA8IGRvY1RvcCkge1xuICAgICAgICAgIC8vIFJlc2l6ZSBjb21wb25lbnQgdG8gZml0IGFuZCBtb3ZlIGFjY29yZGluZ2x5XG4gICAgICAgICAgdmFyIHNwYWNlQXRUb3AgPSBNYXRoLmFicyhmaWVsZFRvcCAtIGRvY1RvcCksXG4gICAgICAgICAgICBzcGFjZUF0Qm90dG9tID0gTWF0aC5hYnMoZG9jQm90dG9tIC0gZmllbGRCb3R0b20pO1xuXG4gICAgICAgICAgaWYgKHNwYWNlQXRUb3AgPiBzcGFjZUF0Qm90dG9tKSB7XG4gICAgICAgICAgICBkcm9wRG93bi5zdHlsZS50b3AgPSAoLShzcGFjZUF0VG9wIC0gMTQpKS50b1N0cmluZygpICsgJ3B4JztcbiAgICAgICAgICAgIGRyb3BEb3duLnN0eWxlLmhlaWdodCA9IChzcGFjZUF0VG9wIC0gOCkudG9TdHJpbmcoKSArICdweCc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRyb3BEb3duLnN0eWxlLnRvcCA9IG51bGw7XG4gICAgICAgICAgICBkcm9wRG93bi5zdHlsZS5oZWlnaHQgPSBzcGFjZUF0Qm90dG9tLnRvU3RyaW5nKCkgKyAncHgnO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNlbmQgYSBicm9hZGNhc3QgdG8gdGhlIDNyZCBwYXJ0eSBhdXRvLWNvbXBsZXRlIHRvXG4gICAgICogY2xlYXIgaXRzIGlucHV0LiBPcHRpb25hbGx5IHNwZWNpZnkgYW4gaWQgdG8gY2xlYXJcbiAgICAgKiBqdXN0IG9uZSBpbnB1dCwgb3IgaWYgbm8gaWQgaXMgZ2l2ZW4gY2xlYXIgYWxsIGlucHV0c1xuICAgICAqIGluIHRoZSBjdXJyZW50IGNvbXBvbmVudCBzY29wZS5cbiAgICAgKiBAcGFyYW0geyp9IGlkIG9mIGlucHV0IGZpZWxkIHRvIGNsZWFyXG4gICAgICovXG4gICAgZnVuY3Rpb24gY2xlYXJJbnB1dChpZCkge1xuICAgICAgaWYgKGlkKSB7XG4gICAgICAgICRzY29wZS4kYnJvYWRjYXN0KCdhbmd1Y29tcGxldGUtYWx0OmNsZWFySW5wdXQnLCBpZCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkc2NvcGUuJGJyb2FkY2FzdCgnYW5ndWNvbXBsZXRlLWFsdDpjbGVhcklucHV0Jyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2l2ZW4gYW4gb2JqZWN0LCByZXR1cm5zIHRoZSB2YWx1ZSBvZiB0aGUgcHJvcGVydHkgc3BlY2lmaWVkXG4gICAgICogYnkgdGhlIHN0cmluZyBuZXN0ZWRTdHJpbmdQcm9wZXJ0eS4gSXQgYWNjZXB0cyBkb3Qgbm90YXRpb24uXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb2JqZWN0XG4gICAgICogQHBhcmFtIG5lc3RlZFN0cmluZ1Byb3BlcnR5XG4gICAgICogQHJldHVybnMgeyp9XG4gICAgKi9cbiAgICBmdW5jdGlvbiBwcm9wZXJ0eUJ5U3RyaW5nKG9iamVjdCwgbmVzdGVkU3RyaW5nUHJvcGVydHkpIHtcbiAgICAgIG5lc3RlZFN0cmluZ1Byb3BlcnR5ID0gbmVzdGVkU3RyaW5nUHJvcGVydHkucmVwbGFjZSgvXFxbKFxcdyspXFxdL2csICcuJDEnKTsgLy8gQ29udmVydCBpbmRleGVzIHRvIHByb3BlcnRpZXNcbiAgICAgIG5lc3RlZFN0cmluZ1Byb3BlcnR5ID0gbmVzdGVkU3RyaW5nUHJvcGVydHkucmVwbGFjZSgvXlxcLi8sICcnKTsgLy8gU3RyaXAgYSBsZWFkaW5nIGRvdFxuICAgICAgdmFyIGEgPSBuZXN0ZWRTdHJpbmdQcm9wZXJ0eS5zcGxpdCgnLicpO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBhLmxlbmd0aDsgaSA8IG47ICsraSkge1xuICAgICAgICB2YXIgayA9IGFbaV07XG4gICAgICAgIGlmIChrIGluIG9iamVjdCkge1xuICAgICAgICAgIG9iamVjdCA9IG9iamVjdFtrXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgfVxuXG4gIH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICBhbmd1bGFyLm1vZHVsZSgnY2stYXV0b2NvbXBsZXRlJylcbiAgICAuZmFjdG9yeSgnY2tBdXRvY29tcGxldGVDb25maWcnLCBmdW5jdGlvbigpIHtcbiAgICAgIHZhciB0ZXh0U2VhcmNoaW5nID0gJ1NlYXJjaGluZy4uLic7XG4gICAgICB2YXIgdGV4dE5vUmVzdWx0cyA9ICdObyByZXN1bHRzJztcbiAgICAgIHZhciB0ZXh0TG9hZE1vcmUgPSAnVG9vIG1hbnkgcmVzdWx0cy4gUGxlYXNlIG5hcnJvdyBzZWFyY2gnO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBzZXRTZWFyY2hpbmdUZXh0OiBzZXRTZWFyY2hpbmdUZXh0LFxuICAgICAgICBzZXROb1Jlc3VsdHNUZXh0OiBzZXROb1Jlc3VsdHNUZXh0LFxuICAgICAgICBzZXRMb2FkTW9yZVRleHQ6IHNldExvYWRNb3JlVGV4dCxcbiAgICAgICAgZ2V0U2VhcmNoaW5nVGV4dDogZ2V0U2VhcmNoaW5nVGV4dCxcbiAgICAgICAgZ2V0Tm9SZXN1bHRzVGV4dDogZ2V0Tm9SZXN1bHRzVGV4dCxcbiAgICAgICAgZ2V0TG9hZE1vcmVUZXh0OiBnZXRMb2FkTW9yZVRleHRcbiAgICAgIH07XG5cbiAgICAgIGZ1bmN0aW9uIHNldFNlYXJjaGluZ1RleHQodGV4dCkge1xuICAgICAgICB0ZXh0U2VhcmNoaW5nID0gdGV4dDtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gc2V0Tm9SZXN1bHRzVGV4dCh0ZXh0KSB7XG4gICAgICAgIHRleHROb1Jlc3VsdHMgPSB0ZXh0O1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBzZXRMb2FkTW9yZVRleHQodGV4dCkge1xuICAgICAgICB0ZXh0TG9hZE1vcmUgPSB0ZXh0O1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBnZXRTZWFyY2hpbmdUZXh0KCkge1xuICAgICAgICByZXR1cm4gdGV4dFNlYXJjaGluZztcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gZ2V0Tm9SZXN1bHRzVGV4dCgpIHtcbiAgICAgICAgcmV0dXJuIHRleHROb1Jlc3VsdHM7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGdldExvYWRNb3JlVGV4dCgpIHtcbiAgICAgICAgcmV0dXJuIHRleHRMb2FkTW9yZTtcbiAgICAgIH1cblxuICAgIH0pO1xufSkoKTsiLCJhbmd1bGFyLm1vZHVsZSgnY2stYXV0b2NvbXBsZXRlJykucnVuKFsnJHRlbXBsYXRlQ2FjaGUnLCBmdW5jdGlvbigkdGVtcGxhdGVDYWNoZSkgeyR0ZW1wbGF0ZUNhY2hlLnB1dCgnL2F1dG9jb21wbGV0ZS5saXN0LnRwbC5odG1sJywnPGRpdiBjbGFzcz1cImFuZ3Vjb21wbGV0ZS1ob2xkZXJcIiBuZy1jbGFzcz1cIntcXCdhbmd1Y29tcGxldGUtZHJvcGRvd24tdmlzaWJsZVxcJzogc2hvd0Ryb3Bkb3dufVwiPlxcbiAgPGlucHV0IGlkPVwie3tpZH19X3ZhbHVlXCIgbmFtZT1cInt7aW5wdXROYW1lfX1cIiB0YWJpbmRleD1cInt7ZmllbGRUYWJpbmRleH19XCJcXG4gICAgICAgICBuZy1jbGFzcz1cIntcXCdhbmd1Y29tcGxldGUtaW5wdXQtbm90LWVtcHR5XFwnOiBub3RFbXB0eX1cIiBuZy1tb2RlbD1cInNlYXJjaFN0clwiIG5nLWRpc2FibGVkPVwiZGlzYWJsZUlucHV0XCJcXG4gICAgICAgICB0eXBlPVwie3tpbnB1dFR5cGV9fVwiIHBsYWNlaG9sZGVyPVwie3twbGFjZWhvbGRlcn19XCIgbWF4bGVuZ3RoPVwie3ttYXhsZW5ndGh9fVwiIG5nLWZvY3VzPVwib25Gb2N1c0hhbmRsZXIoKVwiXFxuICAgICAgICAgY2xhc3M9XCJ7e2lucHV0Q2xhc3N9fVwiIG5nLWZvY3VzPVwicmVzZXRIaWRlUmVzdWx0cygpXCIgbmctYmx1cj1cImhpZGVSZXN1bHRzKCRldmVudClcIiBhdXRvY2FwaXRhbGl6ZT1cIm9mZlwiXFxuICAgICAgICAgYXV0b2NvcnJlY3Q9XCJvZmZcIiBhdXRvY29tcGxldGU9XCJvZmZcIiBuZy1jaGFuZ2U9XCJpbnB1dENoYW5nZUhhbmRsZXIoc2VhcmNoU3RyKVwiLz5cXG5cXG4gIDxkaXYgaWQ9XCJ7e2lkfX1fZHJvcGRvd25cIiBjbGFzcz1cImFuZ3Vjb21wbGV0ZS1kcm9wZG93blwiIG5nLXNob3c9XCJzaG93RHJvcGRvd25cIj5cXG5cXG4gICAgPGRpdiBjbGFzcz1cImFuZ3Vjb21wbGV0ZS1zZWFyY2hpbmdcIiBuZy1zaG93PVwic2VhcmNoaW5nXCIgbmctYmluZD1cInRleHRTZWFyY2hpbmdcIj48L2Rpdj5cXG4gICAgPGRpdiBjbGFzcz1cImFuZ3Vjb21wbGV0ZS1zZWFyY2hpbmdcIiBuZy1zaG93PVwiIXNlYXJjaGluZyAmJiAoIXJlc3VsdHMgfHwgcmVzdWx0cy5sZW5ndGggPT0gMClcIlxcbiAgICAgICAgIG5nLWJpbmQ9XCJ0ZXh0Tm9SZXN1bHRzXCI+PC9kaXY+XFxuXFxuICAgIDxkaXYgY2xhc3M9XCJhbmd1Y29tcGxldGUtbG9hZG1vcmVcIiBkaXNhYmxlZCBuZy1zaG93PVwiIXNlYXJjaGluZyAmJiAkcGFyZW50LmxvYWRNb3JlXCI+XFxuICAgICAge3sgJHBhcmVudC50ZXh0TG9hZE1vcmUgfX1cXG4gICAgPC9kaXY+XFxuXFxuICAgIDxkaXYgY2xhc3M9XCJhbmd1Y29tcGxldGUtcm93XCIgbmctcmVwZWF0PVwicmVzdWx0IGluIHJlc3VsdHNcIiBuZy1jbGljaz1cInNlbGVjdFJlc3VsdChyZXN1bHQpXCJcXG4gICAgICAgICBuZy1tb3VzZWVudGVyPVwiaG92ZXJSb3coJGluZGV4KVwiIG5nLWNsYXNzPVwie1xcJ2FuZ3Vjb21wbGV0ZS1zZWxlY3RlZC1yb3dcXCc6ICRpbmRleCA9PSBjdXJyZW50SW5kZXh9XCI+XFxuXFxuICAgICAgPGRpdiBjbGFzcz1cImFuZ3Vjb21wbGV0ZS10aXRsZVwiPjxzcGFuIGNsYXNzPVwiYW5ndWNvbXBsZXRlLWNoZWNraXRcIiBuZy1yZXBlYXQ9XCJwYXJ0IGluIHJlc3VsdC50aXRsZVwiIG5nLWNsYXNzPVwie1ttYXRjaENsYXNzXTogcGFydC5tYXRjaH1cIj57e3BhcnQuc3RyaW5nfX08L3NwYW4+PC9kaXY+XFxuXFxuICAgICAgPGRpdiBuZy1pZj1cInJlc3VsdC5kZXNjcmlwdGlvbiAmJiByZXN1bHQuZGVzY3JpcHRpb24ubGVuZ3RoID4gMFwiIGNsYXNzPVwiYW5ndWNvbXBsZXRlLWRlc2NyaXB0aW9uXCI+PHNwYW5cXG4gICAgICAgICAgICAgIGNsYXNzPVwiYW5ndWNvbXBsZXRlLWNoZWNraXRcIlxcbiAgICAgICAgICAgICAgbmctcmVwZWF0PVwicGFydCBpbiByZXN1bHQuZGVzY3JpcHRpb25cIiBuZy1jbGljaz1cInNlbGVjdFJlc3VsdChyZXN1bHQpXCJcXG4gICAgICAgICAgICAgIG5nLWNsYXNzPVwie1ttYXRjaENsYXNzXTogcGFydC5tYXRjaH1cIj57e3BhcnQuc3RyaW5nfX08L3NwYW4+PC9kaXY+XFxuICAgIDwvZGl2PlxcblxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuJyk7XG4kdGVtcGxhdGVDYWNoZS5wdXQoJy9hdXRvY29tcGxldGUudHBsLmh0bWwnLCc8c3BhbiBjbGFzcz1cImF1dG9jb21wbGV0ZVwiIGFuZ3Vjb21wbGV0ZS1hbHRcXG4gICAgdHlwZT1cInNlYXJjaFwiXFxuICAgIG5nLWF0dHItaWQ9XCJ7eyAkY3RybC5lbGVtZW50SWQgfHwgdW5kZWZpbmVkIH19XCJcXG4gICAgcGxhY2Vob2xkZXI9XCJ7eyAkY3RybC5wbGFjZWhvbGRlciB9fVwiXFxuICAgIG1pbmxlbmd0aD1cInt7ICRjdHJsLm1pbkxlbmd0aCB9fVwiXFxuICAgIHRleHQtc2VhcmNoaW5nPVwie3sgJGN0cmwudGV4dFNlYXJjaGluZyB9fVwiXFxuICAgIHRleHQtbm8tcmVzdWx0cz1cInt7ICRjdHJsLnRleHROb1Jlc3VsdHMgfX1cIlxcbiAgICB0ZW1wbGF0ZS11cmw9XCIvYXV0b2NvbXBsZXRlLmxpc3QudHBsLmh0bWxcIlxcblxcbiAgICByZW1vdGUtYXBpLWhhbmRsZXI9XCIkY3RybC5zZWFyY2hcIlxcbiAgICB0aXRsZS1maWVsZD1cInt7ICRjdHJsLmRpc3BsYXlGaWVsZCB9fVwiXFxuICAgIGRlc2NyaXB0aW9uLWZpZWxkPVwie3skY3RybC5kZXNjcmlwdGlvbkZpZWxkfX1cIlxcbiAgICBpbml0aWFsLXZhbHVlPVwiJGN0cmwuaW5pdGlhbERpc3BsYXlcIlxcblxcbiAgICBpbnB1dC1jbGFzcz1cInt7JGN0cmwubGlzdENsYXNzfX1cIlxcbiAgICBtYXRjaC1jbGFzcz1cImFuZ3Vjb21wbGV0ZS1oaWdobGlnaHRcIlxcbiAgICBkaXNhYmxlLWlucHV0PVwiJGN0cmwuZGlzYWJsZUlucHV0XCJcXG5cXG4gICAgc2VsZWN0ZWQtb2JqZWN0PVwiJGN0cmwub25TZWxlY3RcIlxcbiAgICBpbnB1dC1jaGFuZ2VkPVwiJGN0cmwub25DaGFuZ2VcIlxcbiAgICBjbGVhci1zZWxlY3RlZD1cInt7ICRjdHJsLmNsZWFyU2VsZWN0ZWQgfX1cIlxcblxcbiAgICBmb2N1cy1vdXQ9XCIkY3RybC5vbkZvY3VzT3V0KClcIlxcbiAgICBmb2N1cy1pbj1cIiRjdHJsLm9uRm9jdXNJbigpXCJcXG5cXG4gICAgZmllbGQtcmVxdWlyZWQ9XCIkY3RybC5maWVsZFJlcXVpcmVkXCJcXG4gICAgZmllbGQtcmVxdWlyZWQtY2xhc3M9XCJ7eyRjdHJsLmZpZWxkUmVxdWlyZWRDbGFzc319XCJcXG4gICAgaW5wdXQtbmFtZT1cInt7JGN0cmwuaW5wdXROYW1lfX1cIj5cXG48L3NwYW4+XFxuJyk7fV0pOyIsIihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIGFuZ3VsYXIubW9kdWxlKCdjay1hdXRvY29tcGxldGUnKVxuICAgIC5maWx0ZXIoJ3dpdGhvdXQnLCB3aXRob3V0RmlsdGVyKTtcblxuICAvKipcbiAgICogRmlsdGVycyBvdXQgZnJvbSB0aGUgc291cmNlIGFycmF5IGl0ZW1zIGZyb20gdGhlIGV4Y2x1c2lvbiBhcnJheSB0aGF0IG1hdGNoIGVpdGhlciBieSA9PT0gZXF1YWxpdHlcbiAgICogb3IgdGhlaXIgaWQgcHJvcGVydHlcbiAgICogQHJldHVybnMge0Z1bmN0aW9ufVxuICAgKi9cbiAgZnVuY3Rpb24gd2l0aG91dEZpbHRlcigpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oc291cmNlQXJyYXksIGV4Y2x1c2lvbkFycmF5LCBnZXRJZCkge1xuICAgICAgZ2V0SWQgPSBnZXRJZCB8fCBmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIHJldHVybiBpdGVtLmlkO1xuICAgICAgfTtcblxuICAgICAgaWYgKGV4Y2x1c2lvbkFycmF5ICYmIChleGNsdXNpb25BcnJheS5sZW5ndGggPiAwKSkge1xuICAgICAgICByZXR1cm4gc291cmNlQXJyYXkuZmlsdGVyKGZ1bmN0aW9uKHNvdXJjZUl0ZW0pIHtcbiAgICAgICAgICB2YXIgc291cmNlSWQgPSBnZXRJZChzb3VyY2VJdGVtKTtcblxuICAgICAgICAgIHJldHVybiAhZXhjbHVzaW9uQXJyYXkuc29tZShmdW5jdGlvbihleGNsdXNpb25JdGVtKSB7XG4gICAgICAgICAgICB2YXIgZXhjbHVzaW9uSWQgPSBnZXRJZChleGNsdXNpb25JdGVtKTtcblxuICAgICAgICAgICAgcmV0dXJuIHNvdXJjZUl0ZW0gPT09IGV4Y2x1c2lvbkl0ZW1cbiAgICAgICAgICAgICAgfHwgKHNvdXJjZUlkICYmIGV4Y2x1c2lvbklkICYmIGFuZ3VsYXIuZXF1YWxzKHNvdXJjZUlkLCBleGNsdXNpb25JZCkpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBzb3VyY2VBcnJheTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG59KSgpO1xuIl19
