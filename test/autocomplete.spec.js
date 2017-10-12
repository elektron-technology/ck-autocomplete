'use strict';

describe('Autocomplete component', function() {

  var $componentController;

  var $q, $rootScope, $scope, $timeout;

  var mockWithoutFilter = function() {
    return [{ id: 'id2', name: 'name2' }];
  };
  var translateSpy, withoutSpy;

  beforeEach(module('ck-autocomplete'));

  beforeEach(module(function($provide) {
    translateSpy = jasmine.createSpy('translateFilter').and.callFake(function(text) {
      return text;
    });
    withoutSpy = jasmine.createSpy('withoutFilter').and.callFake(function() {
      return [{ id: 'id2', name: 'name2' }];
    });
    $provide.value('withoutFilter', withoutSpy );
  }));

  beforeEach(inject(function(_$componentController_, _$q_, _$rootScope_, _$timeout_) {
    $componentController = _$componentController_;
    $q = _$q_;
    $rootScope = _$rootScope_;
    $scope = $rootScope.$new();
    $timeout = _$timeout_;
  }));

  it('should initialize component with default values', function() {
    // Arrange
    var search = jasmine.createSpy('search');
    var model = {};
    var bindings = { model: model, onSearch: search };

    // Act
    var ctrl = $componentController('ckAutocomplete', null, bindings);

    // Assert
    expect(ctrl.onSearch).toBe(search);
    expect(ctrl.cache).toEqual({});
    expect(ctrl.model).toBe(model);
    expect(ctrl.limit).toBe(10);
    expect(ctrl.findById).toBeUndefined();
    expect(ctrl.initialDisplay).toBeUndefined();
    expect(ctrl.displayField).toBe('name');
    expect(ctrl.idField).toBe('id.entityId');
    expect(ctrl.minLength).toBe(0);
    expect(ctrl.textSearching).toBe('Searching...');
    expect(ctrl.textNoResults).toBe('No results');
    expect(ctrl.clearOnNoSelection).toBe(false);
    expect(ctrl.disableInput).toBe(false);
    expect(ctrl.clearSelected).toBeUndefined();
    expect(ctrl.onSelected).toBeUndefined();
  });

  it('should allow override of parameters through component API', function() {
    // Arrange
    var bindings = {
      limit: 3, displayField: 'desc', idField: 'customId', minLength: 4,
      textSearching: 'searching', textNoResults: 'noresults', textLoadMore: 'loadmore',
      clearOnNoSelection: true, clearSelected: 'true'
    };

    // Act
    var ctrl = $componentController('ckAutocomplete', null, bindings);

    // Assert
    expect(ctrl.limit).toBe(3);
    expect(ctrl.displayField).toBe('desc');
    expect(ctrl.idField).toBe('customId');
    expect(ctrl.minLength).toBe(4);
    expect(ctrl.textSearching).toBe('searching');
    expect(ctrl.textNoResults).toBe('noresults');
    expect(ctrl.clearOnNoSelection).toBe(true);
    expect(ctrl.clearSelected).toBe('true');
    expect(translateSpy).not.toHaveBeenCalled();
  });

  it('should fetch entity if model and findById are provided', function (){
    // Arrange
    var model = 'someid';
    var entity = { id: 'someid', name: 'somename' };
    var findById = jasmine.createSpy('findById').and.returnValue($q.resolve(entity));

    var bindings = { model: model, findById: findById };

    // Act
    var ctrl = $componentController('ckAutocomplete', null, bindings);
    $rootScope.$digest();

    // Assert
    expect(ctrl.findById).toHaveBeenCalledWith({ id: 'someid' });
    expect(ctrl.initialDisplay).toBe('somename');
  });

  it('should call the given onSearch function when searching', function (done) {
    // Arrange
    var model = {};
    var entities = [{ id: 'id1', name: 'name1' }, { id: 'id2', name: 'name2' }] ;
    var onSearch = jasmine.createSpy('onSearch').and.returnValue($q.resolve(entities));

    var bindings = { model: model, onSearch: onSearch };

    // Act
    var ctrl = $componentController('ckAutocomplete', null, bindings);
    ctrl.search('name').then(function(matches) {
      // Assert
      expect(matches).toBe(entities);
      expect(ctrl.onSearch).toHaveBeenCalled();
      expect(ctrl.onSearch.calls.argsFor(0)[0]).toEqual({ skip: 0, limit: 11, term: 'name' });
      done();
    });
    $rootScope.$digest();
  });

  it('should remove last element when we get more than the specified limit', function (done) {
    // Arrange
    var model = {};
    var entities = [
      { id: 'id1', name: 'name1' },
      { id: 'id2', name: 'name2' },
      { id: 'id3', name: 'name3' },
      { id: 'id4', name: 'name4' },
      { id: 'id5', name: 'name5' },
      { id: 'id6', name: 'name6' },
      { id: 'id7', name: 'name7' },
      { id: 'id8', name: 'name8' },
      { id: 'id9', name: 'name9' },
      { id: 'id10', name: 'name10' },
      { id: 'id11', name: 'name11' },
      { id: 'id12', name: 'name12' },
      { id: 'id13', name: 'name13' },
      { id: 'id14', name: 'name14' },
      { id: 'id15', name: 'name15' },
      ];
    var onSearch = jasmine.createSpy('onSearch').and.returnValue($q.resolve(entities));

    var bindings = { model: model, onSearch: onSearch };

    // Act
    var ctrl = $componentController('ckAutocomplete', null, bindings);
    ctrl.search('name').then(function(matches) {
      // Assert
      expect(matches).toEqual(entities);
      expect(matches.length).toBe(10);
      expect(ctrl.onSearch).toHaveBeenCalled();
      expect(ctrl.onSearch.calls.argsFor(0)[0]).toEqual({ skip: 0, limit: 11, term: 'name' });
      done();
    });
    $rootScope.$digest();
  });

  it('should cache the results of a particular query', function (done) {
    // Arrange
    var model = {};
    var entities = [{ id: 'id1', name: 'name1' }, { id: 'id2', name: 'name2' }] ;
    var onSearch = jasmine.createSpy('onSearch').and.returnValue($q.resolve(entities));

    var bindings = { model: model, onSearch: onSearch };

    // Act
    var ctrl = $componentController('ckAutocomplete', null, bindings);
    ctrl.search('name').then(function(matches) {
      // Assert
      expect(ctrl.onSearch).toHaveBeenCalled();
      expect(ctrl.cache['name']).toBeDefined();
      expect(ctrl.cache['name']).toEqual(matches);
      done();
    });
    $rootScope.$digest();
  });

  it('should use the cache when searching a previous query', function (done) {
    // Arrange
    var model = {};
    var entities = [{ id: 'id1', name: 'name1' }, { id: 'id2', name: 'name2' }] ;
    var onSearch = jasmine.createSpy('onSearch').and.returnValue($q.resolve(entities));

    var bindings = { model: model, onSearch: onSearch };

    // Act
    var ctrl = $componentController('ckAutocomplete', null, bindings);
    ctrl.search('name').then(function(matches1) {
      ctrl.search('name').then(function(matches2) {
        // Assert
        expect(ctrl.onSearch.calls.count()).toBe(1);
        expect(matches1).toEqual(entities);
        expect(matches2).toEqual(entities);
        done();
      });
    });
    $rootScope.$digest();
  });

  it('should escape regex special characters and perform onSearch', function (done) {
    // Arrange
    var model = {};
    var entities = [{ id: 'id1', name: 'name1' }, { id: 'id2', name: 'name2' }] ;
    var onSearch = jasmine.createSpy('onSearch').and.returnValue($q.resolve(entities));

    var bindings = { model: model, onSearch: onSearch };

    // Act
    var ctrl = $componentController('ckAutocomplete', null, bindings);
    ctrl.search('*name').then(function(matches) {
      // Assert
      expect(matches.length).toBe(2);
      expect(ctrl.onSearch).toHaveBeenCalled();
      expect(ctrl.onSearch.calls.argsFor(0)[0]).toEqual({ skip: 0, limit: 11, term: '\\*name' });
      done();
    });
    $rootScope.$digest();
  });

  it('should exclude the contents of the exclusion list if set', function (done) {
    // Arrange
    var model = {};
    var entities = [{ id: 'id1', name: 'name1' }, { id: 'id2', name: 'name2' }];
    var filteredEntities = [{ id: 'id2', name: 'name2' }];
    var onSearch = jasmine.createSpy('onSearch').and.returnValue($q.resolve(entities));

    var bindings = { model: model, onSearch: onSearch, exclusionList: [{id: 'id1', name: 'name1'}] };

    // Act
    var ctrl = $componentController('ckAutocomplete', null, bindings);
    ctrl.search('name').then(function(matches) {
      // Assert
      expect(ctrl.onSearch).toHaveBeenCalled();
      expect(matches).toEqual(filteredEntities);
      done();
    });
    $rootScope.$digest();
  });

  it('should return nothing when not selecting a list item', function () {
    // Arrange
    var search = jasmine.createSpy('search');
    var model = {};
    var bindings = { model: model, onSearch: search };

    // Act
    var ctrl = $componentController('ckAutocomplete', null, bindings);
    var result = ctrl.onSelect();

   // Assert
    expect(result).toBeUndefined();
  });

  it('should set the id field of the selected object to the model for a composed id', function () {
    // Arrange
    var search = jasmine.createSpy('search');
    var model = {};
    var selected = { originalObject: { id: { entityId: 'someid' } } };
    var bindings = { model: model, onSearch: search };

    // Act
    var ctrl = $componentController('ckAutocomplete', null, bindings);
    ctrl.onSelect(selected);

    // Assert
    expect(ctrl.model).toBe('someid');
  });

  it('should set the id field of the selected object to the model for a simple id', function () {
    // Arrange
    var search = jasmine.createSpy('search');
    var model = {};
    var selected = { originalObject: { customId: 'someid' } };
    var bindings = { model: model, onSearch: search, idField: 'customId' };

    // Act
    var ctrl = $componentController('ckAutocomplete', null, bindings);
    ctrl.onSelect(selected);

    // Assert
    expect(ctrl.model).toBe('someid');
  });

  it('should set the id field of the selected object to the model', function () {
    // Arrange
    var search = jasmine.createSpy('search');
    var model = {};
    var selected = { originalObject: { customId: 'someid' } };
    var bindings = { model: model, onSearch: search, returnObject: 'true' };

    // Act
    var ctrl = $componentController('ckAutocomplete', null, bindings);
    ctrl.onSelect(selected);

    // Assert
    expect(ctrl.model).toBe(selected.originalObject);  });

  it('should set the id field of the selected object snd call the onSelected callback', function () {
    // Arrange
    var search = jasmine.createSpy('search');
    var onSelected = jasmine.createSpy('onSelected');
    var model = {};
    var selected = { originalObject: { id: { entityId: 'someid' } } };
    var bindings = { model: model, onSearch: search, onSelected: onSelected };

    // Act
    var ctrl = $componentController('ckAutocomplete', null, bindings);
    ctrl.onSelect(selected);

    // Assert
    $timeout.flush();
    expect(onSelected).toHaveBeenCalled();
  });

  it('should empty model if clearOnNoSelection is enabled and text does not match a selection item', function () {
    // Arrange
    var search = jasmine.createSpy('search');
    var model = 'somemodel';
    var bindings = { model: model, onSearch: search, clearOnNoSelection: true };

    // Act
    var ctrl = $componentController('ckAutocomplete', null, bindings);
    ctrl.onSelect(undefined);

    // Assert
    expect(ctrl.model).toBeUndefined();
  });

  it('should not modify model if clearOnNoSelection is disabled and text does not match a selection item', function () {
    // Arrange
    var search = jasmine.createSpy('search');
    var model = 'somemodel';
    var bindings = { model: model, onSearch: search, clearOnNoSelection: false };

    // Act
    var ctrl = $componentController('ckAutocomplete', null, bindings);
    ctrl.onSelect(undefined);

    // Assert
    expect(ctrl.model).toBe('somemodel');
  });

  it('should not modify the model if there is still a typed term', function () {
    // Arrange
    var search = jasmine.createSpy('search');
    var model = 'somemodel';
    var bindings = { model: model, onSearch: search };

    // Act
    var ctrl = $componentController('ckAutocomplete', null, bindings);
    ctrl.onChange('someterm');

    // Assert
    expect(ctrl.model).toBe('somemodel');
  });

  it('should empty model if we do not enter a term', function () {
    // Arrange
    var search = jasmine.createSpy('search');
    var model = 'somemodel';
    var bindings = { model: model, onSearch: search };

    // Act
    var ctrl = $componentController('ckAutocomplete', null, bindings);
    ctrl.onChange();

    // Assert
    expect(ctrl.model).toBeUndefined();
  });

  it('should clear field if it loses focus and the model is not set', function() {
    // Arrange
    var search = jasmine.createSpy('search');
    var bindings = { onSearch: search, clearOnNoSelection: true };
    spyOn($scope, '$broadcast');

    // Act
    var ctrl = $componentController('ckAutocomplete', { $scope: $scope }, bindings);
    ctrl.onFocusOut();

    // Assert
    expect($scope.$broadcast).toHaveBeenCalledWith('angucomplete-alt:clearInput');
  });

  it('should not clear field if it loses focus and the model is set', function() {
    // Arrange
    var search = jasmine.createSpy('search');
    var model = 'somemodel';
    var bindings = { onSearch: search, model: model, clearOnNoSelection: true };
    spyOn($scope, '$broadcast');

    // Act
    var ctrl = $componentController('ckAutocomplete', { $scope: $scope }, bindings);
    ctrl.onFocusOut();

    // Assert
    expect($scope.$broadcast).not.toHaveBeenCalled();
  });

  it('should not clear field if the clearOnFocus option is disabled', function() {
    // Arrange
    var search = jasmine.createSpy('search');
    var model = 'somemodel';
    var bindings = { onSearch: search, model: model };
    spyOn($scope, '$broadcast');

    // Act
    var ctrl = $componentController('ckAutocomplete', { $scope: $scope }, bindings);
    ctrl.onFocusOut();

    // Assert
    expect($scope.$broadcast).not.toHaveBeenCalled();
  });

  it('should clear the cache when clearing the input when a broadcast to the component is received', function() {
    // Arrange
    var search = jasmine.createSpy('search').and.returnValue($q.resolve([{ name : 'a result'}]));
    var model = 'somemodel';
    var bindings = { onSearch: search, model: model };
    spyOn($scope, '$broadcast');
    var id = "my_id";

    // Act
    var ctrl = $componentController('ckAutocomplete', { $scope: $scope }, bindings);
    ctrl.search('term');
    $rootScope.$digest();
    $rootScope.$broadcast('ck-autocomplete:clearInput', id);
    ctrl.search('term');
    $rootScope.$digest();

    // Assert
    expect($scope.$broadcast).toHaveBeenCalledWith('angucomplete-alt:clearInput', id);
    expect(search.calls.count()).toEqual(2);
  });


  it('should clear the input with the specified id when a broadcast to the component is received', function() {
    // Arrange
    var search = jasmine.createSpy('search');
    var model = 'somemodel';
    var bindings = { onSearch: search, model: model };
    spyOn($scope, '$broadcast');
    var id = "my_id";

    // Act
    var ctrl = $componentController('ckAutocomplete', { $scope: $scope }, bindings);
    $rootScope.$broadcast('ck-autocomplete:clearInput', id);

    // Assert
    expect($scope.$broadcast).toHaveBeenCalledWith('angucomplete-alt:clearInput', id);
  });

  it('should clear all inputs when a broadcast to the component is received', function() {
    // Arrange
    var search = jasmine.createSpy('search');
    var model = 'somemodel';
    var bindings = { onSearch: search, model: model };
    spyOn($scope, '$broadcast');

    // Act
    var ctrl = $componentController('ckAutocomplete', { $scope: $scope }, bindings);
    $rootScope.$broadcast('ck-autocomplete:clearInput');

    // Assert
    expect($scope.$broadcast).toHaveBeenCalledWith('angucomplete-alt:clearInput');
  });

});