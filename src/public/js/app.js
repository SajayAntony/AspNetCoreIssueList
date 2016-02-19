'use strict';

angular.module('myApp.routes', ['ngRoute']);

// Declare app level module which depends on filters, and services
angular.module('myApp', ['myApp.filters', 'myApp.services', 'myApp.directives', 'myApp.routes'])
.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
    $routeProvider.
      when('/team', {
        templateUrl: '/team/partials/users',
        controller: TeamCtrl
      }).      
      otherwise({
        redirectTo: '/'
      });
    $locationProvider.html5Mode(true);
  }]);