(function() {
  'use strict';

  angular.module('ck-autocomplete')
    .factory('ckAutocompleteConfig', function() {
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