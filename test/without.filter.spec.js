'use strict';

describe('Without filter', function() {

  var $filter;

  beforeEach(module('ck-autocomplete'));

  beforeEach(inject(function(_$filter_) {
    $filter = _$filter_;
  }));

  describe('with no exclusion items provided', function() {
    it('should return the source array', function() {
      var input = [1,2,3];

      var output = $filter('without')(input);

      expect(output).toBe(input);
    });
  });

  describe('with exclusion items provided', function() {
    it('should not modify the existing array', function() {
      var obj = {id: 1};
      var input = [obj];

      $filter('without')(input, [obj]);

      expect(input.length).toBe(1);
      expect(input[0]).toBe(obj);
    });

    it('should reject items via reference equality', function() {
      var obj1 = {id: 1};
      var obj2 = {id: 2};

      var output = $filter('without')([obj1, obj2], [obj1]);

      expect(output).toEqual([obj2]);
    });

    it('should reject items via id equality', function() {
      var output = $filter('without')([{id: 1}, {id: 2}], [{id: 1}]);

      expect(output).toEqual([{id: 2}]);
    });
  });

  describe('with a getId function provided', function() {
    it('should use the custom id function to determine equality', function() {
      var obj11 = {
        id: {
          entityId: '123',
          version: 1
        }
      };

      var obj12 = {
        id: {
          entityId: '123',
          version: 2
        }
      };

      var output = $filter('without')([obj11], [obj12], function(item) { return item.id.entityId; });

      expect(output).toEqual([]);
    });
  });

});
