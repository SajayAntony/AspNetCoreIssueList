'use strict';

/* Controllers */

function TeamCtrl($scope, $http) {
  $http.get('/api/issues/user').
    success(function(data, status, headers, config) {
      $scope.data = data.data;
    });
}
