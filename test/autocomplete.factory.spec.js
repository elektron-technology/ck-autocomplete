'use strict';

describe('Autocomplete Config Factory', function() {

  var ckAutocompleteConfig;

  beforeEach(module('ck-autocomplete'));

  beforeEach(inject(function(_ckAutocompleteConfig_) {
    ckAutocompleteConfig = _ckAutocompleteConfig_;
  }));

  it('should be able to update and retrieve Searching text', function() {
    // Arrange
    var text = 'randomtext';

    // Act
    ckAutocompleteConfig.setSearchingText(text);

    // Assert
    expect(ckAutocompleteConfig.getSearchingText()).toBe(text);
  });

  it('should be able to update and retrieve No Results text', function() {
    // Arrange
    var text = 'randomtext';

    // Act
    ckAutocompleteConfig.setNoResultsText(text);

    // Assert
    expect(ckAutocompleteConfig.getNoResultsText()).toBe(text);
  });

  it('should be able to update and retrieve Lod More text', function() {
    // Arrange
    var text = 'randomtext';

    // Act
    ckAutocompleteConfig.setLoadMoreText(text);

    // Assert
    expect(ckAutocompleteConfig.getLoadMoreText()).toBe(text);
  });

});