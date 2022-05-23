/**
 * Copyright 2022 Tristan Bonsor - All Rights Reserved.
 * 
 * This file, and its originating project files, are released under the MIT license: https://github.com/agogpixel/pgmmv-runtime-logger-plugin/blob/main/LICENSE
 * 
 * For more information, please see:
 *  - Github Repository: https://github.com/agogpixel/pgmmv-runtime-logger-input-plugin
 *  - Published Builds & Usage: https://agogpixel.itch.io/pgmmv-runtime-logger-plugin
 */
/******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/create-file-system-module.function.js":
/*!***************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/create-file-system-module.function.js ***!
  \***************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createFileSystemModule = void 0;
var create_resource_locks_manager_function_1 = __webpack_require__(/*! @agogpixel/pgmmv-resource-support/src/locks/create-resource-locks-manager.function */ "./node_modules/@agogpixel/pgmmv-resource-support/src/locks/create-resource-locks-manager.function.js");
var get_module_function_1 = __webpack_require__(/*! @agogpixel/pgmmv-resource-support/src/module/get-module.function */ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/get-module.function.js");
var has_module_function_1 = __webpack_require__(/*! @agogpixel/pgmmv-resource-support/src/module/has-module.function */ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/has-module.function.js");
var set_module_function_1 = __webpack_require__(/*! @agogpixel/pgmmv-resource-support/src/module/set-module.function */ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/set-module.function.js");
var poll_with_interval_function_1 = __webpack_require__(/*! @agogpixel/pgmmv-resource-support/src/time/poll-with-interval.function */ "./node_modules/@agogpixel/pgmmv-resource-support/src/time/poll-with-interval.function.js");
var operations_1 = __webpack_require__(/*! ./operations */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/index.js");
////////////////////////////////////////////////////////////////////////////////
// Public Static Properties
////////////////////////////////////////////////////////////////////////////////
// None.
////////////////////////////////////////////////////////////////////////////////
// Private Static Properties
////////////////////////////////////////////////////////////////////////////////
/**
 * File system module key.
 *
 * @private
 * @static
 */
var fsModuleKey = 'fs';
/**
 * Number of shared locks per file system resource.
 *
 * @private
 * @static
 */
var numSharedLocks = 2;
////////////////////////////////////////////////////////////////////////////////
// Public Static Methods
////////////////////////////////////////////////////////////////////////////////
/**
 * Create file system module.
 *
 * @returns File system module global singleton.
 */
function createFileSystemModule() {
    // Public API container.
    var self = {};
    // Singleton.
    if ((0, has_module_function_1.hasModule)(fsModuleKey)) {
        return (0, get_module_function_1.getModule)(fsModuleKey);
    }
    else if (!(0, set_module_function_1.setModule)(fsModuleKey, self)) {
        return undefined;
    }
    //////////////////////////////////////////////////////////////////////////////
    // Private Properties
    //////////////////////////////////////////////////////////////////////////////
    /**
     * File system resource operation queues.
     *
     * @private
     */
    var operationQueues = {};
    /**
     * File system resource locks manager.
     *
     * @private
     */
    var locksManager = (0, create_resource_locks_manager_function_1.createResourceLocksManager)();
    //////////////////////////////////////////////////////////////////////////////
    // Private Methods
    //////////////////////////////////////////////////////////////////////////////
    /**
     * Enqueue a file system operation.
     *
     * @param operation File system operation.
     * @private
     */
    function enqueueOperation(operation) {
        var path = operation.type === operations_1.ExclusiveFileSystemOperationType.RenameFile
            ? "".concat(operation.payload.dirPath, "/").concat(operation.payload.oldName)
            : operation.payload.path;
        if (!locksManager.hasLocks(path)) {
            locksManager.createLocks({ key: path, numSharedLocks: numSharedLocks, exclusiveLock: true });
        }
        if (!operationQueues[path]) {
            operationQueues[path] = [];
        }
        operationQueues[path].push(operation);
    }
    /**
     * Dequeue a file system operation for specified path.
     *
     * @param path File system path.
     * @returns File system operation or `undefined`.
     * @private
     */
    function dequeueOperation(path) {
        if (!operationQueues[path] || !operationQueues[path].length) {
            return;
        }
        var operation = operationQueues[path].shift();
        if (!operationQueues[path].length) {
            locksManager.destroyLocks(path);
            delete operationQueues[path];
        }
        return operation;
    }
    /**
     * Peek next file system operation type in the queue for specified path.
     *
     * @param path File system path.
     * @returns File system operation type of `undefined`.
     * @private
     */
    function peekOperationType(path) {
        if (!operationQueues[path] || !operationQueues[path].length) {
            return;
        }
        return operationQueues[path][0].type;
    }
    /**
     * Poll file system operation queues.
     *
     * @returns False to ensure continuous polling.
     * @private
     */
    function pollOperationQueues() {
        var paths = Object.keys(operationQueues);
        for (var _i = 0, paths_1 = paths; _i < paths_1.length; _i++) {
            var path = paths_1[_i];
            if (!operationQueues[path] || !operationQueues[path].length) {
                continue;
            }
            var operationType = peekOperationType(path);
            var releaseLock = void 0;
            switch (operationType) {
                case operations_1.ExclusiveFileSystemOperationType.AppendFile:
                case operations_1.ExclusiveFileSystemOperationType.RemoveFile:
                case operations_1.ExclusiveFileSystemOperationType.RenameFile:
                case operations_1.ExclusiveFileSystemOperationType.WriteFile:
                case operations_1.ExclusiveFileSystemOperationType.CreateDirectory:
                case operations_1.ExclusiveFileSystemOperationType.RemoveDirectory:
                    releaseLock = locksManager.acquireExclusiveLock(path);
                    break;
                case operations_1.SharedFileSystemOperationType.ReadFile:
                case operations_1.SharedFileSystemOperationType.ReadFileSize:
                    releaseLock = locksManager.acquireSharedLock(path);
                    break;
            }
            if (!releaseLock) {
                continue;
            }
            var operation = dequeueOperation(path);
            switch (operation.type) {
                case operations_1.ExclusiveFileSystemOperationType.WriteFile:
                    (0, operations_1.writeFileOperation)(operation.payload, releaseLock);
                    break;
                case operations_1.ExclusiveFileSystemOperationType.AppendFile:
                    (0, operations_1.appendFileOperation)(operation.payload, releaseLock);
                    break;
                case operations_1.ExclusiveFileSystemOperationType.RenameFile:
                    (0, operations_1.renameFileOperation)(operation.payload, releaseLock);
                    break;
                case operations_1.ExclusiveFileSystemOperationType.RemoveFile:
                    (0, operations_1.removeFileOperation)(operation.payload, releaseLock);
                    break;
                case operations_1.ExclusiveFileSystemOperationType.CreateDirectory:
                    (0, operations_1.createDirectoryOperation)(operation.payload, releaseLock);
                    break;
                case operations_1.ExclusiveFileSystemOperationType.RemoveDirectory:
                    (0, operations_1.removeDirectoryOperation)(operation.payload, releaseLock);
                    break;
                case operations_1.SharedFileSystemOperationType.ReadFile:
                    (0, operations_1.readFileOperation)(operation.payload, releaseLock);
                    break;
                case operations_1.SharedFileSystemOperationType.ReadFileSize:
                    (0, operations_1.readFileSizeOperation)(operation.payload, releaseLock);
                    break;
            }
        }
        return false;
    }
    //////////////////////////////////////////////////////////////////////////////
    // Protected Properties
    //////////////////////////////////////////////////////////////////////////////
    // None.
    //////////////////////////////////////////////////////////////////////////////
    // Protected Methods
    //////////////////////////////////////////////////////////////////////////////
    // None.
    //////////////////////////////////////////////////////////////////////////////
    // Public Properties
    //////////////////////////////////////////////////////////////////////////////
    // None.
    //////////////////////////////////////////////////////////////////////////////
    // Public Methods
    //////////////////////////////////////////////////////////////////////////////
    self.createDirectory = function (path, callback) {
        enqueueOperation({
            type: operations_1.ExclusiveFileSystemOperationType.CreateDirectory,
            payload: {
                path: path,
                callback: callback
            }
        });
        return self;
    };
    self.isAbsolutePath = function (path) {
        return jsb.fileUtils.isAbsolutePath(path);
    };
    self.isDirectory = function (path) {
        return jsb.fileUtils.isDirectoryExist(path);
    };
    self.isFile = function (path) {
        return jsb.fileUtils.isFileExist(path);
    };
    self.removeDirectory = function (path, callback) {
        enqueueOperation({
            type: operations_1.ExclusiveFileSystemOperationType.RemoveDirectory,
            payload: {
                path: path,
                callback: callback
            }
        });
        return self;
    };
    self.removeFile = function (path, callback) {
        enqueueOperation({
            type: operations_1.ExclusiveFileSystemOperationType.RemoveFile,
            payload: {
                path: path,
                callback: callback
            }
        });
        return self;
    };
    self.renameFile = function (dirPath, oldName, newName, callback) {
        enqueueOperation({
            type: operations_1.ExclusiveFileSystemOperationType.RenameFile,
            payload: {
                dirPath: dirPath,
                oldName: oldName,
                newName: newName,
                callback: callback
            }
        });
        return self;
    };
    self.readFile = function (path, callback) {
        enqueueOperation({
            type: operations_1.SharedFileSystemOperationType.ReadFile,
            payload: {
                path: path,
                callback: callback
            }
        });
        return self;
    };
    self.readFileSize = function (path, callback) {
        enqueueOperation({
            type: operations_1.SharedFileSystemOperationType.ReadFileSize,
            payload: {
                path: path,
                callback: callback
            }
        });
        return self;
    };
    self.writeFile = function (dataStr, path, callback) {
        enqueueOperation({
            type: operations_1.ExclusiveFileSystemOperationType.WriteFile,
            payload: {
                data: dataStr,
                path: path,
                callback: callback
            }
        });
        return self;
    };
    self.appendFile = function (dataStr, path, callback) {
        enqueueOperation({
            type: operations_1.ExclusiveFileSystemOperationType.AppendFile,
            payload: {
                data: dataStr,
                path: path,
                callback: callback
            }
        });
        return self;
    };
    // Poll indefinitely.
    (0, poll_with_interval_function_1.pollWithInterval)(pollOperationQueues, function () {
        return;
    }, function () {
        return;
    }, 500);
    // Module is ready!
    return self;
}
exports.createFileSystemModule = createFileSystemModule;
//# sourceMappingURL=create-file-system-module.function.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/index.js":
/*!**********************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/index.js ***!
  \**********************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
/**
 * Exports file system module APIs and implementations.
 *
 * @module
 */
__exportStar(__webpack_require__(/*! ./create-file-system-module.function */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/create-file-system-module.function.js"), exports);
//# sourceMappingURL=index.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/append-file/append-file-operation-payload.interface.js":
/*!*******************************************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/append-file/append-file-operation-payload.interface.js ***!
  \*******************************************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=append-file-operation-payload.interface.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/append-file/append-file-operation.function.js":
/*!**********************************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/append-file/append-file-operation.function.js ***!
  \**********************************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.appendFileOperation = void 0;
var get_string_byte_length_function_1 = __webpack_require__(/*! @agogpixel/pgmmv-resource-support/src/string/get-string-byte-length.function */ "./node_modules/@agogpixel/pgmmv-resource-support/src/string/get-string-byte-length.function.js");
var poll_with_backoff_function_1 = __webpack_require__(/*! @agogpixel/pgmmv-resource-support/src/time/poll-with-backoff.function */ "./node_modules/@agogpixel/pgmmv-resource-support/src/time/poll-with-backoff.function.js");
/**
 * Append file operation.
 *
 * @param payload Operation payload.
 * @param releaseLock Release lock callback.
 */
function appendFileOperation(payload, releaseLock) {
    var path = payload.path;
    var data = payload.data;
    var callback = payload.callback;
    var oldFileContent = jsb.fileUtils.getStringFromFile(path);
    var newFileContent = "".concat(oldFileContent ? oldFileContent + '\n' : '').concat(data);
    var newFileSize = (0, get_string_byte_length_function_1.getStringByteLength)(newFileContent);
    function conditional() {
        return newFileSize === jsb.fileUtils.getFileSize(path);
    }
    function onProceed() {
        releaseLock();
        callback(true);
    }
    function onTimeout(elapsed) {
        releaseLock();
        callback(false, "Append operation to '".concat(path, "' timed out after ").concat(elapsed / 1000, "s"));
    }
    var result = jsb.fileUtils.writeStringToFile(newFileContent, path);
    if (!result) {
        releaseLock();
        callback(false, "Append operation to '".concat(path, "' failed immediately"));
        return;
    }
    (0, poll_with_backoff_function_1.pollWithBackoff)(conditional, onProceed, onTimeout, 1000, 5);
}
exports.appendFileOperation = appendFileOperation;
//# sourceMappingURL=append-file-operation.function.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/append-file/append-file-operation.interface.js":
/*!***********************************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/append-file/append-file-operation.interface.js ***!
  \***********************************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=append-file-operation.interface.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/append-file/index.js":
/*!*********************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/append-file/index.js ***!
  \*********************************************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
/**
 * Exports append file operation APIs and implementations.
 *
 * @module
 */
__exportStar(__webpack_require__(/*! ./append-file-operation-payload.interface */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/append-file/append-file-operation-payload.interface.js"), exports);
__exportStar(__webpack_require__(/*! ./append-file-operation.function */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/append-file/append-file-operation.function.js"), exports);
__exportStar(__webpack_require__(/*! ./append-file-operation.interface */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/append-file/append-file-operation.interface.js"), exports);
//# sourceMappingURL=index.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/create-directory/create-directory-operation-payload.interface.js":
/*!*****************************************************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/create-directory/create-directory-operation-payload.interface.js ***!
  \*****************************************************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=create-directory-operation-payload.interface.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/create-directory/create-directory-operation.function.js":
/*!********************************************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/create-directory/create-directory-operation.function.js ***!
  \********************************************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createDirectoryOperation = void 0;
var poll_with_backoff_function_1 = __webpack_require__(/*! @agogpixel/pgmmv-resource-support/src/time/poll-with-backoff.function */ "./node_modules/@agogpixel/pgmmv-resource-support/src/time/poll-with-backoff.function.js");
/**
 * Create directory operation.
 *
 * @param payload Operation payload.
 * @param releaseLock Release lock callback.
 */
function createDirectoryOperation(payload, releaseLock) {
    var path = payload.path;
    var callback = payload.callback;
    function conditional() {
        return jsb.fileUtils.isDirectoryExist(path);
    }
    function onProceed() {
        releaseLock();
        callback(true);
    }
    function onTimeout(elapsed) {
        releaseLock();
        callback(false, "Create operation of '".concat(path, "' timed out after ").concat(elapsed / 1000, "s"));
    }
    var result = jsb.fileUtils.createDirectory(path);
    if (!result) {
        releaseLock();
        callback(false, "Create operation of '".concat(path, "' failed immediately"));
        return;
    }
    (0, poll_with_backoff_function_1.pollWithBackoff)(conditional, onProceed, onTimeout, 1000, 5);
}
exports.createDirectoryOperation = createDirectoryOperation;
//# sourceMappingURL=create-directory-operation.function.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/create-directory/create-directory-operation.interface.js":
/*!*********************************************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/create-directory/create-directory-operation.interface.js ***!
  \*********************************************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=create-directory-operation.interface.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/create-directory/index.js":
/*!**************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/create-directory/index.js ***!
  \**************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
/**
 * Exports create directory operation APIs and implementations.
 *
 * @module
 */
__exportStar(__webpack_require__(/*! ./create-directory-operation-payload.interface */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/create-directory/create-directory-operation-payload.interface.js"), exports);
__exportStar(__webpack_require__(/*! ./create-directory-operation.function */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/create-directory/create-directory-operation.function.js"), exports);
__exportStar(__webpack_require__(/*! ./create-directory-operation.interface */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/create-directory/create-directory-operation.interface.js"), exports);
//# sourceMappingURL=index.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/exclusive-file-system-operation-type.enum.js":
/*!*********************************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/exclusive-file-system-operation-type.enum.js ***!
  \*********************************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


/**
 * Exports exclusive file system operation type enumeration.
 *
 * @module
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ExclusiveFileSystemOperationType = void 0;
/**
 * Exclusive file system operation type enumeration.
 */
var ExclusiveFileSystemOperationType;
(function (ExclusiveFileSystemOperationType) {
    /**
     * Write file.
     */
    ExclusiveFileSystemOperationType[ExclusiveFileSystemOperationType["WriteFile"] = 0] = "WriteFile";
    /**
     * Append file.
     */
    ExclusiveFileSystemOperationType[ExclusiveFileSystemOperationType["AppendFile"] = 1] = "AppendFile";
    /**
     * Rename file.
     */
    ExclusiveFileSystemOperationType[ExclusiveFileSystemOperationType["RenameFile"] = 2] = "RenameFile";
    /**
     * Remove file.
     */
    ExclusiveFileSystemOperationType[ExclusiveFileSystemOperationType["RemoveFile"] = 3] = "RemoveFile";
    /**
     * Create directory.
     */
    ExclusiveFileSystemOperationType[ExclusiveFileSystemOperationType["CreateDirectory"] = 4] = "CreateDirectory";
    /**
     * Remove directory.
     */
    ExclusiveFileSystemOperationType[ExclusiveFileSystemOperationType["RemoveDirectory"] = 5] = "RemoveDirectory";
})(ExclusiveFileSystemOperationType = exports.ExclusiveFileSystemOperationType || (exports.ExclusiveFileSystemOperationType = {}));
//# sourceMappingURL=exclusive-file-system-operation-type.enum.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/file-system-operation-callback.type.js":
/*!***************************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/file-system-operation-callback.type.js ***!
  \***************************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=file-system-operation-callback.type.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/file-system-operation-union.type.js":
/*!************************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/file-system-operation-union.type.js ***!
  \************************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=file-system-operation-union.type.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/index.js":
/*!*********************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/index.js ***!
  \*********************************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.writeFileOperation = exports.renameFileOperation = exports.removeFileOperation = exports.removeDirectoryOperation = exports.readFileSizeOperation = exports.readFileOperation = exports.createDirectoryOperation = exports.appendFileOperation = void 0;
/**
 * Exports file system module operation APIs and implementations.
 *
 * @module
 */
var append_file_1 = __webpack_require__(/*! ./append-file */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/append-file/index.js");
Object.defineProperty(exports, "appendFileOperation", ({ enumerable: true, get: function () { return append_file_1.appendFileOperation; } }));
var create_directory_1 = __webpack_require__(/*! ./create-directory */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/create-directory/index.js");
Object.defineProperty(exports, "createDirectoryOperation", ({ enumerable: true, get: function () { return create_directory_1.createDirectoryOperation; } }));
__exportStar(__webpack_require__(/*! ./exclusive-file-system-operation-type.enum */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/exclusive-file-system-operation-type.enum.js"), exports);
__exportStar(__webpack_require__(/*! ./file-system-operation-callback.type */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/file-system-operation-callback.type.js"), exports);
__exportStar(__webpack_require__(/*! ./file-system-operation-union.type */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/file-system-operation-union.type.js"), exports);
var read_file_1 = __webpack_require__(/*! ./read-file */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/read-file/index.js");
Object.defineProperty(exports, "readFileOperation", ({ enumerable: true, get: function () { return read_file_1.readFileOperation; } }));
var read_file_size_1 = __webpack_require__(/*! ./read-file-size */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/read-file-size/index.js");
Object.defineProperty(exports, "readFileSizeOperation", ({ enumerable: true, get: function () { return read_file_size_1.readFileSizeOperation; } }));
var remove_directory_1 = __webpack_require__(/*! ./remove-directory */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/remove-directory/index.js");
Object.defineProperty(exports, "removeDirectoryOperation", ({ enumerable: true, get: function () { return remove_directory_1.removeDirectoryOperation; } }));
var remove_file_1 = __webpack_require__(/*! ./remove-file */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/remove-file/index.js");
Object.defineProperty(exports, "removeFileOperation", ({ enumerable: true, get: function () { return remove_file_1.removeFileOperation; } }));
var rename_file_1 = __webpack_require__(/*! ./rename-file */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/rename-file/index.js");
Object.defineProperty(exports, "renameFileOperation", ({ enumerable: true, get: function () { return rename_file_1.renameFileOperation; } }));
__exportStar(__webpack_require__(/*! ./shared-file-system-operation-type.enum */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/shared-file-system-operation-type.enum.js"), exports);
var write_file_1 = __webpack_require__(/*! ./write-file */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/write-file/index.js");
Object.defineProperty(exports, "writeFileOperation", ({ enumerable: true, get: function () { return write_file_1.writeFileOperation; } }));
//# sourceMappingURL=index.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/read-file-size/index.js":
/*!************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/read-file-size/index.js ***!
  \************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
/**
 * Exports read file size operation APIs and implementations.
 *
 * @module
 */
__exportStar(__webpack_require__(/*! ./read-file-size-operation-payload.interface */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/read-file-size/read-file-size-operation-payload.interface.js"), exports);
__exportStar(__webpack_require__(/*! ./read-file-size-operation.function */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/read-file-size/read-file-size-operation.function.js"), exports);
__exportStar(__webpack_require__(/*! ./read-file-size-operation.interface */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/read-file-size/read-file-size-operation.interface.js"), exports);
//# sourceMappingURL=index.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/read-file-size/read-file-size-operation-payload.interface.js":
/*!*************************************************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/read-file-size/read-file-size-operation-payload.interface.js ***!
  \*************************************************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=read-file-size-operation-payload.interface.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/read-file-size/read-file-size-operation.function.js":
/*!****************************************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/read-file-size/read-file-size-operation.function.js ***!
  \****************************************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.readFileSizeOperation = void 0;
/**
 * Read file size operation.
 *
 * @param payload Operation payload.
 * @param releaseLock Release lock callback.
 */
function readFileSizeOperation(payload, releaseLock) {
    var path = payload.path;
    var callback = payload.callback;
    var result = jsb.fileUtils.getFileSize(path);
    releaseLock();
    if (typeof result !== 'number') {
        callback(false, "Read size operation of '".concat(path, "' failed immediately"));
        return;
    }
    callback(true, result);
}
exports.readFileSizeOperation = readFileSizeOperation;
//# sourceMappingURL=read-file-size-operation.function.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/read-file-size/read-file-size-operation.interface.js":
/*!*****************************************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/read-file-size/read-file-size-operation.interface.js ***!
  \*****************************************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=read-file-size-operation.interface.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/read-file/index.js":
/*!*******************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/read-file/index.js ***!
  \*******************************************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
/**
 * Exports read file operation APIs and implementations.
 *
 * @module
 */
__exportStar(__webpack_require__(/*! ./read-file-operation-payload.interface */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/read-file/read-file-operation-payload.interface.js"), exports);
__exportStar(__webpack_require__(/*! ./read-file-operation.function */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/read-file/read-file-operation.function.js"), exports);
__exportStar(__webpack_require__(/*! ./read-file-operation.interface */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/read-file/read-file-operation.interface.js"), exports);
//# sourceMappingURL=index.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/read-file/read-file-operation-payload.interface.js":
/*!***************************************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/read-file/read-file-operation-payload.interface.js ***!
  \***************************************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=read-file-operation-payload.interface.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/read-file/read-file-operation.function.js":
/*!******************************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/read-file/read-file-operation.function.js ***!
  \******************************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.readFileOperation = void 0;
/**
 * Read file operation.
 *
 * @param payload Operation payload.
 * @param releaseLock Release lock callback.
 */
function readFileOperation(payload, releaseLock) {
    var path = payload.path;
    var callback = payload.callback;
    var result = jsb.fileUtils.getStringFromFile(path);
    releaseLock();
    if (typeof result !== 'string') {
        callback(false, "Read operation of '".concat(path, "' failed immediately"));
        return;
    }
    callback(true, result);
}
exports.readFileOperation = readFileOperation;
//# sourceMappingURL=read-file-operation.function.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/read-file/read-file-operation.interface.js":
/*!*******************************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/read-file/read-file-operation.interface.js ***!
  \*******************************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=read-file-operation.interface.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/remove-directory/index.js":
/*!**************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/remove-directory/index.js ***!
  \**************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
/**
 * Exports remove directory operation APIs and implementations.
 *
 * @module
 */
__exportStar(__webpack_require__(/*! ./remove-directory-operation-payload.interface */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/remove-directory/remove-directory-operation-payload.interface.js"), exports);
__exportStar(__webpack_require__(/*! ./remove-directory-operation.function */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/remove-directory/remove-directory-operation.function.js"), exports);
__exportStar(__webpack_require__(/*! ./remove-directory-operation.interface */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/remove-directory/remove-directory-operation.interface.js"), exports);
//# sourceMappingURL=index.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/remove-directory/remove-directory-operation-payload.interface.js":
/*!*****************************************************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/remove-directory/remove-directory-operation-payload.interface.js ***!
  \*****************************************************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=remove-directory-operation-payload.interface.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/remove-directory/remove-directory-operation.function.js":
/*!********************************************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/remove-directory/remove-directory-operation.function.js ***!
  \********************************************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.removeDirectoryOperation = void 0;
var poll_with_backoff_function_1 = __webpack_require__(/*! @agogpixel/pgmmv-resource-support/src/time/poll-with-backoff.function */ "./node_modules/@agogpixel/pgmmv-resource-support/src/time/poll-with-backoff.function.js");
/**
 * Remove directory operation.
 *
 * @param payload Operation payload.
 * @param releaseLock Release lock callback.
 */
function removeDirectoryOperation(payload, releaseLock) {
    var path = payload.path;
    var callback = payload.callback;
    function conditional() {
        return !jsb.fileUtils.isDirectoryExist(path);
    }
    function onProceed() {
        releaseLock();
        callback(true);
    }
    function onTimeout(elapsed) {
        releaseLock();
        callback(false, "Remove operation of '".concat(path, "' timed out after ").concat(elapsed / 1000, "s"));
    }
    var result = jsb.fileUtils.removeDirectory(path);
    if (!result) {
        releaseLock();
        callback(false, "Remove operation of '".concat(path, "' failed immediately"));
        return;
    }
    (0, poll_with_backoff_function_1.pollWithBackoff)(conditional, onProceed, onTimeout, 1000, 5);
}
exports.removeDirectoryOperation = removeDirectoryOperation;
//# sourceMappingURL=remove-directory-operation.function.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/remove-directory/remove-directory-operation.interface.js":
/*!*********************************************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/remove-directory/remove-directory-operation.interface.js ***!
  \*********************************************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=remove-directory-operation.interface.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/remove-file/index.js":
/*!*********************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/remove-file/index.js ***!
  \*********************************************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
/**
 * Exports remove file operation APIs and implementations.
 *
 * @module
 */
__exportStar(__webpack_require__(/*! ./remove-file-operation-payload.interface */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/remove-file/remove-file-operation-payload.interface.js"), exports);
__exportStar(__webpack_require__(/*! ./remove-file-operation.function */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/remove-file/remove-file-operation.function.js"), exports);
__exportStar(__webpack_require__(/*! ./remove-file-operation.interface */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/remove-file/remove-file-operation.interface.js"), exports);
//# sourceMappingURL=index.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/remove-file/remove-file-operation-payload.interface.js":
/*!*******************************************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/remove-file/remove-file-operation-payload.interface.js ***!
  \*******************************************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=remove-file-operation-payload.interface.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/remove-file/remove-file-operation.function.js":
/*!**********************************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/remove-file/remove-file-operation.function.js ***!
  \**********************************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.removeFileOperation = void 0;
var poll_with_backoff_function_1 = __webpack_require__(/*! @agogpixel/pgmmv-resource-support/src/time/poll-with-backoff.function */ "./node_modules/@agogpixel/pgmmv-resource-support/src/time/poll-with-backoff.function.js");
/**
 * Remove file operation.
 *
 * @param payload Operation payload.
 * @param releaseLock Release lock callback.
 */
function removeFileOperation(payload, releaseLock) {
    var path = payload.path;
    var callback = payload.callback;
    function conditional() {
        return !jsb.fileUtils.isFileExist(path);
    }
    function onProceed() {
        releaseLock();
        callback(true);
    }
    function onTimeout(elapsed) {
        releaseLock();
        callback(false, "Remove operation of '".concat(path, "' timed out after ").concat(elapsed / 1000, "s"));
    }
    var result = jsb.fileUtils.removeFile(path);
    if (!result) {
        releaseLock();
        callback(false, "Remove operation of '".concat(path, "' failed immediately"));
        return;
    }
    (0, poll_with_backoff_function_1.pollWithBackoff)(conditional, onProceed, onTimeout, 1000, 5);
}
exports.removeFileOperation = removeFileOperation;
//# sourceMappingURL=remove-file-operation.function.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/remove-file/remove-file-operation.interface.js":
/*!***********************************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/remove-file/remove-file-operation.interface.js ***!
  \***********************************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=remove-file-operation.interface.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/rename-file/index.js":
/*!*********************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/rename-file/index.js ***!
  \*********************************************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
/**
 * Exports rename file operation APIs and implementations.
 *
 * @module
 */
__exportStar(__webpack_require__(/*! ./rename-file-operation-payload.interface */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/rename-file/rename-file-operation-payload.interface.js"), exports);
__exportStar(__webpack_require__(/*! ./rename-file-operation.function */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/rename-file/rename-file-operation.function.js"), exports);
__exportStar(__webpack_require__(/*! ./rename-file-operation.interface */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/rename-file/rename-file-operation.interface.js"), exports);
//# sourceMappingURL=index.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/rename-file/rename-file-operation-payload.interface.js":
/*!*******************************************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/rename-file/rename-file-operation-payload.interface.js ***!
  \*******************************************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=rename-file-operation-payload.interface.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/rename-file/rename-file-operation.function.js":
/*!**********************************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/rename-file/rename-file-operation.function.js ***!
  \**********************************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.renameFileOperation = void 0;
var poll_with_backoff_function_1 = __webpack_require__(/*! @agogpixel/pgmmv-resource-support/src/time/poll-with-backoff.function */ "./node_modules/@agogpixel/pgmmv-resource-support/src/time/poll-with-backoff.function.js");
/**
 * Rename file operation.
 *
 * @param payload Operation payload.
 * @param releaseLock Release lock callback.
 */
function renameFileOperation(payload, releaseLock) {
    var dirPath = payload.dirPath;
    var oldName = payload.oldName;
    var newName = payload.newName;
    var callback = payload.callback;
    var path = "".concat(dirPath, "/").concat(oldName);
    var newPath = "".concat(dirPath, "/").concat(newName);
    function conditional() {
        return jsb.fileUtils.isFileExist(newPath);
    }
    function onProceed() {
        releaseLock();
        callback(true);
    }
    function onTimeout(elapsed) {
        releaseLock();
        callback(false, "Rename operation of '".concat(path, "' to '").concat(newPath, "' timed out after ").concat(elapsed / 1000, "s"));
    }
    var result = jsb.fileUtils.renameFile(dirPath, oldName, newName);
    if (!result) {
        releaseLock();
        callback(false, "Rename operation of '".concat(path, "' to '").concat(newPath, "' failed immediately"));
        return;
    }
    (0, poll_with_backoff_function_1.pollWithBackoff)(conditional, onProceed, onTimeout, 1000, 5);
}
exports.renameFileOperation = renameFileOperation;
//# sourceMappingURL=rename-file-operation.function.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/rename-file/rename-file-operation.interface.js":
/*!***********************************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/rename-file/rename-file-operation.interface.js ***!
  \***********************************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=rename-file-operation.interface.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/shared-file-system-operation-type.enum.js":
/*!******************************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/shared-file-system-operation-type.enum.js ***!
  \******************************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


/**
 * Exports shared file system operation type enumeration.
 *
 * @module
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SharedFileSystemOperationType = void 0;
/**
 * Shared file system operation type enumeration.
 */
var SharedFileSystemOperationType;
(function (SharedFileSystemOperationType) {
    /**
     * Read file.
     */
    SharedFileSystemOperationType[SharedFileSystemOperationType["ReadFile"] = 100] = "ReadFile";
    /**
     * Read file size.
     */
    SharedFileSystemOperationType[SharedFileSystemOperationType["ReadFileSize"] = 101] = "ReadFileSize";
})(SharedFileSystemOperationType = exports.SharedFileSystemOperationType || (exports.SharedFileSystemOperationType = {}));
//# sourceMappingURL=shared-file-system-operation-type.enum.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/write-file/index.js":
/*!********************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/write-file/index.js ***!
  \********************************************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
/**
 * Exports write file operation APIs and implementations.
 *
 * @module
 */
__exportStar(__webpack_require__(/*! ./write-file-operation-payload.interface */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/write-file/write-file-operation-payload.interface.js"), exports);
__exportStar(__webpack_require__(/*! ./write-file-operation.function */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/write-file/write-file-operation.function.js"), exports);
__exportStar(__webpack_require__(/*! ./write-file-operation.interface */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/write-file/write-file-operation.interface.js"), exports);
//# sourceMappingURL=index.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/write-file/write-file-operation-payload.interface.js":
/*!*****************************************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/write-file/write-file-operation-payload.interface.js ***!
  \*****************************************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=write-file-operation-payload.interface.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/write-file/write-file-operation.function.js":
/*!********************************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/write-file/write-file-operation.function.js ***!
  \********************************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.writeFileOperation = void 0;
var get_string_byte_length_function_1 = __webpack_require__(/*! @agogpixel/pgmmv-resource-support/src/string/get-string-byte-length.function */ "./node_modules/@agogpixel/pgmmv-resource-support/src/string/get-string-byte-length.function.js");
var poll_with_backoff_function_1 = __webpack_require__(/*! @agogpixel/pgmmv-resource-support/src/time/poll-with-backoff.function */ "./node_modules/@agogpixel/pgmmv-resource-support/src/time/poll-with-backoff.function.js");
/**
 * Write file operation.
 *
 * @param payload Operation payload.
 * @param releaseLock Release lock callback.
 */
function writeFileOperation(payload, releaseLock) {
    var path = payload.path;
    var data = payload.data;
    var callback = payload.callback;
    var fileSize = jsb.fileUtils.getFileSize(path);
    var dataSize = (0, get_string_byte_length_function_1.getStringByteLength)(data);
    var conditional;
    if (fileSize !== dataSize) {
        // Poll file size change.
        conditional = function conditional() {
            return dataSize === jsb.fileUtils.getFileSize(path);
        };
    }
    else {
        // Poll file content change.
        conditional = function conditional() {
            return data === jsb.fileUtils.getStringFromFile(path);
        };
    }
    function onProceed() {
        releaseLock();
        callback(true);
    }
    function onTimeout(elapsed) {
        releaseLock();
        callback(false, "Write operation to '".concat(path, "' timed out after ").concat(elapsed / 1000, "s"));
    }
    var result = jsb.fileUtils.writeStringToFile(data, path);
    if (!result) {
        releaseLock();
        callback(false, "Write operation to '".concat(path, "' failed immediately"));
        return;
    }
    (0, poll_with_backoff_function_1.pollWithBackoff)(conditional, onProceed, onTimeout, 1000, 5);
}
exports.writeFileOperation = writeFileOperation;
//# sourceMappingURL=write-file-operation.function.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/write-file/write-file-operation.interface.js":
/*!*********************************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/operations/write-file/write-file-operation.interface.js ***!
  \*********************************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=write-file-operation.interface.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/mixin-file-manager.function.js":
/*!*************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/mixin-file-manager.function.js ***!
  \*************************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.mixinFileManager = void 0;
var file_system_module_1 = __webpack_require__(/*! ./file-system-module */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/index.js");
/**
 * File manager mixin.
 *
 * @param subject Mixin subject.
 * @returns Reference to mixin subject.
 */
function mixinFileManager(subject) {
    var self = subject;
    self.createDirectory = function (path, callback) {
        var fs = (0, file_system_module_1.createFileSystemModule)();
        if (fs) {
            fs.createDirectory(path, callback);
        }
        else {
            callback(false, 'File system module not found');
        }
        return self;
    };
    self.isAbsolutePath = function (path) {
        var fs = (0, file_system_module_1.createFileSystemModule)();
        if (fs) {
            return fs.isAbsolutePath(path);
        }
        return false;
    };
    self.isDirectory = function (path) {
        var fs = (0, file_system_module_1.createFileSystemModule)();
        if (fs) {
            return fs.isDirectory(path);
        }
        return false;
    };
    self.isFile = function (path) {
        var fs = (0, file_system_module_1.createFileSystemModule)();
        if (fs) {
            return fs.isFile(path);
        }
        return false;
    };
    self.removeDirectory = function (path, callback) {
        var fs = (0, file_system_module_1.createFileSystemModule)();
        if (fs) {
            fs.removeDirectory(path, callback);
        }
        else {
            callback(false, 'File system module not found');
        }
        return self;
    };
    self.removeFile = function (path, callback) {
        var fs = (0, file_system_module_1.createFileSystemModule)();
        if (fs) {
            fs.removeFile(path, callback);
        }
        else {
            callback(false, 'File system module not found');
        }
        return self;
    };
    self.renameFile = function (dirPath, oldName, newName, callback) {
        var fs = (0, file_system_module_1.createFileSystemModule)();
        if (fs) {
            fs.renameFile(dirPath, oldName, newName, callback);
        }
        else {
            callback(false, 'File system module not found');
        }
        return self;
    };
    return self;
}
exports.mixinFileManager = mixinFileManager;
//# sourceMappingURL=mixin-file-manager.function.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/mixin-file-reader.function.js":
/*!************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/mixin-file-reader.function.js ***!
  \************************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.mixinFileReader = void 0;
var file_system_module_1 = __webpack_require__(/*! ./file-system-module */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/index.js");
/**
 * File reader mixin.
 *
 * @param subject Mixin subject.
 * @returns Reference to mixin subject.
 */
function mixinFileReader(subject) {
    var self = subject;
    self.readFileSize = function (path, callback) {
        var fs = (0, file_system_module_1.createFileSystemModule)();
        if (fs) {
            fs.readFileSize(path, callback);
        }
        else {
            callback(false, 'File system module not found');
        }
        return self;
    };
    self.readFile = function (path, callback) {
        var fs = (0, file_system_module_1.createFileSystemModule)();
        if (fs) {
            fs.readFile(path, callback);
        }
        else {
            callback(false, 'File system module not found');
        }
        return self;
    };
    return self;
}
exports.mixinFileReader = mixinFileReader;
//# sourceMappingURL=mixin-file-reader.function.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/mixin-file-writer.function.js":
/*!************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/mixin-file-writer.function.js ***!
  \************************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.mixinFileWriter = void 0;
/**
 * Exports file writer mixin function.
 *
 * @module
 */
var file_system_module_1 = __webpack_require__(/*! ./file-system-module */ "./node_modules/@agogpixel/pgmmv-fs-support/src/file-system-module/index.js");
/**
 * File writer mixin.
 *
 * @param subject Mixin subject.
 * @returns Reference to mixin subject.
 */
function mixinFileWriter(subject) {
    var self = subject;
    self.appendFile = function (dataStr, path, callback) {
        var fs = (0, file_system_module_1.createFileSystemModule)();
        if (fs) {
            fs.appendFile(dataStr, path, callback);
        }
        else {
            callback(false, 'File system module not found');
        }
        return self;
    };
    self.writeFile = function (dataStr, path, callback) {
        var fs = (0, file_system_module_1.createFileSystemModule)();
        if (fs) {
            fs.writeFile(dataStr, path, callback);
        }
        else {
            callback(false, 'File system module not found');
        }
        return self;
    };
    return self;
}
exports.mixinFileWriter = mixinFileWriter;
//# sourceMappingURL=mixin-file-writer.function.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-logging-support/src/create-logger.function.js":
/*!*************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-logging-support/src/create-logger.function.js ***!
  \*************************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createLogger = exports.jsonIndentSizeMax = exports.jsonIndentSizeMin = exports.defaultJsonStringifyFunctions = exports.defaultJsonIndentSize = void 0;
/**
 * Exports create logger function & various defaults.
 *
 * @module create-logger.function
 */
var get_unix_timestamp_function_1 = __webpack_require__(/*! @agogpixel/pgmmv-resource-support/src/time/get-unix-timestamp.function */ "./node_modules/@agogpixel/pgmmv-resource-support/src/time/get-unix-timestamp.function.js");
var to_json_function_1 = __webpack_require__(/*! @agogpixel/pgmmv-resource-support/src/json/to-json.function */ "./node_modules/@agogpixel/pgmmv-resource-support/src/json/to-json.function.js");
var log_level_enum_1 = __webpack_require__(/*! ./log-level.enum */ "./node_modules/@agogpixel/pgmmv-logging-support/src/log-level.enum.js");
////////////////////////////////////////////////////////////////////////////////
// Public Static Properties
////////////////////////////////////////////////////////////////////////////////
/**
 * Default JSON indent size.
 */
exports.defaultJsonIndentSize = 2;
/**
 * Default JSON stringify functions flag state.
 */
exports.defaultJsonStringifyFunctions = false;
/**
 * Minimum allowed JSON indent size value.
 */
exports.jsonIndentSizeMin = 0;
/**
 * Maximum allowed JSON indent size value.
 */
exports.jsonIndentSizeMax = 8;
////////////////////////////////////////////////////////////////////////////////
// Private Static Properties
////////////////////////////////////////////////////////////////////////////////
// None.
////////////////////////////////////////////////////////////////////////////////
// Public Static Methods
////////////////////////////////////////////////////////////////////////////////
/**
 * Create object instance that conforms to {@link Logger} API.
 *
 * @param config Logger configuration.
 * @param internal Provide an object to 'inherit' a reference to the logger's
 * internal {@link LoggerProtectedApi} implementation.
 * @returns An object instance that provides a base implementation for a
 * {@link Logger} API.
 */
function createLogger(config, internal) {
    var _a;
    // Public API container.
    var self = {};
    // Protected API container.
    var internalApi = internal || {};
    //////////////////////////////////////////////////////////////////////////////
    // Private Properties
    //////////////////////////////////////////////////////////////////////////////
    // None.
    //////////////////////////////////////////////////////////////////////////////
    // Private Methods
    //////////////////////////////////////////////////////////////////////////////
    // None.
    //////////////////////////////////////////////////////////////////////////////
    // Protected Properties
    //////////////////////////////////////////////////////////////////////////////
    internalApi.logLevel = config.logLevel || log_level_enum_1.LogLevel.Info;
    internalApi.jsonIndentSize =
        typeof config.jsonIndentSize !== 'number'
            ? exports.defaultJsonIndentSize
            : cc.clampf(config.jsonIndentSize, exports.jsonIndentSizeMin, exports.jsonIndentSizeMax);
    internalApi.jsonStringifyFunctions = !!config.jsonStringifyFunctions || exports.defaultJsonStringifyFunctions;
    internalApi.logLevelMap = config.logLevelMap || (_a = {},
        _a[log_level_enum_1.LogLevel.Debug] = log_level_enum_1.LogLevel[log_level_enum_1.LogLevel.Debug],
        _a[log_level_enum_1.LogLevel.Info] = log_level_enum_1.LogLevel[log_level_enum_1.LogLevel.Info],
        _a[log_level_enum_1.LogLevel.Warn] = log_level_enum_1.LogLevel[log_level_enum_1.LogLevel.Warn],
        _a[log_level_enum_1.LogLevel.Error] = log_level_enum_1.LogLevel[log_level_enum_1.LogLevel.Error],
        _a[log_level_enum_1.LogLevel.Fatal] = log_level_enum_1.LogLevel[log_level_enum_1.LogLevel.Fatal],
        _a);
    //////////////////////////////////////////////////////////////////////////////
    // Protected Methods
    //////////////////////////////////////////////////////////////////////////////
    internalApi.runtimeLog = config.runtimeLog || Agtk.log;
    //////////////////////////////////////////////////////////////////////////////
    // Public Properties
    //////////////////////////////////////////////////////////////////////////////
    // None.
    //////////////////////////////////////////////////////////////////////////////
    // Public Methods
    //////////////////////////////////////////////////////////////////////////////
    self.log = function (data, level) {
        if (typeof level !== 'string' && typeof level !== 'number') {
            internalApi.runtimeLog(typeof data === 'string'
                ? data
                : (0, to_json_function_1.toJson)(data, internalApi.jsonIndentSize, internalApi.jsonStringifyFunctions));
            return;
        }
        var logLevel = typeof level === 'string' ? log_level_enum_1.LogLevel[level] : level;
        if (logLevel < internalApi.logLevel) {
            return;
        }
        var message = typeof data === 'string' ? data : (0, to_json_function_1.toJson)(data, internalApi.jsonIndentSize, internalApi.jsonStringifyFunctions);
        var messageLog = "[".concat((0, get_unix_timestamp_function_1.getUnixTimestamp)(), "] ").concat(internalApi.logLevelMap[logLevel], ": ").concat(message);
        internalApi.runtimeLog(messageLog);
    };
    self.debug = function (data) {
        self.log(data, log_level_enum_1.LogLevel.Debug);
    };
    self.info = function (data) {
        self.log(data, log_level_enum_1.LogLevel.Info);
    };
    self.warn = function (data) {
        self.log(data, log_level_enum_1.LogLevel.Warn);
    };
    self.error = function (data) {
        self.log(data, log_level_enum_1.LogLevel.Error);
    };
    self.fatal = function (data) {
        self.log(data, log_level_enum_1.LogLevel.Fatal);
    };
    self.getLogLevel = function () {
        return internalApi.logLevel;
    };
    self.setLogLevel = function (level) {
        internalApi.logLevel = level;
        return self;
    };
    self.getRuntimeLog = function () {
        return internalApi.runtimeLog;
    };
    self.setRuntimeLog = function (log) {
        internalApi.runtimeLog = log;
        return self;
    };
    self.getJsonIndentSize = function () {
        return internalApi.jsonIndentSize;
    };
    self.setJsonIndentSize = function (size) {
        internalApi.jsonIndentSize = cc.clampf(size, exports.jsonIndentSizeMin, exports.jsonIndentSizeMax);
        return self;
    };
    self.getJsonStringifyFunctions = function () {
        return internalApi.jsonStringifyFunctions;
    };
    self.setJsonStringifyFunctions = function (stringify) {
        internalApi.jsonStringifyFunctions = stringify;
        return self;
    };
    self.getLogLevelMap = function () {
        return internalApi.logLevelMap;
    };
    self.setLogLevelMap = function (map) {
        internalApi.logLevelMap = map;
        return self;
    };
    // Logger is ready!
    return self;
}
exports.createLogger = createLogger;
////////////////////////////////////////////////////////////////////////////////
// Private Static Methods
////////////////////////////////////////////////////////////////////////////////
// None.
//# sourceMappingURL=create-logger.function.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-logging-support/src/log-level.enum.js":
/*!*****************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-logging-support/src/log-level.enum.js ***!
  \*****************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


/**
 * Exports log level enumeration.
 *
 * @module log-level.enum
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LogLevel = void 0;
/**
 * Log level enumeration.
 */
var LogLevel;
(function (LogLevel) {
    /**
     * Debug log level.
     */
    LogLevel[LogLevel["Debug"] = 0] = "Debug";
    /**
     * Info log level.
     */
    LogLevel[LogLevel["Info"] = 1] = "Info";
    /**
     * Warn log level.
     */
    LogLevel[LogLevel["Warn"] = 2] = "Warn";
    /**
     * Error log level.
     */
    LogLevel[LogLevel["Error"] = 3] = "Error";
    /**
     * Fatal log level.
     */
    LogLevel[LogLevel["Fatal"] = 4] = "Fatal";
})(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
//# sourceMappingURL=log-level.enum.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-plugin-support/src/create-plugin.function.js":
/*!************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-plugin-support/src/create-plugin.function.js ***!
  \************************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createPlugin = void 0;
var plugin_info_category_1 = __webpack_require__(/*! @agogpixel/pgmmv-ts/api/agtk/plugin/plugin-info-category */ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-info-category.js");
var plugin_ui_parameter_type_1 = __webpack_require__(/*! @agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-parameter-type */ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-parameter-type.js");
var localization_1 = __webpack_require__(/*! ./localization */ "./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/index.js");
////////////////////////////////////////////////////////////////////////////////
// Public Static Properties
////////////////////////////////////////////////////////////////////////////////
// None.
////////////////////////////////////////////////////////////////////////////////
// Private Static Properties
////////////////////////////////////////////////////////////////////////////////
// None.
////////////////////////////////////////////////////////////////////////////////
// Public Static Methods
////////////////////////////////////////////////////////////////////////////////
/**
 * Create an object instance that provides a base implementation for PGMMV
 * plugins.
 *
 * @typeParam I Plugin's internal data type (default: `JsonValue`).
 * @typeParam P Plugin's public API type (default: `AgtkPlugin`).
 * @param config Plugin configuration.
 * @param internal Provide an object to 'inherit' a reference to the plugin's
 * internal {@link PluginProtectedApi} implementation.
 * @returns An object instance that provides a base implementation for a PGMMV
 * plugin.
 * @public
 * @static
 */
function createPlugin(config, internal) {
    // Public API container.
    var self = {};
    // Protected API container.
    var internalApi = internal || {};
    //////////////////////////////////////////////////////////////////////////////
    // Private Properties
    //////////////////////////////////////////////////////////////////////////////
    /**
     * Plugin UI parameter configurations.
     *
     * @private
     */
    var parametersConfig = config.parameters || [];
    /**
     * Plugin action command configurations.
     *
     * @private
     */
    var actionCommandsConfig = config.actionCommands || [];
    /**
     * Plugin auto tiles configurations.
     *
     * @private
     */
    var autoTilesConfig = config.autoTiles || undefined;
    /**
     * Plugin link condition configurations.
     *
     * @private
     */
    var linkConditionsConfig = config.linkConditions || [];
    /**
     * Localized plugin UI parameters.
     *
     * @private
     */
    var localizedParameters;
    /**
     * Localized plugin actions commands.
     *
     * @private
     */
    var localizedActionCommands;
    /**
     * Localized plugin link conditions.
     *
     * @private
     */
    var localizedLinkConditions;
    //////////////////////////////////////////////////////////////////////////////
    // Private Methods
    //////////////////////////////////////////////////////////////////////////////
    // None.
    //////////////////////////////////////////////////////////////////////////////
    // Protected Properties
    //////////////////////////////////////////////////////////////////////////////
    internalApi.internalData = {};
    internalApi.localization = (0, localization_1.createPluginLocalizationManager)({ localizations: config.localizations });
    //////////////////////////////////////////////////////////////////////////////
    // Protected Methods
    //////////////////////////////////////////////////////////////////////////////
    internalApi.getInfoParameter = function () {
        if (!localizedParameters) {
            localizedParameters = internalApi.localization.processParameterLocale(parametersConfig);
        }
        return localizedParameters;
    };
    internalApi.getInfoInternal = function () {
        return JSON.parse(JSON.stringify(internalApi.internalData));
    };
    internalApi.getInfoActionCommand = function () {
        if (!localizedActionCommands) {
            localizedActionCommands = internalApi.localization.processActionCommandLocale(actionCommandsConfig);
        }
        return localizedActionCommands;
    };
    internalApi.getInfoLinkCondition = function () {
        if (!localizedLinkConditions) {
            localizedLinkConditions = internalApi.localization.processLinkConditionLocale(linkConditionsConfig);
        }
        return localizedLinkConditions;
    };
    internalApi.getInfoAutoTile = function () {
        return autoTilesConfig;
    };
    internalApi.inEditor = function () {
        return !Agtk || typeof Agtk.log !== 'function';
    };
    internalApi.inPlayer = function () {
        return !!Agtk && typeof Agtk.version === 'string' && /^player .+$/.test(Agtk.version);
    };
    internalApi.normalizeActionCommandParameters = function (actionCommandIndex, paramValue) {
        var vj = self.getInfo(plugin_info_category_1.AgtkPluginInfoCategory.ActionCommand)[actionCommandIndex];
        return normalizeParameters(paramValue, vj.parameter);
    };
    internalApi.normalizeLinkConditionParameters = function (linkConditionIndex, paramValue) {
        var vj = self.getInfo(plugin_info_category_1.AgtkPluginInfoCategory.LinkCondition)[linkConditionIndex];
        return normalizeParameters(paramValue, vj.parameter);
    };
    internalApi.normalizeUiParameters = function (paramValue) {
        return normalizeParameters(paramValue, self.getInfo(plugin_info_category_1.AgtkPluginInfoCategory.Parameter));
    };
    //////////////////////////////////////////////////////////////////////////////
    // Public Properties
    //////////////////////////////////////////////////////////////////////////////
    // None.
    //////////////////////////////////////////////////////////////////////////////
    // Public Methods
    //////////////////////////////////////////////////////////////////////////////
    self.setLocale = function (arg1) {
        internalApi.localization.setLocale(arg1);
    };
    self.getInfo = function (category) {
        var info;
        switch (category) {
            case plugin_info_category_1.AgtkPluginInfoCategory.Name:
                info = internalApi.localization.get(localization_1.PluginLocalizationRequiredKey.Name);
                break;
            case plugin_info_category_1.AgtkPluginInfoCategory.Description:
                info = internalApi.localization.get(localization_1.PluginLocalizationRequiredKey.Description);
                break;
            case plugin_info_category_1.AgtkPluginInfoCategory.Author:
                info = internalApi.localization.get(localization_1.PluginLocalizationRequiredKey.Author);
                break;
            case plugin_info_category_1.AgtkPluginInfoCategory.Help:
                info = internalApi.localization.get(localization_1.PluginLocalizationRequiredKey.Help);
                break;
            case plugin_info_category_1.AgtkPluginInfoCategory.Parameter:
                info = internalApi.getInfoParameter();
                break;
            case plugin_info_category_1.AgtkPluginInfoCategory.Internal:
                info = internalApi.getInfoInternal();
                break;
            case plugin_info_category_1.AgtkPluginInfoCategory.ActionCommand:
                info = internalApi.getInfoActionCommand();
                break;
            case plugin_info_category_1.AgtkPluginInfoCategory.LinkCondition:
                info = internalApi.getInfoLinkCondition();
                break;
            case plugin_info_category_1.AgtkPluginInfoCategory.AutoTile:
                info = internalApi.getInfoAutoTile();
                break;
        }
        return info;
    };
    self.initialize = function (data) {
        if (data) {
            self.setInternal(data);
        }
    };
    self.finalize = function () {
        return;
    };
    self.setParamValue = function () {
        return;
    };
    self.setInternal = function (data) {
        internalApi.internalData = JSON.parse(JSON.stringify(data)) || internalApi.internalData;
    };
    self.call = function call() {
        return;
    };
    // Plugin is ready!
    return self;
}
exports.createPlugin = createPlugin;
////////////////////////////////////////////////////////////////////////////////
// Private Static Methods
////////////////////////////////////////////////////////////////////////////////
/**
 * Normalize plugin UI paramters.
 *
 * @param paramValue Plugin UI parameter values.
 * @param defaults Default plugin UI parameters.
 * @returns Normalized plugin UI parameters.
 * @private
 * @static
 */
function normalizeParameters(paramValue, defaults) {
    var normalized = {};
    for (var i = 0; i < defaults.length; i++) {
        var p = defaults[i];
        normalized[p.id] = (p.type === plugin_ui_parameter_type_1.AgtkPluginUiParameterType.Json ? JSON.stringify(p.defaultValue) : p.defaultValue);
    }
    for (var i = 0; i < paramValue.length; ++i) {
        var p = paramValue[i];
        normalized[p.id] = p.value;
    }
    return normalized;
}
//# sourceMappingURL=create-plugin.function.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/create-plugin-localization-manager.function.js":
/*!**********************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/create-plugin-localization-manager.function.js ***!
  \**********************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createPluginLocalizationManager = void 0;
/**
 * Exports plugin localization manager factory.
 *
 * @module localization/create-plugin-localization-manager.function
 */
var plugin_ui_parameter_type_1 = __webpack_require__(/*! @agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-parameter-type */ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-parameter-type.js");
////////////////////////////////////////////////////////////////////////////////
// Public Static Properties
////////////////////////////////////////////////////////////////////////////////
// None.
////////////////////////////////////////////////////////////////////////////////
// Private Static Properties
////////////////////////////////////////////////////////////////////////////////
// None.
////////////////////////////////////////////////////////////////////////////////
// Public Static Methods
////////////////////////////////////////////////////////////////////////////////
/**
 * Create an object instance that provides an implementation for a plugin
 * localization manager.
 *
 * @param config Plugin localization manager configuration.
 * @returns An object instance that provides an implementation for a plugin
 * localization manager.
 * @public
 * @static
 */
function createPluginLocalizationManager(config) {
    // Public API container.
    var self = {};
    //////////////////////////////////////////////////////////////////////////////
    // Private Properties
    //////////////////////////////////////////////////////////////////////////////
    /**
     * Localization configurations.
     *
     * @private
     */
    var localizations = config.localizations && config.localizations.length > 0
        ? config.localizations
        : [{ locale: 'en', data: {} }];
    /**
     * Localization fallback data.
     *
     * @private
     */
    var fallbackData = localizations[0].data;
    /**
     * Current locale.
     *
     * @private
     */
    var currentLocale = localizations[0].locale;
    /**
     * Maps locale prefix to localization data.
     *
     * @private
     */
    var localeMap = {};
    // Load locale map.
    for (var i = 0; i < localizations.length; ++i) {
        localeMap[localizations[i].locale] = localizations[i].data;
    }
    /**
     * Inline locale regex for text replacement.
     *
     * @private
     */
    var inlineRegex = /^loca\((.+)\)$/;
    //////////////////////////////////////////////////////////////////////////////
    // Private Methods
    //////////////////////////////////////////////////////////////////////////////
    // None.
    //////////////////////////////////////////////////////////////////////////////
    // Protected Properties
    //////////////////////////////////////////////////////////////////////////////
    // None.
    //////////////////////////////////////////////////////////////////////////////
    // Protected Methods
    //////////////////////////////////////////////////////////////////////////////
    // None.
    //////////////////////////////////////////////////////////////////////////////
    // Public Properties
    //////////////////////////////////////////////////////////////////////////////
    // None.
    //////////////////////////////////////////////////////////////////////////////
    // Public Methods
    //////////////////////////////////////////////////////////////////////////////
    self.get = function (key) {
        var loca = currentLocale.substring(0, 2);
        if (localeMap[loca] && typeof localeMap[loca][key] === 'string') {
            return localeMap[loca][key];
        }
        if (typeof fallbackData[key] === 'string') {
            return fallbackData[key];
        }
        return "LOCA MISSING: ".concat(key);
    };
    self.getLocale = function () {
        return currentLocale;
    };
    self.setLocale = function (locale) {
        if (!localeMap[locale.substring(0, 2)]) {
            return false;
        }
        currentLocale = locale;
        return true;
    };
    self.processParameterLocale = function (parameters) {
        for (var i = 0; i < parameters.length; ++i) {
            var parameter = parameters[i];
            var matches = parameter.name.match(inlineRegex);
            if (matches && matches.length > 1) {
                parameter.name = self.get(matches[1]);
            }
            switch (parameter.type) {
                case plugin_ui_parameter_type_1.AgtkPluginUiParameterType.String:
                case plugin_ui_parameter_type_1.AgtkPluginUiParameterType.MultiLineString:
                    matches = parameter.defaultValue.match(inlineRegex);
                    if (matches && matches.length > 1) {
                        parameter.defaultValue = self.get(matches[1]);
                    }
                    break;
                case plugin_ui_parameter_type_1.AgtkPluginUiParameterType.CustomId:
                    for (var j = 0; j < parameter.customParam.length; ++j) {
                        var param = parameter.customParam[j];
                        matches = param.name.match(inlineRegex);
                        if (matches && matches.length > 1) {
                            param.name = self.get(matches[1]);
                        }
                    }
                    break;
                default:
                    break;
            }
        }
        return parameters;
    };
    self.processActionCommandLocale = function (actionCommands) {
        for (var i = 0; i < actionCommands.length; ++i) {
            var executeCommand = actionCommands[i];
            var matches = executeCommand.name.match(inlineRegex);
            if (matches && matches.length > 1) {
                executeCommand.name = self.get(matches[1]);
            }
            matches = executeCommand.description.match(inlineRegex);
            if (matches && matches.length > 1) {
                executeCommand.description = self.get(matches[1]);
            }
            self.processParameterLocale(executeCommand.parameter);
        }
        return actionCommands;
    };
    self.processLinkConditionLocale = function (linkConditions) {
        for (var i = 0; i < linkConditions.length; ++i) {
            var linkCondition = linkConditions[i];
            var matches = linkCondition.name.match(inlineRegex);
            if (matches && matches.length > 1) {
                linkCondition.name = self.get(matches[1]);
            }
            matches = linkCondition.description.match(inlineRegex);
            if (matches && matches.length > 1) {
                linkCondition.description = self.get(matches[1]);
            }
            self.processParameterLocale(linkCondition.parameter);
        }
        return linkConditions;
    };
    return self;
}
exports.createPluginLocalizationManager = createPluginLocalizationManager;
////////////////////////////////////////////////////////////////////////////////
// Private Static Methods
////////////////////////////////////////////////////////////////////////////////
// None.
//# sourceMappingURL=create-plugin-localization-manager.function.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/index.js":
/*!********************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/index.js ***!
  \********************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
/**
 * Exports PGMMV plugin support localization APIs and implementations.
 *
 * @module localization
 */
__exportStar(__webpack_require__(/*! ./create-plugin-localization-manager.function */ "./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/create-plugin-localization-manager.function.js"), exports);
__exportStar(__webpack_require__(/*! ./plugin-localization-data.type */ "./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/plugin-localization-data.type.js"), exports);
__exportStar(__webpack_require__(/*! ./plugin-localization-manager-config.interface */ "./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/plugin-localization-manager-config.interface.js"), exports);
__exportStar(__webpack_require__(/*! ./plugin-localization-manager.interface */ "./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/plugin-localization-manager.interface.js"), exports);
__exportStar(__webpack_require__(/*! ./plugin-localization-required-key.enum */ "./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/plugin-localization-required-key.enum.js"), exports);
__exportStar(__webpack_require__(/*! ./plugin-localization.interface */ "./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/plugin-localization.interface.js"), exports);
//# sourceMappingURL=index.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/plugin-localization-data.type.js":
/*!********************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/plugin-localization-data.type.js ***!
  \********************************************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
/**
 * Exports plugin localization data type.
 *
 * @module localization/plugin-localization-data.type
 */
var plugin_localization_required_key_enum_1 = __webpack_require__(/*! ./plugin-localization-required-key.enum */ "./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/plugin-localization-required-key.enum.js");
//# sourceMappingURL=plugin-localization-data.type.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/plugin-localization-manager-config.interface.js":
/*!***********************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/plugin-localization-manager-config.interface.js ***!
  \***********************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=plugin-localization-manager-config.interface.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/plugin-localization-manager.interface.js":
/*!****************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/plugin-localization-manager.interface.js ***!
  \****************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=plugin-localization-manager.interface.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/plugin-localization-required-key.enum.js":
/*!****************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/plugin-localization-required-key.enum.js ***!
  \****************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


/**
 * Exports plugin localization required key enumeration.
 *
 * @module localization/plugin-localization-required-key.enum
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PluginLocalizationRequiredKey = void 0;
/**
 * Plugin localization required key enumerations.
 */
var PluginLocalizationRequiredKey;
(function (PluginLocalizationRequiredKey) {
    /**
     * Plugin name.
     */
    PluginLocalizationRequiredKey["Name"] = "PLUGIN_NAME";
    /**
     * Plugin description.
     */
    PluginLocalizationRequiredKey["Description"] = "PLUGIN_DESCRIPTION";
    /**
     * Plugin author.
     */
    PluginLocalizationRequiredKey["Author"] = "PLUGIN_AUTHOR";
    /**
     * Plugin help.
     */
    PluginLocalizationRequiredKey["Help"] = "PLUGIN_HELP";
})(PluginLocalizationRequiredKey = exports.PluginLocalizationRequiredKey || (exports.PluginLocalizationRequiredKey = {}));
//# sourceMappingURL=plugin-localization-required-key.enum.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/plugin-localization.interface.js":
/*!********************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/plugin-localization.interface.js ***!
  \********************************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=plugin-localization.interface.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-resource-support/src/json/to-json.function.js":
/*!*************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-resource-support/src/json/to-json.function.js ***!
  \*************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.toJson = void 0;
////////////////////////////////////////////////////////////////////////////////
// Public Static Properties
////////////////////////////////////////////////////////////////////////////////
// None.
////////////////////////////////////////////////////////////////////////////////
// Private Static Properties
////////////////////////////////////////////////////////////////////////////////
// None.
////////////////////////////////////////////////////////////////////////////////
// Public Static Methods
////////////////////////////////////////////////////////////////////////////////
/**
 * Custom JSON stringify method that can handle some non-JSON data types (Date,
 * Symbol, etc.). Capable of custom indent sizing & function stringification.
 *
 * Cycle safe - already visited references will result in "[seen object]" or
 * "[seen array]" string literals.
 *
 * @param value Value to convert to a JSON encoded string.
 * @param space Amount of space characters in an indent. 0 will result in a
 * single line.
 * @param stringifyFunctions Stringify functions?
 * @returns A JSON encoded string.
 * @public
 * @static
 */
function toJson(value, space, stringifyFunctions) {
    var seen = [];
    var indentSize = typeof space === 'number' && space >= 0 ? space : 2;
    function parse(obj, indent) {
        if (ignoreDataTypes(obj)) {
            return undefined;
        }
        if (isDate(obj)) {
            return "\"".concat(obj.toISOString(), "\"");
        }
        if (nullDataTypes(obj)) {
            return "".concat(null);
        }
        if (isFunction(obj)) {
            if (stringifyFunctions) {
                var fnParts = (isFunction(obj.toString)
                    ? obj.toString()
                    : '"function"').split('\n');
                return fnParts.join("".concat(!indentSize ? '' : '\n' + ' '.repeat(indentSize)));
            }
            return undefined;
        }
        if (restOfDataTypes(obj)) {
            var passQuotes = isString(obj) ? "\"" : '';
            return "".concat(passQuotes).concat(obj).concat(passQuotes);
        }
        if (isArray(obj) || isObject(obj)) {
            if (seen.indexOf(obj) >= 0) {
                return "\"[seen ".concat(isArray(obj) ? 'array' : 'object', "]\"");
            }
            seen.push(obj);
        }
        if (isArray(obj)) {
            var arrStr_1 = '';
            if (!obj.length) {
                return '[]';
            }
            obj.forEach(function (eachValue) {
                arrStr_1 +=
                    ' '.repeat(indent + indentSize) +
                        (arrayValuesNullTypes(eachValue) ? parse(null, indent + indentSize) : parse(eachValue, indent + indentSize));
                arrStr_1 += ',' + (!indentSize ? '' : '\n');
            });
            return "[".concat(!indentSize ? '' : '\n').concat(removeComma(arrStr_1, !!indentSize)).concat(' '.repeat(indent), "]");
        }
        if (isObject(obj)) {
            var objStr_1 = '';
            var objKeys = Object.keys(obj);
            if (!objKeys.length) {
                return '{}';
            }
            objKeys.forEach(function (eachKey) {
                var eachValue = obj[eachKey];
                objStr_1 += !ignoreDataTypes(eachValue)
                    ? "".concat(' '.repeat(indent + indentSize), "\"").concat(eachKey, "\":").concat(!indentSize ? '' : ' ').concat(parse(eachValue, indent + indentSize), ",").concat(!indentSize ? '' : '\n')
                    : '';
            });
            return "{".concat(!indentSize ? '' : '\n').concat(removeComma(objStr_1, !!indentSize)).concat(' '.repeat(indent), "}");
        }
    }
    return parse(value, 0);
}
exports.toJson = toJson;
////////////////////////////////////////////////////////////////////////////////
// Private Static Methods
////////////////////////////////////////////////////////////////////////////////
/**
 * Test if specified value is an array.
 *
 * @param value Value to test.
 * @returns True when value is an array, false otherwise.
 * @private
 * @static
 */
function isArray(value) {
    return Array.isArray(value) && typeof value === 'object';
}
/**
 * Test if specified value is an object.
 *
 * @param value Value to test.
 * @returns True when value is a non-null & non-array object, false otherwise.
 * @private
 * @static
 */
function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/**
 * Test if specified value is a string.
 *
 * @param value Value to test.
 * @returns True when value is a string, false otherwise.
 * @private
 * @static
 */
function isString(value) {
    return typeof value === 'string';
}
/**
 * Test if specified value is a boolean.
 *
 * @param value Value to test.
 * @returns True when value is a boolean, false otherwise.
 * @private
 * @static
 */
function isBoolean(value) {
    return typeof value === 'boolean';
}
/**
 * Test if specified value is a number.
 *
 * @param value Value to test.
 * @returns True when value is a number, false otherwise.
 * @private
 * @static
 */
function isNumber(value) {
    return typeof value === 'number';
}
/**
 * Test if specified value is null.
 *
 * @param value Value to test.
 * @returns True when value is null, false otherwise.
 * @private
 * @static
 */
function isNull(value) {
    return value === null && typeof value === 'object';
}
/**
 * Test if value is a number type, but invalid.
 *
 * @param value Value to test.
 * @returns True when value is a number type but invalid, false otherwise.
 * @private
 * @static
 */
function isNotNumber(value) {
    return typeof value === 'number' && isNaN(value);
}
/**
 * Test if value is infinity.
 *
 * @param value Value to test.
 * @returns True when value is infinity, false otherwise.
 * @private
 * @static
 */
function isInfinity(value) {
    return typeof value === 'number' && !isFinite(value);
}
/**
 * Test if value is a [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)
 * instance.
 *
 * @param value Value to test.
 * @returns True when value is a Date instance, false otherwise.
 * @private
 * @static
 */
function isDate(value) {
    return typeof value === 'object' && value !== null && typeof value.getMonth === 'function';
}
/**
 * Test if value is undefined.
 *
 * @param value Value to test.
 * @returns True when value is undefined, false otherwise.
 * @private
 * @static
 */
function isUndefined(value) {
    return value === undefined && typeof value === 'undefined';
}
/**
 * Test if value is a function.
 *
 * @param value Value to test.
 * @returns True when value is a function, false otherwise.
 * @private
 * @static
 */
function isFunction(value) {
    return typeof value === 'function';
}
/**
 * Test if value is a symbol.
 *
 * @param value Value to test.
 * @returns True when value is a symbol, false otherwise.
 * @private
 * @static
 */
function isSymbol(value) {
    return typeof value === 'symbol';
}
/**
 * Test if value is a number, string, or boolean.
 *
 * @param value Value to test.
 * @returns True when value is a number, string, or boolean. False otherwise.
 * @private
 * @static
 */
function restOfDataTypes(value) {
    return isNumber(value) || isString(value) || isBoolean(value);
}
/**
 * Test if value is undefined or a symbol.
 *
 * @param value Value to test.
 * @returns True when value is undefined or a symbol, false otherwise.
 * @private
 * @static
 */
function ignoreDataTypes(value) {
    return isUndefined(value) || isSymbol(value);
}
/**
 * Test if value is a number type (but invalid), infinity, or null.
 *
 * @param value Value to test.
 * @returns True when value is a number type (but invalid), infinity, or null.
 * False otherwise.
 * @private
 * @static
 */
function nullDataTypes(value) {
    return isNotNumber(value) || isInfinity(value) || isNull(value);
}
/**
 * Test if value is a number type (but invalid), infinity, null, undefined, or
 * symbol.
 *
 * @param value Value to test.
 * @returns True when value is a number type (but invalid), infinity, null,
 * undefined, or symbol. False otherwise.
 * @private
 * @static
 */
function arrayValuesNullTypes(value) {
    return nullDataTypes(value) || ignoreDataTypes(value);
}
/**
 * Remove a trailing comma from a string with trailing newline support.
 *
 * @param str String to remove comma from.
 * @param newline Account for trailing newline?
 * @returns A string with trailing comma removed.
 * @private
 * @static
 */
function removeComma(str, newline) {
    var tempArr;
    if (!newline) {
        tempArr = str.split('');
    }
    else {
        tempArr = str.trimRight().split('');
    }
    tempArr.pop();
    return tempArr.join('') + (newline ? '\n' : '');
}
//# sourceMappingURL=to-json.function.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-resource-support/src/locks/create-resource-locks-manager.function.js":
/*!************************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-resource-support/src/locks/create-resource-locks-manager.function.js ***!
  \************************************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createResourceLocksManager = void 0;
////////////////////////////////////////////////////////////////////////////////
// Public Static Properties
////////////////////////////////////////////////////////////////////////////////
// None.
////////////////////////////////////////////////////////////////////////////////
// Private Static Properties
////////////////////////////////////////////////////////////////////////////////
// None.
////////////////////////////////////////////////////////////////////////////////
// Public Static Methods
////////////////////////////////////////////////////////////////////////////////
/**
 * Create an object instance that implements the {@link ResourceLocksManager}
 * interface. This implementation tracks individual lock states in-memory.
 *
 * @typeParam K Key type (default: `string`).
 * @param internal Provide an object to 'inherit' a reference to the resource
 * locks manager's internal {@link ResourceLocksManagerProtectedApi}
 * implementation.
 * @returns An object instance that implements the {@link ResourceLocksManager}
 * interface.
 * @public
 * @static
 */
function createResourceLocksManager(internal) {
    // Public API container.
    var self = {};
    // Protected API container.
    var internalApi = internal || {};
    //////////////////////////////////////////////////////////////////////////////
    // Private Properties
    //////////////////////////////////////////////////////////////////////////////
    // None.
    //////////////////////////////////////////////////////////////////////////////
    // Private Methods
    //////////////////////////////////////////////////////////////////////////////
    // None.
    //////////////////////////////////////////////////////////////////////////////
    // Protected Properties
    //////////////////////////////////////////////////////////////////////////////
    internalApi.vault = {};
    //////////////////////////////////////////////////////////////////////////////
    // Protected Methods
    //////////////////////////////////////////////////////////////////////////////
    // None.
    //////////////////////////////////////////////////////////////////////////////
    // Public Properties
    //////////////////////////////////////////////////////////////////////////////
    // None.
    //////////////////////////////////////////////////////////////////////////////
    // Public Methods
    //////////////////////////////////////////////////////////////////////////////
    self.acquireExclusiveLock = function (key) {
        if (!self.hasLocks(key)) {
            return;
        }
        var locks = internalApi.vault[key];
        if (locks.currentSharedLocksCount > 0 || locks.currentExclusiveLockCount >= locks.maxExclusiveLockCount) {
            return;
        }
        ++locks.currentExclusiveLockCount;
        return function () {
            --locks.currentExclusiveLockCount;
        };
    };
    self.acquireSharedLock = function (key) {
        if (!self.hasLocks(key)) {
            return;
        }
        var locks = internalApi.vault[key];
        if ((locks.maxExclusiveLockCount && locks.currentExclusiveLockCount >= locks.maxExclusiveLockCount) ||
            locks.currentSharedLocksCount >= locks.maxSharedLocksCount) {
            return;
        }
        ++locks.currentSharedLocksCount;
        return function () {
            --locks.currentSharedLocksCount;
        };
    };
    self.createLocks = function (config) {
        if (self.hasLocks(config.key)) {
            return false;
        }
        var locks = {
            currentSharedLocksCount: 0,
            maxSharedLocksCount: typeof config.numSharedLocks !== 'number' || (config.numSharedLocks && config.numSharedLocks < 2)
                ? 2
                : config.numSharedLocks,
            currentExclusiveLockCount: 0,
            maxExclusiveLockCount: config.exclusiveLock ? 1 : 0
        };
        internalApi.vault[config.key] = locks;
        return true;
    };
    self.destroyLocks = function (key) {
        delete internalApi.vault[key];
    };
    self.hasLocks = function (key) {
        return !!internalApi.vault[key];
    };
    return self;
}
exports.createResourceLocksManager = createResourceLocksManager;
//# sourceMappingURL=create-resource-locks-manager.function.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/boot-root-module.function.js":
/*!************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-resource-support/src/module/boot-root-module.function.js ***!
  \************************************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.bootRootModule = void 0;
/**
 * Exports helper method for booting the root module.
 *
 * @module module/boot-root-module.function
 */
var root_module_name_const_1 = __webpack_require__(/*! ./root-module-name.const */ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/root-module-name.const.js");
var is_root_module_booted_function_1 = __webpack_require__(/*! ./is-root-module-booted.function */ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/is-root-module-booted.function.js");
////////////////////////////////////////////////////////////////////////////////
// Public Static Properties
////////////////////////////////////////////////////////////////////////////////
// None.
////////////////////////////////////////////////////////////////////////////////
// Private Static Properties
////////////////////////////////////////////////////////////////////////////////
// None.
////////////////////////////////////////////////////////////////////////////////
// Public Static Methods
////////////////////////////////////////////////////////////////////////////////
/**
 * Boot the root module.
 *
 * @returns True when successful or already booted, false otherwise.
 * @public
 * @static
 */
function bootRootModule() {
    if ((0, is_root_module_booted_function_1.isRootModuleBooted)()) {
        return true;
    }
    if (!window) {
        return false;
    }
    window[root_module_name_const_1.rootModuleName] = {};
    return true;
}
exports.bootRootModule = bootRootModule;
////////////////////////////////////////////////////////////////////////////////
// Private Static Methods
////////////////////////////////////////////////////////////////////////////////
// None.
//# sourceMappingURL=boot-root-module.function.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/get-module.function.js":
/*!******************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-resource-support/src/module/get-module.function.js ***!
  \******************************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getModule = void 0;
/**
 * Exports helper method for retrieving a module.
 *
 * @module module/get-module.function
 */
var has_module_function_1 = __webpack_require__(/*! ./has-module.function */ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/has-module.function.js");
var root_module_name_const_1 = __webpack_require__(/*! ./root-module-name.const */ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/root-module-name.const.js");
////////////////////////////////////////////////////////////////////////////////
// Public Static Properties
////////////////////////////////////////////////////////////////////////////////
// None.
////////////////////////////////////////////////////////////////////////////////
// Private Static Properties
////////////////////////////////////////////////////////////////////////////////
// None.
////////////////////////////////////////////////////////////////////////////////
// Public Static Methods
////////////////////////////////////////////////////////////////////////////////
/**
 * Get module referenced by specified key.
 *
 * @typeParam T Specify return type (default: `object`).
 * @param key Module key.
 * @returns Module referenced by key, `undefined` otherwise.
 * @public
 * @static
 */
function getModule(key) {
    if (!(0, has_module_function_1.hasModule)(key)) {
        return;
    }
    return window[root_module_name_const_1.rootModuleName][key];
}
exports.getModule = getModule;
////////////////////////////////////////////////////////////////////////////////
// Private Static Methods
////////////////////////////////////////////////////////////////////////////////
// None.
//# sourceMappingURL=get-module.function.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/has-module.function.js":
/*!******************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-resource-support/src/module/has-module.function.js ***!
  \******************************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.hasModule = void 0;
/**
 * Exports helper method for testing module existence.
 *
 * @module module/has-module.function
 */
var is_root_module_booted_function_1 = __webpack_require__(/*! ./is-root-module-booted.function */ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/is-root-module-booted.function.js");
var root_module_name_const_1 = __webpack_require__(/*! ./root-module-name.const */ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/root-module-name.const.js");
////////////////////////////////////////////////////////////////////////////////
// Public Static Properties
////////////////////////////////////////////////////////////////////////////////
// None.
////////////////////////////////////////////////////////////////////////////////
// Private Static Properties
////////////////////////////////////////////////////////////////////////////////
// None.
////////////////////////////////////////////////////////////////////////////////
// Public Static Methods
////////////////////////////////////////////////////////////////////////////////
/**
 * Test for module referenced by specified key.
 *
 * @param key Module key.
 * @returns True when module exists, false otherwise.
 * @public
 * @static
 */
function hasModule(key) {
    return (0, is_root_module_booted_function_1.isRootModuleBooted)() && !!window[root_module_name_const_1.rootModuleName][key];
}
exports.hasModule = hasModule;
////////////////////////////////////////////////////////////////////////////////
// Private Static Methods
////////////////////////////////////////////////////////////////////////////////
// None.
//# sourceMappingURL=has-module.function.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/is-root-module-booted.function.js":
/*!*****************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-resource-support/src/module/is-root-module-booted.function.js ***!
  \*****************************************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isRootModuleBooted = void 0;
/**
 * Exports helper method for testing if root module is booted.
 *
 * @module module/is-root-module-booted.function
 */
var root_module_name_const_1 = __webpack_require__(/*! ./root-module-name.const */ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/root-module-name.const.js");
////////////////////////////////////////////////////////////////////////////////
// Public Static Properties
////////////////////////////////////////////////////////////////////////////////
// None.
////////////////////////////////////////////////////////////////////////////////
// Private Static Properties
////////////////////////////////////////////////////////////////////////////////
// None.
////////////////////////////////////////////////////////////////////////////////
// Public Static Methods
////////////////////////////////////////////////////////////////////////////////
/**
 * Test whether root module is booted.
 *
 * @returns True if root module exists, false otherwise.
 * @public
 * @static
 */
function isRootModuleBooted() {
    return !!(window && window[root_module_name_const_1.rootModuleName]);
}
exports.isRootModuleBooted = isRootModuleBooted;
////////////////////////////////////////////////////////////////////////////////
// Private Static Methods
////////////////////////////////////////////////////////////////////////////////
// None.
//# sourceMappingURL=is-root-module-booted.function.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/root-module-name.const.js":
/*!*********************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-resource-support/src/module/root-module-name.const.js ***!
  \*********************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


/**
 * Exports constant representing root module name.
 *
 * @module module/root-module-name.const
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.rootModuleName = void 0;
////////////////////////////////////////////////////////////////////////////////
// Public Static Properties
////////////////////////////////////////////////////////////////////////////////
/**
 * Root module name. Default: 'myModules'
 */
exports.rootModuleName = "Agog" || 0;
////////////////////////////////////////////////////////////////////////////////
// Private Static Properties
////////////////////////////////////////////////////////////////////////////////
// None.
////////////////////////////////////////////////////////////////////////////////
// Public Static Methods
////////////////////////////////////////////////////////////////////////////////
// None.
////////////////////////////////////////////////////////////////////////////////
// Private Static Methods
////////////////////////////////////////////////////////////////////////////////
// None.
//# sourceMappingURL=root-module-name.const.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/set-module.function.js":
/*!******************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-resource-support/src/module/set-module.function.js ***!
  \******************************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.setModule = void 0;
/**
 * Exports helper method for setting a module.
 *
 * @module module/set-module.function
 */
var boot_root_module_function_1 = __webpack_require__(/*! ./boot-root-module.function */ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/boot-root-module.function.js");
var is_root_module_booted_function_1 = __webpack_require__(/*! ./is-root-module-booted.function */ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/is-root-module-booted.function.js");
var root_module_name_const_1 = __webpack_require__(/*! ./root-module-name.const */ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/root-module-name.const.js");
////////////////////////////////////////////////////////////////////////////////
// Public Static Properties
////////////////////////////////////////////////////////////////////////////////
// None.
////////////////////////////////////////////////////////////////////////////////
// Private Static Properties
////////////////////////////////////////////////////////////////////////////////
// None.
////////////////////////////////////////////////////////////////////////////////
// Public Static Methods
////////////////////////////////////////////////////////////////////////////////
/**
 * Set module referenced by specified key.
 *
 * @typeParam T Type of module being set.
 * @param key Module key.
 * @param module Module reference.
 * @returns True when set successfully, false otherwise.
 */
function setModule(key, module) {
    if (!(0, is_root_module_booted_function_1.isRootModuleBooted)()) {
        if (!(0, boot_root_module_function_1.bootRootModule)()) {
            return false;
        }
    }
    window[root_module_name_const_1.rootModuleName][key] = module;
    return true;
}
exports.setModule = setModule;
////////////////////////////////////////////////////////////////////////////////
// Private Static Methods
////////////////////////////////////////////////////////////////////////////////
// None.
//# sourceMappingURL=set-module.function.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-resource-support/src/string/get-string-byte-length.function.js":
/*!******************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-resource-support/src/string/get-string-byte-length.function.js ***!
  \******************************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


/**
 * Exports string byte length calculation method.
 *
 * @module string/get-string-byte-length.function
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getStringByteLength = void 0;
////////////////////////////////////////////////////////////////////////////////
// Public Static Properties
////////////////////////////////////////////////////////////////////////////////
// None.
////////////////////////////////////////////////////////////////////////////////
// Private Static Properties
////////////////////////////////////////////////////////////////////////////////
// None.
////////////////////////////////////////////////////////////////////////////////
// Public Static Methods
////////////////////////////////////////////////////////////////////////////////
/**
 * Get the string byte length (UTF-8).
 *
 * @param str String to calculate byte length with.
 * @returns String byte length.
 * @public
 * @static
 */
function getStringByteLength(str) {
    var s = str.length;
    for (var i = str.length - 1; i >= 0; i--) {
        var code = str.charCodeAt(i);
        if (code > 0x7f && code <= 0x7ff) {
            s++;
        }
        else if (code > 0x7ff && code <= 0xffff) {
            s += 2;
        }
        if (code >= 0xdc00 && code <= 0xdfff) {
            // Trail surrogate.
            i--;
        }
    }
    return s;
}
exports.getStringByteLength = getStringByteLength;
////////////////////////////////////////////////////////////////////////////////
// Private Static Methods
////////////////////////////////////////////////////////////////////////////////
// None.
//# sourceMappingURL=get-string-byte-length.function.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-resource-support/src/time/get-unix-timestamp.function.js":
/*!************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-resource-support/src/time/get-unix-timestamp.function.js ***!
  \************************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


/**
 * Exports unix timestamp function.
 *
 * @module time/get-unix-timestamp.function
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getUnixTimestamp = void 0;
////////////////////////////////////////////////////////////////////////////////
// Public Static Properties
////////////////////////////////////////////////////////////////////////////////
// None.
////////////////////////////////////////////////////////////////////////////////
// Private Static Properties
////////////////////////////////////////////////////////////////////////////////
// None.
////////////////////////////////////////////////////////////////////////////////
// Public Static Methods
////////////////////////////////////////////////////////////////////////////////
/**
 * Get a unix timestamp (time in seconds since Unix epoch).
 *
 * @returns Time in seconds since Unix epoch.
 * @public
 * @static
 */
function getUnixTimestamp() {
    return Math.round(+new Date() / 1000);
}
exports.getUnixTimestamp = getUnixTimestamp;
////////////////////////////////////////////////////////////////////////////////
// Private Static Methods
////////////////////////////////////////////////////////////////////////////////
// None.
//# sourceMappingURL=get-unix-timestamp.function.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-resource-support/src/time/poll-with-backoff.function.js":
/*!***********************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-resource-support/src/time/poll-with-backoff.function.js ***!
  \***********************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


/**
 * Exports poll with interval function.
 *
 * @module time/poll-with-interval.function
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.pollWithBackoff = void 0;
////////////////////////////////////////////////////////////////////////////////
// Public Static Properties
////////////////////////////////////////////////////////////////////////////////
// None.
////////////////////////////////////////////////////////////////////////////////
// Private Static Properties
////////////////////////////////////////////////////////////////////////////////
// None.
////////////////////////////////////////////////////////////////////////////////
// Public Static Methods
////////////////////////////////////////////////////////////////////////////////
/**
 * Poll for conditial satisfaction with exponential backoff.
 *
 * @param conditional Condition callback.
 * @param onProceed Proceed callback.
 * @param onTimeout Timeout callback.
 * @param initialInterval Initial interval in milliseconds.
 * @param retries Number of attempts (default is 3).
 * @public
 * @static
 */
function pollWithBackoff(conditional, onProceed, onTimeout, initialInterval, retries) {
    initialInterval <= 0 ? 1000 : initialInterval;
    var maxRetries = typeof retries !== 'number' || retries <= 0 ? 3 : retries;
    var startTime = +new Date();
    var elapsedTime = 0;
    var numRetries = 0;
    function poll() {
        elapsedTime += +new Date() - startTime;
        if (conditional()) {
            onProceed();
            return;
        }
        else if (numRetries >= maxRetries) {
            onTimeout(elapsedTime);
            return;
        }
        var time = initialInterval * Math.pow(2, numRetries++);
        setTimeout(poll, time);
    }
    setTimeout(poll, 0);
}
exports.pollWithBackoff = pollWithBackoff;
////////////////////////////////////////////////////////////////////////////////
// Private Static Methods
////////////////////////////////////////////////////////////////////////////////
// None.
//# sourceMappingURL=poll-with-backoff.function.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-resource-support/src/time/poll-with-interval.function.js":
/*!************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-resource-support/src/time/poll-with-interval.function.js ***!
  \************************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


/**
 * Exports poll with interval function.
 *
 * @module time/poll-with-interval.function
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.pollWithInterval = void 0;
////////////////////////////////////////////////////////////////////////////////
// Public Static Properties
////////////////////////////////////////////////////////////////////////////////
// None.
////////////////////////////////////////////////////////////////////////////////
// Private Static Properties
////////////////////////////////////////////////////////////////////////////////
// None.
////////////////////////////////////////////////////////////////////////////////
// Public Static Methods
////////////////////////////////////////////////////////////////////////////////
/**
 * Poll until conditional satisfaction with specified interval & optional
 * timeout. Will call `onProceed` when condition is satisfied, `onTimeout` if
 * provided timout is reached.
 *
 * @param conditional Condition callback.
 * @param onProceed Proceed callback.
 * @param onTimeout Timeout callback.
 * @param interval Interval in milliseconds.
 * @param timeout Timeout in milliseconds.
 */
function pollWithInterval(conditional, onProceed, onTimeout, interval, timeout) {
    interval = interval <= 0 ? 1000 : interval;
    timeout = typeof timeout !== 'number' || timeout < 0 ? 0 : timeout;
    var startTime = +new Date();
    var elapsedTime = 0;
    function poll() {
        elapsedTime += +new Date() - startTime;
        if (conditional()) {
            onProceed();
            return;
        }
        else if (timeout && elapsedTime >= timeout) {
            onTimeout(elapsedTime);
            return;
        }
        setTimeout(poll, interval);
    }
    setTimeout(poll, 0);
}
exports.pollWithInterval = pollWithInterval;
////////////////////////////////////////////////////////////////////////////////
// Private Static Methods
////////////////////////////////////////////////////////////////////////////////
// None.
//# sourceMappingURL=poll-with-interval.function.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-info-category.js":
/*!**********************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-info-category.js ***!
  \**********************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AgtkPluginInfoCategory = void 0;
var AgtkPluginInfoCategory;
(function (AgtkPluginInfoCategory) {
    AgtkPluginInfoCategory["Name"] = "name";
    AgtkPluginInfoCategory["Description"] = "description";
    AgtkPluginInfoCategory["Author"] = "author";
    AgtkPluginInfoCategory["Help"] = "help";
    AgtkPluginInfoCategory["Parameter"] = "parameter";
    AgtkPluginInfoCategory["Internal"] = "internal";
    AgtkPluginInfoCategory["ActionCommand"] = "actionCommand";
    AgtkPluginInfoCategory["LinkCondition"] = "linkCondition";
    AgtkPluginInfoCategory["AutoTile"] = "autoTile";
})(AgtkPluginInfoCategory = exports.AgtkPluginInfoCategory || (exports.AgtkPluginInfoCategory = {}));
//# sourceMappingURL=plugin-info-category.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-parameter-type.js":
/*!**************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-parameter-type.js ***!
  \**************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AgtkPluginUiParameterType = void 0;
var AgtkPluginUiParameterType;
(function (AgtkPluginUiParameterType) {
    AgtkPluginUiParameterType["String"] = "String";
    AgtkPluginUiParameterType["MultiLineString"] = "MultiLineString";
    AgtkPluginUiParameterType["Number"] = "Number";
    AgtkPluginUiParameterType["Json"] = "Json";
    AgtkPluginUiParameterType["ImageId"] = "ImageId";
    AgtkPluginUiParameterType["TextId"] = "TextId";
    AgtkPluginUiParameterType["SceneId"] = "SceneId";
    AgtkPluginUiParameterType["TilesetId"] = "TilesetId";
    AgtkPluginUiParameterType["AnimationId"] = "AnimationId";
    AgtkPluginUiParameterType["ObjectId"] = "ObjectId";
    AgtkPluginUiParameterType["FontId"] = "FontId";
    AgtkPluginUiParameterType["MovieId"] = "MovieId";
    AgtkPluginUiParameterType["BgmId"] = "BgmId";
    AgtkPluginUiParameterType["SeId"] = "SeId";
    AgtkPluginUiParameterType["VoiceId"] = "VoiceId";
    AgtkPluginUiParameterType["VariableId"] = "VariableId";
    AgtkPluginUiParameterType["SwitchId"] = "SwitchId";
    AgtkPluginUiParameterType["AnimOnlyId"] = "AnimOnlyId";
    AgtkPluginUiParameterType["PortalId"] = "PortalId";
    AgtkPluginUiParameterType["CustomId"] = "CustomId";
    AgtkPluginUiParameterType["Embedded"] = "Embedded";
    AgtkPluginUiParameterType["EmbeddedEditable"] = "EmbeddedEditable";
    AgtkPluginUiParameterType["SwitchVariableObjectId"] = "SwitchVariableObjectId";
    AgtkPluginUiParameterType["DatabaseId"] = "DatabaseId";
})(AgtkPluginUiParameterType = exports.AgtkPluginUiParameterType || (exports.AgtkPluginUiParameterType = {}));
//# sourceMappingURL=plugin-ui-parameter-type.js.map

/***/ }),

/***/ "./src/create-runtime-logger-plugin.function.ts":
/*!******************************************************!*\
  !*** ./src/create-runtime-logger-plugin.function.ts ***!
  \******************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createRuntimeLoggerPlugin = void 0;
var create_logger_function_1 = __webpack_require__(/*! @agogpixel/pgmmv-logging-support/src/create-logger.function */ "./node_modules/@agogpixel/pgmmv-logging-support/src/create-logger.function.js");
var log_level_enum_1 = __webpack_require__(/*! @agogpixel/pgmmv-logging-support/src/log-level.enum */ "./node_modules/@agogpixel/pgmmv-logging-support/src/log-level.enum.js");
var create_plugin_function_1 = __webpack_require__(/*! @agogpixel/pgmmv-plugin-support/src/create-plugin.function */ "./node_modules/@agogpixel/pgmmv-plugin-support/src/create-plugin.function.js");
var locale_1 = __importDefault(__webpack_require__(/*! ./locale */ "./src/locale/index.ts"));
var log_files_manager_1 = __webpack_require__(/*! ./log-files-manager */ "./src/log-files-manager/index.ts");
var parameters_1 = __webpack_require__(/*! ./parameters */ "./src/parameters/index.ts");
/**
 * Plugin banner.
 *
 * @private
 * @static
 */
var pluginBanner = "\nRuntime Logger Plugin v".concat("0.4.0-dev", "\n");
////////////////////////////////////////////////////////////////////////////////
// Public Static Methods
////////////////////////////////////////////////////////////////////////////////
/**
 * Create a Runtime Logger plugin instance.
 *
 * @returns Runtime Logger plugin instance.
 * @public
 * @static
 */
function createRuntimeLoggerPlugin() {
    // Protected API container.
    var internalApi = {};
    // Public API container.
    var self = (0, create_plugin_function_1.createPlugin)({ localizations: locale_1.default, parameters: parameters_1.parameters }, internalApi);
    //////////////////////////////////////////////////////////////////////////////
    // Private Properties
    //////////////////////////////////////////////////////////////////////////////
    /**
     * Reference to original `Agtk.log` method.
     *
     * @private
     */
    var AgtkLog;
    /**
     * Reference to logger that outputs to console & file.
     *
     * @private
     */
    var combinedLogger;
    /**
     * Reference to log files manager.
     *
     * @private
     */
    var logFilesManager;
    //////////////////////////////////////////////////////////////////////////////
    // Private Methods
    //////////////////////////////////////////////////////////////////////////////
    /**
     * Initialize combined logger and override `Agtk.log` method.
     *
     * @private
     */
    function initLogOverride() {
        var _a;
        // Set default values.
        setLoggerConfig();
        AgtkLog = Agtk.log;
        logFilesManager = (0, log_files_manager_1.createLogFilesManager)({
            logFilesDirectory: internalApi.loggerConfig.logFilesDirectory
        });
        combinedLogger = (0, create_logger_function_1.createLogger)({
            logLevel: internalApi.loggerConfig.logLevel,
            runtimeLog: function (arg1) {
                var chunks = arg1.match(/.{1,120}/g);
                for (var i = 0; i < chunks.length; ++i) {
                    AgtkLog(chunks[i]);
                }
                if (internalApi.inPlayer() && internalApi.loggerConfig.writeLogFiles) {
                    logFilesManager.writeToLogFiles(arg1);
                }
            },
            jsonIndentSize: internalApi.loggerConfig.jsonIndentSize,
            jsonStringifyFunctions: internalApi.loggerConfig.jsonStringifyFunctions,
            logLevelMap: (_a = {},
                _a[log_level_enum_1.LogLevel.Debug] = internalApi.localization.get('LOG_LEVEL_DEBUG'),
                _a[log_level_enum_1.LogLevel.Info] = internalApi.localization.get('LOG_LEVEL_INFO'),
                _a[log_level_enum_1.LogLevel.Warn] = internalApi.localization.get('LOG_LEVEL_WARN'),
                _a[log_level_enum_1.LogLevel.Error] = internalApi.localization.get('LOG_LEVEL_ERROR'),
                _a[log_level_enum_1.LogLevel.Fatal] = internalApi.localization.get('LOG_LEVEL_FATAL'),
                _a)
        });
        var logOverride = function (data, level) {
            combinedLogger.log(data, level);
        };
        logOverride.log = function (data, level) {
            combinedLogger.log(data, level);
        };
        logOverride.debug = function (data) {
            combinedLogger.debug(data);
        };
        logOverride.info = function (data) {
            combinedLogger.info(data);
        };
        logOverride.warn = function (data) {
            combinedLogger.warn(data);
        };
        logOverride.error = function (data) {
            combinedLogger.error(data);
        };
        logOverride.fatal = function (data) {
            combinedLogger.fatal(data);
        };
        Agtk.log = logOverride;
    }
    /**
     * Set logger configuration using specified UI parameter values.
     *
     * @param paramValue Plugin UI parameter values.
     * @private
     */
    function setLoggerConfig(paramValue) {
        if (paramValue === void 0) { paramValue = []; }
        var normalizedUiParameters = internalApi.normalizeUiParameters(paramValue);
        var logLevel = normalizedUiParameters[parameters_1.ParameterId.LogLevel];
        var jsonIndentSize = normalizedUiParameters[parameters_1.ParameterId.JsonIndentSize];
        var jsonStringifyFunctionsParamValue = normalizedUiParameters[parameters_1.ParameterId.JsonStringifyFunctions];
        var jsonStringifyFunctions = jsonStringifyFunctionsParamValue === parameters_1.JsonStringifyFunctionsParameterId.Always ||
            (jsonStringifyFunctionsParamValue === parameters_1.JsonStringifyFunctionsParameterId.DebugOnly && logLevel === log_level_enum_1.LogLevel.Debug);
        var writeLogFiles = normalizedUiParameters[parameters_1.ParameterId.WriteLogFiles] === parameters_1.WriteLogFilesParameterId.On;
        var logFilesDirectoryParamValue = normalizedUiParameters[parameters_1.ParameterId.LogFilesDirectory].trim();
        var logFilesDirectory = '';
        if (logFilesDirectoryParamValue) {
            var rawDirParts = logFilesDirectoryParamValue.replace(/\\/g, '/').split(/\//);
            var dirParts = [];
            var invalid = false;
            for (var i = 0; i < rawDirParts.length; ++i) {
                var p = rawDirParts[i].trim();
                if (/(<|>|:|"|\||\?|\*|^\.$|^\.\.$)/.test(p)) {
                    invalid = true;
                    break;
                }
                if (p) {
                    dirParts.push(p);
                }
            }
            if (!invalid && dirParts.length) {
                logFilesDirectory = dirParts.join('/');
            }
        }
        internalApi.loggerConfig = {
            logLevel: logLevel,
            jsonIndentSize: jsonIndentSize,
            jsonStringifyFunctions: jsonStringifyFunctions,
            logFilesDirectory: logFilesDirectory,
            writeLogFiles: writeLogFiles
        };
        if (!combinedLogger || !logFilesManager) {
            return;
        }
        combinedLogger
            .setLogLevel(logLevel)
            .setJsonIndentSize(jsonIndentSize)
            .setJsonStringifyFunctions(jsonStringifyFunctions);
        logFilesManager.setLogFilesDirectory(logFilesDirectory);
    }
    //////////////////////////////////////////////////////////////////////////////
    // Protected Properties
    //////////////////////////////////////////////////////////////////////////////
    // None.
    //////////////////////////////////////////////////////////////////////////////
    // Protected Methods
    //////////////////////////////////////////////////////////////////////////////
    // None.
    //////////////////////////////////////////////////////////////////////////////
    // Public Properties
    //////////////////////////////////////////////////////////////////////////////
    // None.
    //////////////////////////////////////////////////////////////////////////////
    // Public Methods
    //////////////////////////////////////////////////////////////////////////////
    var _initialize = self.initialize;
    self.initialize = function (data) {
        _initialize(data);
        if (internalApi.inEditor()) {
            return;
        }
        initLogOverride();
        combinedLogger.log(pluginBanner);
    };
    self.finalize = function () {
        if (internalApi.inEditor()) {
            return;
        }
        Agtk.log = AgtkLog;
    };
    self.setParamValue = function (paramValue) {
        if (internalApi.inEditor()) {
            return;
        }
        setLoggerConfig(paramValue);
    };
    // Plugin is ready!
    return self;
}
exports.createRuntimeLoggerPlugin = createRuntimeLoggerPlugin;
////////////////////////////////////////////////////////////////////////////////
// Private Static Methods
////////////////////////////////////////////////////////////////////////////////
// None.


/***/ }),

/***/ "./src/locale/en/index.ts":
/*!********************************!*\
  !*** ./src/locale/en/index.ts ***!
  \********************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
var data_json_1 = __importDefault(__webpack_require__(/*! ./data.json */ "./src/locale/en/data.json"));
data_json_1.default.PLUGIN_HELP = __webpack_require__(/*! ./help.md */ "./src/locale/en/help.md");
exports["default"] = {
    locale: 'en',
    data: data_json_1.default
};


/***/ }),

/***/ "./src/locale/index.ts":
/*!*****************************!*\
  !*** ./src/locale/index.ts ***!
  \*****************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
var en_1 = __importDefault(__webpack_require__(/*! ./en */ "./src/locale/en/index.ts"));
exports["default"] = [en_1.default];


/***/ }),

/***/ "./src/log-files-manager/create-log-files-manager.function.ts":
/*!********************************************************************!*\
  !*** ./src/log-files-manager/create-log-files-manager.function.ts ***!
  \********************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createLogFilesManager = void 0;
/**
 * Exports a log files manager instance factory.
 *
 * @module
 */
var mixin_file_manager_function_1 = __webpack_require__(/*! @agogpixel/pgmmv-fs-support/src/mixin-file-manager.function */ "./node_modules/@agogpixel/pgmmv-fs-support/src/mixin-file-manager.function.js");
var mixin_file_reader_function_1 = __webpack_require__(/*! @agogpixel/pgmmv-fs-support/src/mixin-file-reader.function */ "./node_modules/@agogpixel/pgmmv-fs-support/src/mixin-file-reader.function.js");
var mixin_file_writer_function_1 = __webpack_require__(/*! @agogpixel/pgmmv-fs-support/src/mixin-file-writer.function */ "./node_modules/@agogpixel/pgmmv-fs-support/src/mixin-file-writer.function.js");
var get_unix_timestamp_function_1 = __webpack_require__(/*! @agogpixel/pgmmv-resource-support/src/time/get-unix-timestamp.function */ "./node_modules/@agogpixel/pgmmv-resource-support/src/time/get-unix-timestamp.function.js");
var poll_with_interval_function_1 = __webpack_require__(/*! @agogpixel/pgmmv-resource-support/src/time/poll-with-interval.function */ "./node_modules/@agogpixel/pgmmv-resource-support/src/time/poll-with-interval.function.js");
////////////////////////////////////////////////////////////////////////////////
// Public Static Properties
////////////////////////////////////////////////////////////////////////////////
// None.
////////////////////////////////////////////////////////////////////////////////
// Private Static Properties
////////////////////////////////////////////////////////////////////////////////
/**
 * Target log filename.
 *
 * @private
 * @static
 */
var targetLogFile = 'current.log';
////////////////////////////////////////////////////////////////////////////////
// Public Static Methods
////////////////////////////////////////////////////////////////////////////////
/**
 * Create log files manager.
 *
 * @param config Log files manager configuration.
 * @returns Log file manager instance.
 * @public
 * @static
 */
function createLogFilesManager(config) {
    // Public API container.
    var self = {};
    //////////////////////////////////////////////////////////////////////////////
    // Private Properties
    //////////////////////////////////////////////////////////////////////////////
    /**
     * File system API.
     *
     * @private
     */
    var fsApi = (0, mixin_file_writer_function_1.mixinFileWriter)((0, mixin_file_reader_function_1.mixinFileReader)((0, mixin_file_manager_function_1.mixinFileManager)({})));
    /**
     * Log files directory.
     *
     * @private
     */
    var logFilesDirectory = config.logFilesDirectory;
    /**
     * Write buffer.
     *
     * @private
     */
    var buffer;
    /**
     * Log batch state date.
     *
     * @private
     */
    var batchStart;
    /**
     * Write buffer size.
     *
     * @private
     */
    var bufferSize;
    /**
     * Last write unix timestamp.
     *
     * @private
     */
    var lastWriteTime = (0, get_unix_timestamp_function_1.getUnixTimestamp)();
    /**
     * Is writing flag.
     *
     * @private
     */
    var isWriting = false;
    //////////////////////////////////////////////////////////////////////////////
    // Private Methods
    //////////////////////////////////////////////////////////////////////////////
    /**
     * Create log files directory path.
     *
     * @param basePath Base path.
     * @param relDirPath Relative directory path.
     * @param callback File system operation callback.
     * @private
     */
    function createLogFilesDirectoryPath(basePath, relDirPath, callback) {
        if (!relDirPath) {
            callback(true);
            return;
        }
        var parts = relDirPath.split('/');
        var path = "".concat(basePath, "/").concat(parts.shift());
        if (fsApi.isDirectory(path)) {
            createLogFilesDirectoryPath(path, parts.join('/'), callback);
            return;
        }
        fsApi.createDirectory(path, function (success) {
            if (success) {
                createLogFilesDirectoryPath(path, parts.join('/'), callback);
                return;
            }
            callback(false);
        });
    }
    /**
     * Write to buffer.
     *
     * @param data Data to write.
     * @private
     */
    function writeToBuffer(data) {
        if (!buffer) {
            buffer = [];
            batchStart = new Date();
            bufferSize = 0;
        }
        buffer.push(data);
        bufferSize += data.length;
        if (bufferSize > 2048) {
            flushToFile(buffer, "".concat(Agtk.settings.projectPath).concat(logFilesDirectory, "/").concat(targetLogFile));
        }
    }
    /**
     * Flush data in write buffer to file.
     *
     * @param buffer Buffer containing data to flush.
     * @param path Path to file.
     * @private
     */
    function flushToFile(buffer, path) {
        if (isWriting) {
            return;
        }
        isWriting = true;
        function finish() {
            isWriting = false;
            lastWriteTime = (0, get_unix_timestamp_function_1.getUnixTimestamp)();
        }
        fsApi.appendFile(buffer.join('\n').trim(), path, function (success) {
            if (!success) {
                finish();
                return;
            }
            fsApi.readFileSize(path, function (success, data) {
                function pad2(n) {
                    return (n < 10 ? '0' : '') + n;
                }
                function pad3(n) {
                    return (n < 100 ? '0' : '') + pad2(n);
                }
                if (success && typeof data === 'number' && data >= 6144) {
                    var filename = "".concat(batchStart.getFullYear(), "-").concat(pad2(batchStart.getMonth() + 1), "-").concat(pad2(batchStart.getDate()), "-").concat(pad2(batchStart.getHours()), "-").concat(pad2(batchStart.getMinutes()), "-").concat(pad2(batchStart.getSeconds()), "-").concat(pad3(batchStart.getMilliseconds()), ".log");
                    batchStart = new Date();
                    var rotateLog_1 = "".concat(Agtk.settings.projectPath).concat(logFilesDirectory, "/").concat(filename);
                    fsApi.readFile(path, function (success, data) {
                        if (success && data !== undefined) {
                            fsApi.writeFile(data, rotateLog_1, function () {
                                fsApi.writeFile('', path, finish);
                            });
                        }
                        else {
                            fsApi.writeFile('', path, finish);
                        }
                    });
                }
                else {
                    finish();
                }
            });
        });
        buffer.length = 0;
        bufferSize = 0;
    }
    // Flush buffer timeout.
    (0, poll_with_interval_function_1.pollWithInterval)(function () {
        if (bufferSize > 2048 || (0, get_unix_timestamp_function_1.getUnixTimestamp)() - lastWriteTime > 3) {
            if (buffer && buffer.length) {
                flushToFile(buffer, "".concat(Agtk.settings.projectPath).concat(logFilesDirectory, "/").concat(targetLogFile));
            }
        }
        return false;
    }, function () {
        return;
    }, function () {
        return;
    }, 4000);
    //////////////////////////////////////////////////////////////////////////////
    // Protected Properties
    //////////////////////////////////////////////////////////////////////////////
    // None.
    //////////////////////////////////////////////////////////////////////////////
    // Protected Methods
    //////////////////////////////////////////////////////////////////////////////
    // None.
    //////////////////////////////////////////////////////////////////////////////
    // Public Properties
    //////////////////////////////////////////////////////////////////////////////
    // None.
    //////////////////////////////////////////////////////////////////////////////
    // Public Methods
    //////////////////////////////////////////////////////////////////////////////
    self.getLogFilesDirectory = function () {
        return logFilesDirectory;
    };
    self.setLogFilesDirectory = function (relDirPath) {
        logFilesDirectory = relDirPath;
        return self;
    };
    self.writeToLogFiles = function (data) {
        var logFilesDirectoryPath = "".concat(Agtk.settings.projectPath).concat(logFilesDirectory);
        if (!fsApi.isAbsolutePath(logFilesDirectoryPath)) {
            return;
        }
        if (!fsApi.isDirectory(logFilesDirectoryPath)) {
            createLogFilesDirectoryPath(Agtk.settings.projectPath, logFilesDirectory, function (success) {
                if (success) {
                    writeToBuffer(data);
                }
            });
            return;
        }
        writeToBuffer(data);
    };
    // Log files manager ready!
    return self;
}
exports.createLogFilesManager = createLogFilesManager;
////////////////////////////////////////////////////////////////////////////////
// Private Static Methods
////////////////////////////////////////////////////////////////////////////////
// None.


/***/ }),

/***/ "./src/log-files-manager/index.ts":
/*!****************************************!*\
  !*** ./src/log-files-manager/index.ts ***!
  \****************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
/**
 * Exports log files manager APIs & functions.
 *
 * @module
 */
__exportStar(__webpack_require__(/*! ./create-log-files-manager.function */ "./src/log-files-manager/create-log-files-manager.function.ts"), exports);
__exportStar(__webpack_require__(/*! ./log-files-manager.interface */ "./src/log-files-manager/log-files-manager.interface.ts"), exports);


/***/ }),

/***/ "./src/log-files-manager/log-files-manager.interface.ts":
/*!**************************************************************!*\
  !*** ./src/log-files-manager/log-files-manager.interface.ts ***!
  \**************************************************************/
/***/ (function(__unused_webpack_module, exports) {


/**
 * Exports log files manager API.
 *
 * @module
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));


/***/ }),

/***/ "./src/parameters/index.ts":
/*!*********************************!*\
  !*** ./src/parameters/index.ts ***!
  \*********************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
/**
 * Exports Runtime Logger plugin UI parameter configurations.
 *
 * @module
 */
__exportStar(__webpack_require__(/*! ./json-stringify-functions-parameter-id.enum */ "./src/parameters/json-stringify-functions-parameter-id.enum.ts"), exports);
__exportStar(__webpack_require__(/*! ./log-level-parameter-id.enum */ "./src/parameters/log-level-parameter-id.enum.ts"), exports);
__exportStar(__webpack_require__(/*! ./parameter-id.enum */ "./src/parameters/parameter-id.enum.ts"), exports);
__exportStar(__webpack_require__(/*! ./parameters.config */ "./src/parameters/parameters.config.ts"), exports);
__exportStar(__webpack_require__(/*! ./write-log-files-parameter-id.enum */ "./src/parameters/write-log-files-parameter-id.enum.ts"), exports);


/***/ }),

/***/ "./src/parameters/json-stringify-functions-parameter-id.enum.ts":
/*!**********************************************************************!*\
  !*** ./src/parameters/json-stringify-functions-parameter-id.enum.ts ***!
  \**********************************************************************/
/***/ (function(__unused_webpack_module, exports) {


/**
 * Exports JSON stringify functions parameter ID enumeration.
 *
 * @module
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.JsonStringifyFunctionsParameterId = void 0;
/**
 * JSON stringify functions parameter ID enumeration.
 */
var JsonStringifyFunctionsParameterId;
(function (JsonStringifyFunctionsParameterId) {
    /**
     * Never.
     */
    JsonStringifyFunctionsParameterId[JsonStringifyFunctionsParameterId["Never"] = 1] = "Never";
    /**
     * Debug only.
     */
    JsonStringifyFunctionsParameterId[JsonStringifyFunctionsParameterId["DebugOnly"] = 2] = "DebugOnly";
    /**
     * Always.
     */
    JsonStringifyFunctionsParameterId[JsonStringifyFunctionsParameterId["Always"] = 3] = "Always";
})(JsonStringifyFunctionsParameterId = exports.JsonStringifyFunctionsParameterId || (exports.JsonStringifyFunctionsParameterId = {}));


/***/ }),

/***/ "./src/parameters/log-level-parameter-id.enum.ts":
/*!*******************************************************!*\
  !*** ./src/parameters/log-level-parameter-id.enum.ts ***!
  \*******************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LogLevelParameterId = void 0;
/**
 * Log level parameter ID enumeration.
 */
var LogLevelParameterId;
(function (LogLevelParameterId) {
    /**
     * Debug log level.
     */
    LogLevelParameterId[LogLevelParameterId["Debug"] = 0] = "Debug";
    /**
     * Info log level.
     */
    LogLevelParameterId[LogLevelParameterId["Info"] = 1] = "Info";
    /**
     * Warn log level.
     */
    LogLevelParameterId[LogLevelParameterId["Warn"] = 2] = "Warn";
    /**
     * Error log level.
     */
    LogLevelParameterId[LogLevelParameterId["Error"] = 3] = "Error";
    /**
     * Fatal log level.
     */
    LogLevelParameterId[LogLevelParameterId["Fatal"] = 4] = "Fatal";
})(LogLevelParameterId = exports.LogLevelParameterId || (exports.LogLevelParameterId = {}));


/***/ }),

/***/ "./src/parameters/parameter-id.enum.ts":
/*!*********************************************!*\
  !*** ./src/parameters/parameter-id.enum.ts ***!
  \*********************************************/
/***/ (function(__unused_webpack_module, exports) {


/**
 * Exports parameter ID enumeration.
 *
 * @module
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ParameterId = void 0;
/**
 * Parameter ID enumeration
 */
var ParameterId;
(function (ParameterId) {
    /**
     * Log level parameter ID.
     */
    ParameterId[ParameterId["LogLevel"] = 1] = "LogLevel";
    /**
     * JSON indent size parameter ID.
     */
    ParameterId[ParameterId["JsonIndentSize"] = 2] = "JsonIndentSize";
    /**
     * JSON stringify functions parameter ID.
     */
    ParameterId[ParameterId["JsonStringifyFunctions"] = 3] = "JsonStringifyFunctions";
    /**
     * Write log files parameter ID.
     */
    ParameterId[ParameterId["WriteLogFiles"] = 4] = "WriteLogFiles";
    /**
     * Log files directory parameter ID.
     */
    ParameterId[ParameterId["LogFilesDirectory"] = 5] = "LogFilesDirectory";
})(ParameterId = exports.ParameterId || (exports.ParameterId = {}));


/***/ }),

/***/ "./src/parameters/parameters.config.ts":
/*!*********************************************!*\
  !*** ./src/parameters/parameters.config.ts ***!
  \*********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.parameters = void 0;
var plugin_ui_parameter_type_1 = __webpack_require__(/*! @agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-parameter-type */ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-parameter-type.js");
var json_stringify_functions_parameter_id_enum_1 = __webpack_require__(/*! ./json-stringify-functions-parameter-id.enum */ "./src/parameters/json-stringify-functions-parameter-id.enum.ts");
var log_level_parameter_id_enum_1 = __webpack_require__(/*! ./log-level-parameter-id.enum */ "./src/parameters/log-level-parameter-id.enum.ts");
var parameter_id_enum_1 = __webpack_require__(/*! ./parameter-id.enum */ "./src/parameters/parameter-id.enum.ts");
var write_log_files_parameter_id_enum_1 = __webpack_require__(/*! ./write-log-files-parameter-id.enum */ "./src/parameters/write-log-files-parameter-id.enum.ts");
/**
 * Runtime Logger UI parameter configuration.
 */
exports.parameters = [
    {
        id: parameter_id_enum_1.ParameterId.LogLevel,
        name: 'loca(PARAMETER_LOG_LEVEL_NAME)',
        type: plugin_ui_parameter_type_1.AgtkPluginUiParameterType.CustomId,
        customParam: [
            { id: log_level_parameter_id_enum_1.LogLevelParameterId.Debug, name: 'loca(PARAMETER_LOG_LEVEL_PARAM_DEBUG_NAME)' },
            { id: log_level_parameter_id_enum_1.LogLevelParameterId.Info, name: 'loca(PARAMETER_LOG_LEVEL_PARAM_INFO_NAME)' },
            { id: log_level_parameter_id_enum_1.LogLevelParameterId.Warn, name: 'loca(PARAMETER_LOG_LEVEL_PARAM_WARN_NAME)' },
            { id: log_level_parameter_id_enum_1.LogLevelParameterId.Error, name: 'loca(PARAMETER_LOG_LEVEL_PARAM_ERROR_NAME)' },
            { id: log_level_parameter_id_enum_1.LogLevelParameterId.Fatal, name: 'loca(PARAMETER_LOG_LEVEL_PARAM_FATAL_NAME)' }
        ],
        defaultValue: log_level_parameter_id_enum_1.LogLevelParameterId.Info
    },
    {
        id: parameter_id_enum_1.ParameterId.JsonIndentSize,
        name: 'loca(PARAMETER_JSON_INDENT_SIZE_NAME)',
        type: plugin_ui_parameter_type_1.AgtkPluginUiParameterType.Number,
        minimumValue: 0,
        maximumValue: 8,
        defaultValue: 2
    },
    {
        id: parameter_id_enum_1.ParameterId.JsonStringifyFunctions,
        name: 'loca(PARAMETER_JSON_STRINGIFY_FUNCTIONS_NAME)',
        type: plugin_ui_parameter_type_1.AgtkPluginUiParameterType.CustomId,
        customParam: [
            {
                id: json_stringify_functions_parameter_id_enum_1.JsonStringifyFunctionsParameterId.Never,
                name: 'loca(PARAMETER_JSON_STRINGIFY_FUNCTIONS_PARAM_NEVER_NAME)'
            },
            {
                id: json_stringify_functions_parameter_id_enum_1.JsonStringifyFunctionsParameterId.DebugOnly,
                name: 'loca(PARAMETER_JSON_STRINGIFY_FUNCTIONS_PARAM_DEBUG_ONLY_NAME)'
            },
            {
                id: json_stringify_functions_parameter_id_enum_1.JsonStringifyFunctionsParameterId.Always,
                name: 'loca(PARAMETER_JSON_STRINGIFY_FUNCTIONS_PARAM_ALWAYS_NAME)'
            }
        ],
        defaultValue: json_stringify_functions_parameter_id_enum_1.JsonStringifyFunctionsParameterId.DebugOnly
    },
    {
        id: parameter_id_enum_1.ParameterId.WriteLogFiles,
        name: 'loca(PARAMETER_WRITE_LOG_FILES_NAME)',
        type: plugin_ui_parameter_type_1.AgtkPluginUiParameterType.CustomId,
        customParam: [
            { id: write_log_files_parameter_id_enum_1.WriteLogFilesParameterId.Off, name: 'loca(PARAMETER_WRITE_LOG_FILES_PARAM_OFF_NAME)' },
            { id: write_log_files_parameter_id_enum_1.WriteLogFilesParameterId.On, name: 'loca(PARAMETER_WRITE_LOG_FILES_PARAM_ON_NAME)' }
        ],
        defaultValue: write_log_files_parameter_id_enum_1.WriteLogFilesParameterId.Off
    },
    {
        id: parameter_id_enum_1.ParameterId.LogFilesDirectory,
        name: 'loca(PARAMETER_LOG_FILES_DIRECTORY_NAME)',
        type: plugin_ui_parameter_type_1.AgtkPluginUiParameterType.String,
        defaultValue: 'loca(PARAMETER_LOG_FILES_DIRECTORY_DEFAULT_VALUE)'
    }
];


/***/ }),

/***/ "./src/parameters/write-log-files-parameter-id.enum.ts":
/*!*************************************************************!*\
  !*** ./src/parameters/write-log-files-parameter-id.enum.ts ***!
  \*************************************************************/
/***/ (function(__unused_webpack_module, exports) {


/**
 * Exports write log files parameter ID enumeration.
 *
 * @module
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.WriteLogFilesParameterId = void 0;
/**
 * Write log files parameter ID enumeration
 */
var WriteLogFilesParameterId;
(function (WriteLogFilesParameterId) {
    /**
     * Write log files: off.
     */
    WriteLogFilesParameterId[WriteLogFilesParameterId["Off"] = 1] = "Off";
    /**
     * Write log files: on.
     */
    WriteLogFilesParameterId[WriteLogFilesParameterId["On"] = 2] = "On";
})(WriteLogFilesParameterId = exports.WriteLogFilesParameterId || (exports.WriteLogFilesParameterId = {}));


/***/ }),

/***/ "./src/locale/en/help.md":
/*!*******************************!*\
  !*** ./src/locale/en/help.md ***!
  \*******************************/
/***/ (function(module) {

module.exports = "# Runtime Logger Plugin\n\nExtends the `Agtk.log` method & provides the following:\n\n-   Log level support.\n-   Improved output of large strings to the player's \"Runtime Log Console\".\n-   Automatically converts non-string arguments to a JSON string:\n    -   Configurable indenting.\n    -   Optional function stringify.\n    -   Handles circular references.\n-   Optional output of logs to the filesystem with log rotation (player only, see 'Notes').\n\nThese features can be leveraged in your other PGMMV plugins & scripts.\n\n## Plugin Parameters\n\n-   `Log Level`: One of `DEBUG < INFO < WARN < ERROR < FATAL`.\n-   `JSON Indent Size`: Clamps with range [0,8]. Value of 0 will print on a single line.\n-   `JSON Stringify Functions`: Specifiy when to log function bodies. One of `NEVER`, `DEBUG ONLY`, `ALWAYS`.\n-   `Write Log Files`: Activate or deactivate copying logs to the local filesystem. Runs only when in player.\n-   `Log Files Directory`: Directory path to be appended to `Agtk.settings.projectPath` value. This must result in a valid, absolute path.\n    -   The primary log file is `current.log`; contents are rotated out to `yyyy-mm-dd-hh-ii-ss-uuu.log` files, where the date is the recorded batch start time.\n\n## Example Usage\n\n```js\n// Same behavior as original `Agtk.log` method (always logs).\nAgtk.log('Hello World!');\n\n// Prints JSON representation of objectInstance.\nAgtk.log(objectInstance);\n\n// Only log this object's JSON representation if plugin's log level is set to DEBUG.\nAgtk.log(someObject, 'Debug'); // 'Debug', 'Info', 'Warn', 'Error', 'Fatal'.\n\n// Only log if plugin's log level is set to DEBUG.\nAgtk.log.debug('debug message');\n\n// Only log if plugin's log level is set to INFO or lower.\nAgtk.log.info('info message');\n\n// Only log if plugin's log level is set to WARN or lower.\nAgtk.log.warn('warn message');\n\n// Only log if plugin's log level is set to ERROR or lower.\nAgtk.log.error('error message');\n\n// Always logs.\nAgtk.log.fatal('fatal message');\n```\n\n## Notes\n\n-   **Writing Files**: The `jsb.fileUtils` API provides limited filesystem access with unreliable performance when tasked with\n    multiple write requests to the same file within a short period of time.\n\n    To help mitigate this issue, a simple shared/exclusive lock system is utilized to queue file reads & writes.\n    Additional in memory buffering is performed to reduce write queues from building up too quickly.\n\n    Also, file append operations are not supported in the `jsb.fileUtils`; we can either read from an entire file or\n    create/overwrite a file. Thus, appending logs to a file is an expensive operation that increases with file size.\n    Frequent 'rotation' of log files is utilized to keep the target log file to a reasonable size.\n";

/***/ }),

/***/ "./src/locale/en/data.json":
/*!*********************************!*\
  !*** ./src/locale/en/data.json ***!
  \*********************************/
/***/ (function(module) {

module.exports = JSON.parse('{"PLUGIN_NAME":"Runtime Logger","PLUGIN_DESCRIPTION":"Extends the `Agtk.log` method.","PLUGIN_AUTHOR":"kidthales <kidthales@agogpixel.com>","PLUGIN_HELP":"See help.md","PARAMETER_LOG_LEVEL_NAME":"Log Level","PARAMETER_LOG_LEVEL_PARAM_DEBUG_NAME":"DEBUG","PARAMETER_LOG_LEVEL_PARAM_INFO_NAME":"INFO","PARAMETER_LOG_LEVEL_PARAM_WARN_NAME":"WARN","PARAMETER_LOG_LEVEL_PARAM_ERROR_NAME":"ERROR","PARAMETER_LOG_LEVEL_PARAM_FATAL_NAME":"FATAL","PARAMETER_JSON_INDENT_SIZE_NAME":"JSON Indent Size","PARAMETER_JSON_STRINGIFY_FUNCTIONS_NAME":"JSON Stringify Functions","PARAMETER_JSON_STRINGIFY_FUNCTIONS_PARAM_NEVER_NAME":"NEVER","PARAMETER_JSON_STRINGIFY_FUNCTIONS_PARAM_DEBUG_ONLY_NAME":"DEBUG ONLY","PARAMETER_JSON_STRINGIFY_FUNCTIONS_PARAM_ALWAYS_NAME":"ALWAYS","PARAMETER_WRITE_LOG_FILES_NAME":"Write Log Files","PARAMETER_WRITE_LOG_FILES_PARAM_OFF_NAME":"OFF","PARAMETER_WRITE_LOG_FILES_PARAM_ON_NAME":"ON","PARAMETER_LOG_FILES_DIRECTORY_NAME":"Log Files Directory","PARAMETER_LOG_FILES_DIRECTORY_DEFAULT_VALUE":"logs","LOG_LEVEL_DEBUG":"DEBUG","LOG_LEVEL_INFO":"INFO","LOG_LEVEL_WARN":"WARN","LOG_LEVEL_ERROR":"ERROR","LOG_LEVEL_FATAL":"FATAL"}');

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
/* IIFEReturnPlugin */ return function() {
var exports = __webpack_exports__;
/*!****************************!*\
  !*** ./src/pgmmv-entry.ts ***!
  \****************************/

Object.defineProperty(exports, "__esModule", ({ value: true }));
var create_runtime_logger_plugin_function_1 = __webpack_require__(/*! ./create-runtime-logger-plugin.function */ "./src/create-runtime-logger-plugin.function.ts");
var plugin = (0, create_runtime_logger_plugin_function_1.createRuntimeLoggerPlugin)();
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
return plugin;

}();
/******/ })()
;