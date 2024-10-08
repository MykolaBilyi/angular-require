define(['angular', 'require'], function(angular, require){
    'use strict';
    
    var $providerInjector,
        $injector = angular.injector(), //Dummy injector
        registeredModules = [],
        ownModule = angular.module('angular-require', [])
            .run(['$injector', function(_injector) {
                $injector = _injector;
            }])
            .provider('$require', ['$injector', function ($injector) {
                $providerInjector = $injector;
                this.$get = ['$q', function ($q) {
                    return function (moduleName) {
                        return $q(function(resolve, reject) {
                            load(moduleName, require, resolve, reject);
                        });
                    };
                }];
                this.setAsLoaded = function setModuleLoaded(module) {
                    if (registeredModules.indexOf(module) !== -1) {
                        return this;
                    }
                    registeredModules.push(module);
                    angular.forEach(angular.module(module).requires, setModuleLoaded, this);
                    return this;
                };
            }]);
    
    return {
        load: function (moduleName, req, onload) {
            load(moduleName, req, onload, onload.error);
        }
    };
    
    function load(moduleName, require, resolve, reject) {
        try {
            var module = angular.module(moduleName);
        }
        catch(e) {
            require([moduleName], inject, reject);
        }

        module && inject(module);
        
        function inject(module) {
            try {
                resolve(injectModule(module || angular.module(moduleName)));
            }
            catch(e) {
                reject(e);
            }
        }
    }
    
    function injectModule(module) {
        if (!$providerInjector) {
            //application is not instantiated yet
            //Add dependency to self module
            ownModule.requires.push(module.name);
        }
        else if (!isInjected(module.name)) {
            angular.forEach(injectModules([module]), function(fn) {
                $injector.invoke(fn || angular.noop);
            });
        }
        return $injector;
    }
    
    function injectModules(modules) {
        var runBlocks = [];
        angular.forEach(modules, function(module) {
            var moduleFn = module;
            if (!angular.isString(module)) {
                module = module.name;
            }
            if (isInjected(module)) {
                return;
            }
            registeredModules.push(module);
            if (angular.isString(moduleFn)) {
                moduleFn = angular.module(module);
            }
            runBlocks = runBlocks.concat(injectModules(moduleFn.requires)).concat(moduleFn._runBlocks);
            angular.forEach(moduleFn._invokeQueue, invoke);
            angular.forEach(moduleFn._configBlocks, invoke);
        });
        return runBlocks;
    };
    
    function invoke($args) {
        var provider = $providerInjector.get($args[0]);
        provider[$args[1]].apply(provider, $args[2]);
    };

    function isInjected(module) {
        return registeredModules.indexOf(module) !== -1;
    };
});
