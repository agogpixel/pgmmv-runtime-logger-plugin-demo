/**
 * Runtime Logger Plugin for Pixel Game Maker MV.
 * Copyright 2022 AgogPixel - All Rights Reserved.
 * Implemented by kidthales <kidthales@agogpixel.com>
 * Minified code released under CC BY-ND 4.0 license: https://creativecommons.org/licenses/by-nd/4.0/
 */
/******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/create-file-system-module.js":
/*!***********************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/create-file-system-module.js ***!
  \***********************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createFileSystemModule = void 0;
var locks_1 = __webpack_require__(/*! @agogpixel/pgmmv-resource-support/src/locks */ "./node_modules/@agogpixel/pgmmv-resource-support/src/locks/index.js");
var module_1 = __webpack_require__(/*! @agogpixel/pgmmv-resource-support/src/module */ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/index.js");
var string_1 = __webpack_require__(/*! @agogpixel/pgmmv-resource-support/src/string */ "./node_modules/@agogpixel/pgmmv-resource-support/src/string/index.js");
var time_1 = __webpack_require__(/*! @agogpixel/pgmmv-resource-support/src/time */ "./node_modules/@agogpixel/pgmmv-resource-support/src/time/index.js");
var operation_1 = __webpack_require__(/*! ./operation */ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/index.js");
/**
 *
 * @returns
 */
function createFileSystemModule() {
    /**
     *
     */
    var self = {};
    // Singleton.
    if ((0, module_1.hasModule)('fs')) {
        return (0, module_1.getModule)('fs');
    }
    else if (!(0, module_1.setModule)('fs', self)) {
        return undefined;
    }
    //////////////////////////////////////////////////////////////////////////////
    // Internal
    //////////////////////////////////////////////////////////////////////////////
    /**
     *
     */
    var operationQueues = {};
    /**
     *
     */
    var locksManagerInternal = {};
    /**
     *
     */
    var locksManager = (0, locks_1.createResourceLocksManager)(locksManagerInternal);
    /**
     *
     * @param operation
     */
    function enqueueOperation(operation) {
        var path = operation.type === operation_1.ExclusiveFileOperationType.Rename
            ? "".concat(operation.payload.dirPath, "/").concat(operation.payload.oldName)
            : operation.payload.path;
        if (!locksManager.hasLocks(path)) {
            locksManager.createLocks({ key: path, numSharedLocks: 2, exclusiveLock: true });
        }
        if (!operationQueues[path]) {
            operationQueues[path] = [];
        }
        operationQueues[path].push(operation);
    }
    /**
     *
     * @param path
     * @returns
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
     *
     * @param path
     * @returns
     */
    function peekOperationType(path) {
        if (!operationQueues[path] || !operationQueues[path].length) {
            return;
        }
        return operationQueues[path][0].type;
    }
    /**
     *
     * @returns
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
                case operation_1.ExclusiveFileOperationType.Append:
                case operation_1.ExclusiveFileOperationType.Remove:
                case operation_1.ExclusiveFileOperationType.Rename:
                case operation_1.ExclusiveFileOperationType.Write:
                case operation_1.ExclusiveFileOperationType.CreateDirectory:
                case operation_1.ExclusiveFileOperationType.RemoveDirectory:
                    releaseLock = locksManager.acquireExclusiveLock(path);
                    break;
                case operation_1.SharedFileOperationType.Read:
                case operation_1.SharedFileOperationType.ReadSize:
                    releaseLock = locksManager.acquireSharedLock(path);
                    break;
            }
            if (!releaseLock) {
                continue;
            }
            var operation = dequeueOperation(path);
            switch (operation.type) {
                case operation_1.ExclusiveFileOperationType.Write:
                    writeFileOperation(operation.payload, releaseLock);
                    break;
                case operation_1.ExclusiveFileOperationType.Append:
                    appendFileOperation(operation.payload, releaseLock);
                    break;
                case operation_1.ExclusiveFileOperationType.Rename:
                    renameFileOperation(operation.payload, releaseLock);
                    break;
                case operation_1.ExclusiveFileOperationType.Remove:
                    removeFileOperation(operation.payload, releaseLock);
                    break;
                case operation_1.ExclusiveFileOperationType.CreateDirectory:
                    createDirectoryOperation(operation.payload, releaseLock);
                    break;
                case operation_1.ExclusiveFileOperationType.RemoveDirectory:
                    removeDirectoryOperation(operation.payload, releaseLock);
                    break;
                case operation_1.SharedFileOperationType.Read:
                    readFileOperation(operation.payload, releaseLock);
                    break;
                case operation_1.SharedFileOperationType.ReadSize:
                    readSizeFileOperation(operation.payload, releaseLock);
                    break;
            }
        }
        return false;
    }
    /**
     *
     * @param payload
     * @param releaseLock
     * @returns
     */
    function writeFileOperation(payload, releaseLock) {
        var path = payload.path;
        var data = payload.data;
        var callback = payload.callback;
        var fileSize = jsb.fileUtils.getFileSize(path);
        var dataSize = (0, string_1.getStringByteLength)(data);
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
        (0, time_1.pollWithBackoff)(conditional, onProceed, onTimeout, 1000, 5);
    }
    /**
     *
     * @param payload
     * @param releaseLock
     * @returns
     */
    function appendFileOperation(payload, releaseLock) {
        var path = payload.path;
        var data = payload.data;
        var callback = payload.callback;
        var oldFileContent = jsb.fileUtils.getStringFromFile(path);
        var newFileContent = "".concat(oldFileContent ? oldFileContent + '\n' : '').concat(data);
        var newFileSize = (0, string_1.getStringByteLength)(newFileContent);
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
        (0, time_1.pollWithBackoff)(conditional, onProceed, onTimeout, 1000, 5);
    }
    /**
     *
     * @param payload
     * @param releaseLock
     * @returns
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
        (0, time_1.pollWithBackoff)(conditional, onProceed, onTimeout, 1000, 5);
    }
    /**
     *
     * @param payload
     * @param releaseLock
     * @returns
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
        (0, time_1.pollWithBackoff)(conditional, onProceed, onTimeout, 1000, 5);
    }
    /**
     *
     * @param payload
     * @param releaseLock
     * @returns
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
        (0, time_1.pollWithBackoff)(conditional, onProceed, onTimeout, 1000, 5);
    }
    /**
     *
     * @param payload
     * @param releaseLock
     * @returns
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
        (0, time_1.pollWithBackoff)(conditional, onProceed, onTimeout, 1000, 5);
    }
    /**
     *
     * @param payload
     * @param releaseLock
     * @returns
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
    /**
     *
     * @param payload
     * @param releaseLock
     * @returns
     */
    function readSizeFileOperation(payload, releaseLock) {
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
    //////////////////////////////////////////////////////////////////////////////
    // Public API
    //////////////////////////////////////////////////////////////////////////////
    /**
     *
     * @param path
     * @param callback
     * @returns
     */
    self.createDirectory = function createDirectory(path, callback) {
        enqueueOperation({
            type: operation_1.ExclusiveFileOperationType.CreateDirectory,
            payload: {
                path: path,
                callback: callback
            }
        });
        return self;
    };
    /**
     *
     * @param path
     * @returns
     */
    self.isAbsolutePath = function isAbsolutePath(path) {
        return jsb.fileUtils.isAbsolutePath(path);
    };
    /**
     *
     * @param path
     * @returns
     */
    self.isDirectory = function isDirectory(path) {
        return jsb.fileUtils.isDirectoryExist(path);
    };
    /**
     *
     * @param path
     * @returns
     */
    self.isFile = function isFile(path) {
        return jsb.fileUtils.isFileExist(path);
    };
    /**
     *
     * @param path
     * @param callback
     * @returns
     */
    self.removeDirectory = function removeDirectory(path, callback) {
        enqueueOperation({
            type: operation_1.ExclusiveFileOperationType.RemoveDirectory,
            payload: {
                path: path,
                callback: callback
            }
        });
        return self;
    };
    /**
     *
     * @param path
     * @param callback
     * @returns
     */
    self.removeFile = function removeFile(path, callback) {
        enqueueOperation({
            type: operation_1.ExclusiveFileOperationType.Remove,
            payload: {
                path: path,
                callback: callback
            }
        });
        return self;
    };
    /**
     *
     * @param dirPath
     * @param oldName
     * @param newName
     * @param callback
     * @returns
     */
    self.renameFile = function renameFile(dirPath, oldName, newName, callback) {
        enqueueOperation({
            type: operation_1.ExclusiveFileOperationType.Rename,
            payload: {
                dirPath: dirPath,
                oldName: oldName,
                newName: newName,
                callback: callback
            }
        });
        return self;
    };
    /**
     *
     * @param path
     * @param callback
     * @returns
     */
    self.readFile = function readFile(path, callback) {
        enqueueOperation({
            type: operation_1.SharedFileOperationType.Read,
            payload: {
                path: path,
                callback: callback
            }
        });
        return self;
    };
    /**
     *
     * @param path
     * @param callback
     * @returns
     */
    self.readFileSize = function readFileSize(path, callback) {
        enqueueOperation({
            type: operation_1.SharedFileOperationType.ReadSize,
            payload: {
                path: path,
                callback: callback
            }
        });
        return self;
    };
    /**
     *
     * @param dataStr
     * @param path
     * @param callback
     * @returns
     */
    self.writeFile = function writeFile(dataStr, path, callback) {
        enqueueOperation({
            type: operation_1.ExclusiveFileOperationType.Write,
            payload: {
                data: dataStr,
                path: path,
                callback: callback
            }
        });
        return self;
    };
    /**
     *
     * @param dataStr
     * @param path
     * @param callback
     * @returns
     */
    self.appendFile = function appendFile(dataStr, path, callback) {
        enqueueOperation({
            type: operation_1.ExclusiveFileOperationType.Append,
            payload: {
                data: dataStr,
                path: path,
                callback: callback
            }
        });
        return self;
    };
    // Poll indefinitely.
    (0, time_1.pollWithInterval)(pollOperationQueues, function () {
        return;
    }, function () {
        return;
    }, 500);
    return self;
}
exports.createFileSystemModule = createFileSystemModule;
//# sourceMappingURL=create-file-system-module.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/mixin-file-manager.js":
/*!****************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/mixin-file-manager.js ***!
  \****************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.mixinFileManager = void 0;
var create_file_system_module_1 = __webpack_require__(/*! ./create-file-system-module */ "./node_modules/@agogpixel/pgmmv-fs-support/src/create-file-system-module.js");
/**
 *
 * @param subject
 * @returns
 */
function mixinFileManager(subject) {
    /**
     *
     */
    var self = subject;
    /**
     *
     * @param path
     * @param callback
     * @returns
     */
    self.createDirectory = function createDirectory(path, callback) {
        var fs = (0, create_file_system_module_1.createFileSystemModule)();
        if (fs) {
            fs.createDirectory(path, callback);
        }
        else {
            callback(false, 'File system module not found');
        }
        return self;
    };
    /**
     *
     * @param path
     * @returns
     */
    self.isAbsolutePath = function isAbsolutePath(path) {
        var fs = (0, create_file_system_module_1.createFileSystemModule)();
        if (fs) {
            return fs.isAbsolutePath(path);
        }
        return false;
    };
    /**
     *
     * @param path
     * @returns
     */
    self.isDirectory = function isDirectory(path) {
        var fs = (0, create_file_system_module_1.createFileSystemModule)();
        if (fs) {
            return fs.isDirectory(path);
        }
        return false;
    };
    /**
     *
     * @param path
     * @returns
     */
    self.isFile = function isFile(path) {
        var fs = (0, create_file_system_module_1.createFileSystemModule)();
        if (fs) {
            return fs.isFile(path);
        }
        return false;
    };
    /**
     *
     * @param path
     * @param callback
     * @returns
     */
    self.removeDirectory = function removeDirectory(path, callback) {
        var fs = (0, create_file_system_module_1.createFileSystemModule)();
        if (fs) {
            fs.removeDirectory(path, callback);
        }
        else {
            callback(false, 'File system module not found');
        }
        return self;
    };
    /**
     *
     * @param path
     * @param callback
     * @returns
     */
    self.removeFile = function removeFile(path, callback) {
        var fs = (0, create_file_system_module_1.createFileSystemModule)();
        if (fs) {
            fs.removeFile(path, callback);
        }
        else {
            callback(false, 'File system module not found');
        }
        return self;
    };
    /**
     *
     * @param dirPath
     * @param oldName
     * @param newName
     * @param callback
     * @returns
     */
    self.renameFile = function renameFile(dirPath, oldName, newName, callback) {
        var fs = (0, create_file_system_module_1.createFileSystemModule)();
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
//# sourceMappingURL=mixin-file-manager.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/mixin-file-reader.js":
/*!***************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/mixin-file-reader.js ***!
  \***************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.mixinFileReader = void 0;
var create_file_system_module_1 = __webpack_require__(/*! ./create-file-system-module */ "./node_modules/@agogpixel/pgmmv-fs-support/src/create-file-system-module.js");
/**
 *
 * @param subject
 * @returns
 */
function mixinFileReader(subject) {
    /**
     *
     */
    var self = subject;
    /**
     *
     * @param path
     * @param callback
     * @returns
     */
    self.readFileSize = function readFileSize(path, callback) {
        var fs = (0, create_file_system_module_1.createFileSystemModule)();
        if (fs) {
            fs.readFileSize(path, callback);
        }
        else {
            callback(false, 'File system module not found');
        }
        return self;
    };
    /**
     *
     * @param path
     * @param callback
     * @returns
     */
    self.readFile = function readFile(path, callback) {
        var fs = (0, create_file_system_module_1.createFileSystemModule)();
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
//# sourceMappingURL=mixin-file-reader.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/mixin-file-writer.js":
/*!***************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/mixin-file-writer.js ***!
  \***************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.mixinFileWriter = void 0;
var create_file_system_module_1 = __webpack_require__(/*! ./create-file-system-module */ "./node_modules/@agogpixel/pgmmv-fs-support/src/create-file-system-module.js");
/**
 *
 * @param subject
 * @returns
 */
function mixinFileWriter(subject) {
    var self = subject;
    /**
     *
     * @param dataStr
     * @param path
     * @param callback
     * @returns
     */
    self.writeFile = function writeFile(dataStr, path, callback) {
        var fs = (0, create_file_system_module_1.createFileSystemModule)();
        if (fs) {
            fs.writeFile(dataStr, path, callback);
        }
        else {
            callback(false, 'File system module not found');
        }
        return self;
    };
    /**
     *
     * @param dataStr
     * @param path
     * @param callback
     * @returns
     */
    self.appendFile = function appendFile(dataStr, path, callback) {
        var fs = (0, create_file_system_module_1.createFileSystemModule)();
        if (fs) {
            fs.appendFile(dataStr, path, callback);
        }
        else {
            callback(false, 'File system module not found');
        }
        return self;
    };
    return self;
}
exports.mixinFileWriter = mixinFileWriter;
//# sourceMappingURL=mixin-file-writer.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/append-file-operation.js":
/*!*****************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/operation/append-file-operation.js ***!
  \*****************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=append-file-operation.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/append-file-payload.js":
/*!***************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/operation/append-file-payload.js ***!
  \***************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=append-file-payload.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/base-exclusive-operation.js":
/*!********************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/operation/base-exclusive-operation.js ***!
  \********************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=base-exclusive-operation.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/base-payload.js":
/*!********************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/operation/base-payload.js ***!
  \********************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=base-payload.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/base-shared-operation.js":
/*!*****************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/operation/base-shared-operation.js ***!
  \*****************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=base-shared-operation.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/callback.js":
/*!****************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/operation/callback.js ***!
  \****************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=callback.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/create-directory-operation.js":
/*!**********************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/operation/create-directory-operation.js ***!
  \**********************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=create-directory-operation.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/create-directory-payload.js":
/*!********************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/operation/create-directory-payload.js ***!
  \********************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=create-directory-payload.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/exclusive-operation.js":
/*!***************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/operation/exclusive-operation.js ***!
  \***************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=exclusive-operation.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/exclusive-payload.js":
/*!*************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/operation/exclusive-payload.js ***!
  \*************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=exclusive-payload.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/exclusive-type.js":
/*!**********************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/operation/exclusive-type.js ***!
  \**********************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ExclusiveFileOperationType = void 0;
/**
 *
 */
var ExclusiveFileOperationType;
(function (ExclusiveFileOperationType) {
    /**
     *
     */
    ExclusiveFileOperationType[ExclusiveFileOperationType["Write"] = 0] = "Write";
    /**
     *
     */
    ExclusiveFileOperationType[ExclusiveFileOperationType["Append"] = 1] = "Append";
    /**
     *
     */
    ExclusiveFileOperationType[ExclusiveFileOperationType["Rename"] = 2] = "Rename";
    /**
     *
     */
    ExclusiveFileOperationType[ExclusiveFileOperationType["Remove"] = 3] = "Remove";
    /**
     *
     */
    ExclusiveFileOperationType[ExclusiveFileOperationType["CreateDirectory"] = 4] = "CreateDirectory";
    /**
     *
     */
    ExclusiveFileOperationType[ExclusiveFileOperationType["RemoveDirectory"] = 5] = "RemoveDirectory";
})(ExclusiveFileOperationType = exports.ExclusiveFileOperationType || (exports.ExclusiveFileOperationType = {}));
//# sourceMappingURL=exclusive-type.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/index.js":
/*!*************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/operation/index.js ***!
  \*************************************************************************/
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
__exportStar(__webpack_require__(/*! ./append-file-operation */ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/append-file-operation.js"), exports);
__exportStar(__webpack_require__(/*! ./append-file-payload */ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/append-file-payload.js"), exports);
__exportStar(__webpack_require__(/*! ./base-exclusive-operation */ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/base-exclusive-operation.js"), exports);
__exportStar(__webpack_require__(/*! ./base-payload */ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/base-payload.js"), exports);
__exportStar(__webpack_require__(/*! ./base-shared-operation */ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/base-shared-operation.js"), exports);
__exportStar(__webpack_require__(/*! ./callback */ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/callback.js"), exports);
__exportStar(__webpack_require__(/*! ./create-directory-operation */ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/create-directory-operation.js"), exports);
__exportStar(__webpack_require__(/*! ./create-directory-payload */ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/create-directory-payload.js"), exports);
__exportStar(__webpack_require__(/*! ./exclusive-operation */ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/exclusive-operation.js"), exports);
__exportStar(__webpack_require__(/*! ./exclusive-payload */ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/exclusive-payload.js"), exports);
__exportStar(__webpack_require__(/*! ./exclusive-type */ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/exclusive-type.js"), exports);
__exportStar(__webpack_require__(/*! ./operation */ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/operation.js"), exports);
__exportStar(__webpack_require__(/*! ./read-file-operation */ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/read-file-operation.js"), exports);
__exportStar(__webpack_require__(/*! ./read-file-payload */ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/read-file-payload.js"), exports);
__exportStar(__webpack_require__(/*! ./read-size-file-operation */ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/read-size-file-operation.js"), exports);
__exportStar(__webpack_require__(/*! ./read-size-file-payload */ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/read-size-file-payload.js"), exports);
__exportStar(__webpack_require__(/*! ./remove-directory-operation */ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/remove-directory-operation.js"), exports);
__exportStar(__webpack_require__(/*! ./remove-directory-payload */ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/remove-directory-payload.js"), exports);
__exportStar(__webpack_require__(/*! ./remove-file-operation */ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/remove-file-operation.js"), exports);
__exportStar(__webpack_require__(/*! ./remove-file-payload */ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/remove-file-payload.js"), exports);
__exportStar(__webpack_require__(/*! ./rename-file-operation */ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/rename-file-operation.js"), exports);
__exportStar(__webpack_require__(/*! ./rename-file-payload */ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/rename-file-payload.js"), exports);
__exportStar(__webpack_require__(/*! ./shared-operation */ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/shared-operation.js"), exports);
__exportStar(__webpack_require__(/*! ./shared-payload */ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/shared-payload.js"), exports);
__exportStar(__webpack_require__(/*! ./shared-type */ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/shared-type.js"), exports);
__exportStar(__webpack_require__(/*! ./write-file-operation */ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/write-file-operation.js"), exports);
__exportStar(__webpack_require__(/*! ./write-file-payload */ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/write-file-payload.js"), exports);
//# sourceMappingURL=index.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/operation.js":
/*!*****************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/operation/operation.js ***!
  \*****************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=operation.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/read-file-operation.js":
/*!***************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/operation/read-file-operation.js ***!
  \***************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=read-file-operation.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/read-file-payload.js":
/*!*************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/operation/read-file-payload.js ***!
  \*************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=read-file-payload.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/read-size-file-operation.js":
/*!********************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/operation/read-size-file-operation.js ***!
  \********************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=read-size-file-operation.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/read-size-file-payload.js":
/*!******************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/operation/read-size-file-payload.js ***!
  \******************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=read-size-file-payload.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/remove-directory-operation.js":
/*!**********************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/operation/remove-directory-operation.js ***!
  \**********************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=remove-directory-operation.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/remove-directory-payload.js":
/*!********************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/operation/remove-directory-payload.js ***!
  \********************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=remove-directory-payload.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/remove-file-operation.js":
/*!*****************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/operation/remove-file-operation.js ***!
  \*****************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=remove-file-operation.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/remove-file-payload.js":
/*!***************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/operation/remove-file-payload.js ***!
  \***************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=remove-file-payload.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/rename-file-operation.js":
/*!*****************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/operation/rename-file-operation.js ***!
  \*****************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=rename-file-operation.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/rename-file-payload.js":
/*!***************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/operation/rename-file-payload.js ***!
  \***************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=rename-file-payload.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/shared-operation.js":
/*!************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/operation/shared-operation.js ***!
  \************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=shared-operation.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/shared-payload.js":
/*!**********************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/operation/shared-payload.js ***!
  \**********************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=shared-payload.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/shared-type.js":
/*!*******************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/operation/shared-type.js ***!
  \*******************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SharedFileOperationType = void 0;
/**
 *
 */
var SharedFileOperationType;
(function (SharedFileOperationType) {
    /**
     *
     */
    SharedFileOperationType[SharedFileOperationType["Read"] = 10] = "Read";
    /**
     *
     */
    SharedFileOperationType[SharedFileOperationType["ReadSize"] = 11] = "ReadSize";
})(SharedFileOperationType = exports.SharedFileOperationType || (exports.SharedFileOperationType = {}));
//# sourceMappingURL=shared-type.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/write-file-operation.js":
/*!****************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/operation/write-file-operation.js ***!
  \****************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=write-file-operation.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-fs-support/src/operation/write-file-payload.js":
/*!**************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-fs-support/src/operation/write-file-payload.js ***!
  \**************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=write-file-payload.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-logging-support/src/create-logger.js":
/*!****************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-logging-support/src/create-logger.js ***!
  \****************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createLogger = void 0;
var get_unix_timestamp_1 = __webpack_require__(/*! @agogpixel/pgmmv-resource-support/src/time/get-unix-timestamp */ "./node_modules/@agogpixel/pgmmv-resource-support/src/time/get-unix-timestamp.js");
var to_json_1 = __webpack_require__(/*! @agogpixel/pgmmv-resource-support/src/json/to-json */ "./node_modules/@agogpixel/pgmmv-resource-support/src/json/to-json.js");
var log_level_1 = __webpack_require__(/*! ./log-level */ "./node_modules/@agogpixel/pgmmv-logging-support/src/log-level.js");
/**
 *
 */
var defaultJsonIndentSize = 2;
/**
 *
 */
var defaultJsonStringifyFunctions = false;
/**
 *
 */
var jsonIndentSizeMin = 0;
/**
 *
 */
var jsonIndentSizeMax = 8;
/**
 *
 * @param config
 * @param internal
 * @returns
 */
function createLogger(config, internal) {
    var _a;
    /**
     *
     */
    var self = {};
    /**
     *
     */
    var internalApi = internal || {};
    /**
     *
     * @param value
     * @param min
     * @param max
     * @returns
     */
    function clamp(value, min, max) {
        if (value < min) {
            return min;
        }
        if (value > max) {
            return max;
        }
        return value;
    }
    /**
     *
     */
    internalApi.logLevel = config.logLevel || log_level_1.LogLevel.Info;
    /**
     *
     */
    internalApi.runtimeLog = config.runtimeLog || Agtk.log;
    /**
     *
     */
    internalApi.jsonIndentSize =
        typeof config.jsonIndentSize !== 'number'
            ? defaultJsonIndentSize
            : clamp(config.jsonIndentSize, jsonIndentSizeMin, jsonIndentSizeMax);
    /**
     *
     */
    internalApi.jsonStringifyFunctions = !!config.jsonStringifyFunctions || defaultJsonStringifyFunctions;
    /**
     *
     */
    internalApi.logLevelMap = config.logLevelMap || (_a = {},
        _a[log_level_1.LogLevel.Debug] = log_level_1.LogLevel[log_level_1.LogLevel.Debug],
        _a[log_level_1.LogLevel.Info] = log_level_1.LogLevel[log_level_1.LogLevel.Info],
        _a[log_level_1.LogLevel.Warn] = log_level_1.LogLevel[log_level_1.LogLevel.Warn],
        _a[log_level_1.LogLevel.Error] = log_level_1.LogLevel[log_level_1.LogLevel.Error],
        _a[log_level_1.LogLevel.Fatal] = log_level_1.LogLevel[log_level_1.LogLevel.Fatal],
        _a);
    /**
     *
     * @param data
     * @param level
     */
    self.log = function log(data, level) {
        if (typeof level !== 'string' && typeof level !== 'number') {
            internalApi.runtimeLog(typeof data === 'string'
                ? data
                : (0, to_json_1.toJson)(data, internalApi.jsonIndentSize, internalApi.jsonStringifyFunctions));
            return;
        }
        var logLevel = typeof level === 'string' ? log_level_1.LogLevel[level] : level;
        if (logLevel < internalApi.logLevel) {
            return;
        }
        var message = typeof data === 'string' ? data : (0, to_json_1.toJson)(data, internalApi.jsonIndentSize, internalApi.jsonStringifyFunctions);
        var messageLog = "[".concat((0, get_unix_timestamp_1.getUnixTimestamp)(), "] ").concat(internalApi.logLevelMap[logLevel], ": ").concat(message);
        internalApi.runtimeLog(messageLog);
    };
    /**
     *
     * @param data
     */
    self.debug = function debug(data) {
        self.log(data, log_level_1.LogLevel.Debug);
    };
    /**
     *
     * @param data
     */
    self.info = function info(data) {
        self.log(data, log_level_1.LogLevel.Info);
    };
    /**
     *
     * @param data
     */
    self.warn = function warn(data) {
        self.log(data, log_level_1.LogLevel.Warn);
    };
    /**
     *
     * @param data
     */
    self.error = function error(data) {
        self.log(data, log_level_1.LogLevel.Error);
    };
    /**
     *
     * @param data
     */
    self.fatal = function fatal(data) {
        self.log(data, log_level_1.LogLevel.Fatal);
    };
    /**
     *
     */
    self.getLogLevel = function getLogLevel() {
        return internalApi.logLevel;
    };
    /**
     *
     * @param level
     */
    self.setLogLevel = function setLogLevel(level) {
        internalApi.logLevel = level;
        return self;
    };
    /**
     *
     */
    self.getRuntimeLog = function getRuntimeLog() {
        return internalApi.runtimeLog;
    };
    /**
     *
     * @param log
     */
    self.setRuntimeLog = function setRuntimeLog(log) {
        internalApi.runtimeLog = log;
        return self;
    };
    /**
     *
     */
    self.getJsonIndentSize = function getJsonIndentSize() {
        return internalApi.jsonIndentSize;
    };
    /**
     *
     * @param size
     */
    self.setJsonIndentSize = function setJsonIndentSize(size) {
        internalApi.jsonIndentSize = clamp(size, jsonIndentSizeMin, jsonIndentSizeMax);
        return self;
    };
    /**
     *
     */
    self.getJsonStringifyFunctions = function getJsonStringifyFunctions() {
        return internalApi.jsonStringifyFunctions;
    };
    /**
     *
     * @param stringify
     */
    self.setJsonStringifyFunctions = function setJsonStringifyFunctions(stringify) {
        internalApi.jsonStringifyFunctions = stringify;
        return self;
    };
    /**
     *
     */
    self.getLogLevelMap = function getLogLevelMap() {
        return internalApi.logLevelMap;
    };
    /**
     *
     * @param map
     */
    self.setLogLevelMap = function setLogLevelMap(map) {
        internalApi.logLevelMap = map;
        return self;
    };
    return self;
}
exports.createLogger = createLogger;
//# sourceMappingURL=create-logger.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-logging-support/src/log-level.js":
/*!************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-logging-support/src/log-level.js ***!
  \************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LogLevel = void 0;
/**
 *
 */
var LogLevel;
(function (LogLevel) {
    /**
     *
     */
    LogLevel[LogLevel["Debug"] = 0] = "Debug";
    /**
     *
     */
    LogLevel[LogLevel["Info"] = 1] = "Info";
    /**
     *
     */
    LogLevel[LogLevel["Warn"] = 2] = "Warn";
    /**
     *
     */
    LogLevel[LogLevel["Error"] = 3] = "Error";
    /**
     *
     */
    LogLevel[LogLevel["Fatal"] = 4] = "Fatal";
})(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
//# sourceMappingURL=log-level.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-plugin-support/src/create-plugin.js":
/*!***************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-plugin-support/src/create-plugin.js ***!
  \***************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createPlugin = void 0;
var plugin_1 = __webpack_require__(/*! @agogpixel/pgmmv-ts/api/agtk/plugin */ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/index.js");
var localization_1 = __webpack_require__(/*! ./localization */ "./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/index.js");
/**
 *
 * @param config
 * @param internal
 * @returns
 */
function createPlugin(config, internal) {
    /**
     *
     */
    var self = {};
    /**
     *
     */
    var internalApi = internal || {};
    /**
     *
     */
    var parametersConfig = config.parameters || [];
    /**
     *
     */
    var actionCommandsConfig = config.actionCommands || [];
    /**
     *
     */
    var autoTilesConfig = config.autoTiles || undefined;
    /**
     *
     */
    var linkConditionsConfig = config.linkConditions || [];
    /**
     *
     */
    var localizedParameters;
    /**
     *
     */
    var localizedActionCommands;
    /**
     *
     */
    var localizedLinkConditions;
    /**
     *
     */
    internalApi.internalData = {};
    /**
     *
     */
    internalApi.localization = (0, localization_1.createPluginLocalizationManager)({ localizations: config.localizations });
    /**
     *
     * @returns
     */
    internalApi.getInfoParameter = function getInfoParameter() {
        if (!localizedParameters) {
            localizedParameters = internalApi.localization.processParameterLocale(parametersConfig);
        }
        return localizedParameters;
    };
    /**
     *
     * @returns
     */
    internalApi.getInfoInternal = function getInfoInternal() {
        return JSON.parse(JSON.stringify(internalApi.internalData));
    };
    /**
     *
     * @returns
     */
    internalApi.getInfoActionCommand = function getInfoActionCommand() {
        if (!localizedActionCommands) {
            localizedActionCommands = internalApi.localization.processExecuteCommandLocale(actionCommandsConfig);
        }
        return localizedActionCommands;
    };
    /**
     *
     * @returns
     */
    internalApi.getInfoLinkCondition = function getInfoLinkCondition() {
        if (!localizedLinkConditions) {
            localizedLinkConditions = internalApi.localization.processLinkConditionLocale(linkConditionsConfig);
        }
        return localizedLinkConditions;
    };
    /**
     *
     * @returns
     */
    internalApi.getInfoAutoTile = function getInfoAutoTile() {
        return autoTilesConfig;
    };
    /**
     *
     * @returns
     */
    internalApi.inEditor = function inEditor() {
        return !Agtk || typeof Agtk.log !== 'function';
    };
    /**
     *
     * @returns
     */
    internalApi.inPlayer = function inPlayer() {
        return Agtk && typeof Agtk.version === 'string' && /^player .+$/.test(Agtk.version);
    };
    /**
     *
     * @param arg1
     */
    self.setLocale = function setLocale(arg1) {
        internalApi.localization.setLocale(arg1);
    };
    /**
     *
     * @param category
     * @returns
     */
    self.getInfo = function getInfo(category) {
        var info;
        switch (category) {
            case plugin_1.AgtkPluginInfoCategory.Name:
                info = internalApi.localization.get(localization_1.PluginLocalizationRequiredKey.Name);
                break;
            case plugin_1.AgtkPluginInfoCategory.Description:
                info = internalApi.localization.get(localization_1.PluginLocalizationRequiredKey.Description);
                break;
            case plugin_1.AgtkPluginInfoCategory.Author:
                info = internalApi.localization.get(localization_1.PluginLocalizationRequiredKey.Author);
                break;
            case plugin_1.AgtkPluginInfoCategory.Help:
                info = internalApi.localization.get(localization_1.PluginLocalizationRequiredKey.Help);
                break;
            case plugin_1.AgtkPluginInfoCategory.Parameter:
                info = internalApi.getInfoParameter();
                break;
            case plugin_1.AgtkPluginInfoCategory.Internal:
                info = internalApi.getInfoInternal();
                break;
            case plugin_1.AgtkPluginInfoCategory.ActionCommand:
                info = internalApi.getInfoActionCommand();
                break;
            case plugin_1.AgtkPluginInfoCategory.LinkCondition:
                info = internalApi.getInfoLinkCondition();
                break;
            case plugin_1.AgtkPluginInfoCategory.AutoTile:
                info = internalApi.getInfoAutoTile();
                break;
        }
        return info;
    };
    /**
     *
     * @param data
     */
    self.initialize = function initialize(data) {
        if (data) {
            self.setInternal(data);
        }
    };
    /**
     *
     * @returns
     */
    self.finalize = function finalize() {
        return;
    };
    /**
     *
     * @returns
     */
    self.setParamValue = function setParamValue() {
        return;
    };
    /**
     *
     * @param data
     */
    self.setInternal = function setInternal(data) {
        internalApi.internalData = JSON.parse(JSON.stringify(data)) || internalApi.internalData;
    };
    /**
     *
     * @returns
     */
    self.call = function call() {
        return;
    };
    return self;
}
exports.createPlugin = createPlugin;
//# sourceMappingURL=create-plugin.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/create-manager.js":
/*!*****************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/create-manager.js ***!
  \*****************************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createPluginLocalizationManager = void 0;
var plugin_ui_parameter_type_1 = __webpack_require__(/*! @agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-parameter-type */ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-parameter-type.js");
/**
 *
 * @param config
 * @returns
 */
function createPluginLocalizationManager(config) {
    /**
     *
     */
    var self = {};
    // Resolve configuration.
    var localizations = config.localizations && config.localizations.length > 0
        ? config.localizations
        : [{ locale: 'en', data: {} }];
    /**
     *
     */
    var fallbackData = localizations[0].data;
    /**
     *
     */
    var currentLocale = localizations[0].locale;
    /**
     *
     */
    var localeMap = {};
    // Load locale map.
    for (var i = 0; i < localizations.length; ++i) {
        localeMap[localizations[i].locale] = localizations[i].data;
    }
    /**
     *
     */
    var inlineRegex = /^loca\((.+)\)$/;
    /**
     *
     * @param key
     * @returns
     */
    self.get = function get(key) {
        if (localeMap[currentLocale] && typeof localeMap[currentLocale][key] === 'string') {
            return localeMap[currentLocale][key];
        }
        if (typeof fallbackData[key] === 'string') {
            return fallbackData[key];
        }
        return "LOCA MISSING: ".concat(key);
    };
    /**
     *
     * @returns
     */
    self.getLocale = function getLocale() {
        return currentLocale;
    };
    /**
     *
     * @param locale
     * @returns
     */
    self.setLocale = function setLocale(locale) {
        if (!!localeMap[locale]) {
            return false;
        }
        currentLocale = locale;
        return true;
    };
    /**
     *
     * @param parameters
     * @returns
     */
    self.processParameterLocale = function processParameterLocale(parameters) {
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
    /**
     *
     * @param executeCommands
     * @returns
     */
    self.processExecuteCommandLocale = function processExecuteCommandLocale(executeCommands) {
        for (var i = 0; i < executeCommands.length; ++i) {
            var executeCommand = executeCommands[i];
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
        return executeCommands;
    };
    /**
     *
     * @param linkConditions
     * @returns
     */
    self.processLinkConditionLocale = function processLinkConditionLocale(linkConditions) {
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
//# sourceMappingURL=create-manager.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/data.js":
/*!*******************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/data.js ***!
  \*******************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
var required_key_1 = __webpack_require__(/*! ./required-key */ "./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/required-key.js");
//# sourceMappingURL=data.js.map

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
__exportStar(__webpack_require__(/*! ./create-manager */ "./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/create-manager.js"), exports);
__exportStar(__webpack_require__(/*! ./localization */ "./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/localization.js"), exports);
__exportStar(__webpack_require__(/*! ./data */ "./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/data.js"), exports);
__exportStar(__webpack_require__(/*! ./manager */ "./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/manager.js"), exports);
__exportStar(__webpack_require__(/*! ./manager-config */ "./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/manager-config.js"), exports);
__exportStar(__webpack_require__(/*! ./required-key */ "./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/required-key.js"), exports);
//# sourceMappingURL=index.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/localization.js":
/*!***************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/localization.js ***!
  \***************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=localization.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/manager-config.js":
/*!*****************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/manager-config.js ***!
  \*****************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=manager-config.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/manager.js":
/*!**********************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/manager.js ***!
  \**********************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=manager.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/required-key.js":
/*!***************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-plugin-support/src/localization/required-key.js ***!
  \***************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PluginLocalizationRequiredKey = void 0;
/**
 *
 */
var PluginLocalizationRequiredKey;
(function (PluginLocalizationRequiredKey) {
    /**
     *
     */
    PluginLocalizationRequiredKey["Name"] = "PLUGIN_NAME";
    /**
     *
     */
    PluginLocalizationRequiredKey["Description"] = "PLUGIN_DESCRIPTION";
    /**
     *
     */
    PluginLocalizationRequiredKey["Author"] = "PLUGIN_AUTHOR";
    /**
     *
     */
    PluginLocalizationRequiredKey["Help"] = "PLUGIN_HELP";
})(PluginLocalizationRequiredKey = exports.PluginLocalizationRequiredKey || (exports.PluginLocalizationRequiredKey = {}));
//# sourceMappingURL=required-key.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-resource-support/src/json/to-json.js":
/*!****************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-resource-support/src/json/to-json.js ***!
  \****************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.toJson = void 0;
/**
 *
 * @param value
 * @returns
 */
function isArray(value) {
    return Array.isArray(value) && typeof value === 'object';
}
/**
 *
 * @param value
 * @returns
 */
function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/**
 *
 * @param value
 * @returns
 */
function isString(value) {
    return typeof value === 'string';
}
/**
 *
 * @param value
 * @returns
 */
function isBoolean(value) {
    return typeof value === 'boolean';
}
/**
 *
 * @param value
 * @returns
 */
function isNumber(value) {
    return typeof value === 'number';
}
/**
 *
 * @param value
 * @returns
 */
function isNull(value) {
    return value === null && typeof value === 'object';
}
/**
 *
 * @param value
 * @returns
 */
function isNotNumber(value) {
    return typeof value === 'number' && isNaN(value);
}
/**
 *
 * @param value
 * @returns
 */
function isInfinity(value) {
    return typeof value === 'number' && !isFinite(value);
}
/**
 *
 * @param value
 * @returns
 */
function isDate(value) {
    return typeof value === 'object' && value !== null && typeof value.getMonth === 'function';
}
/**
 *
 * @param value
 * @returns
 */
function isUndefined(value) {
    return value === undefined && typeof value === 'undefined';
}
/**
 *
 * @param value
 * @returns
 */
function isFunction(value) {
    return typeof value === 'function';
}
/**
 *
 * @param value
 * @returns
 */
function isSymbol(value) {
    return typeof value === 'symbol';
}
/**
 *
 * @param value
 * @returns
 */
function restOfDataTypes(value) {
    return isNumber(value) || isString(value) || isBoolean(value);
}
/**
 *
 * @param value
 * @returns
 */
function ignoreDataTypes(value) {
    return isUndefined(value) || isSymbol(value);
}
/**
 *
 * @param value
 * @returns
 */
function nullDataTypes(value) {
    return isNotNumber(value) || isInfinity(value) || isNull(value);
}
/**
 *
 * @param value
 * @returns
 */
function arrayValuesNullTypes(value) {
    return isNotNumber(value) || isInfinity(value) || isNull(value) || ignoreDataTypes(value);
}
/**
 *
 * @param str
 * @param newline
 * @returns
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
/**
 *
 * @param value
 * @param space
 * @param stringifyFunctions
 * @returns
 */
function toJson(value, space, stringifyFunctions) {
    var seen = [];
    var indentSize = typeof space === 'number' && space >= 0 ? space : 2;
    function parse(obj, indent) {
        var _a;
        if (ignoreDataTypes(obj)) {
            return undefined;
        }
        if (isDate(obj)) {
            return "\"".concat(obj.toISOString(), "\"");
        }
        if (nullDataTypes(obj)) {
            return "".concat(null);
        }
        if (isSymbol(obj)) {
            return undefined;
        }
        if (isFunction(obj)) {
            if (stringifyFunctions) {
                var fnParts = (_a = (isFunction(obj === null || obj === void 0 ? void 0 : obj.toString) ? obj === null || obj === void 0 ? void 0 : obj.toString() : 'function')) === null || _a === void 0 ? void 0 : _a.split('\n');
                return fnParts === null || fnParts === void 0 ? void 0 : fnParts.join("".concat(!indentSize ? '' : '\n' + ' '.repeat(indentSize)));
            }
            return undefined;
        }
        if (restOfDataTypes(obj)) {
            var passQuotes = isString(obj) ? "\"" : '';
            return "".concat(passQuotes).concat(obj).concat(passQuotes);
        }
        if (isArray(obj) || isObject(obj)) {
            if (seen.indexOf(obj) >= 0) {
                return "[seen ".concat(isArray(obj) ? 'array' : 'object', "]");
            }
            seen.push(obj);
        }
        if (isArray(obj)) {
            var arrStr_1 = '';
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
//# sourceMappingURL=to-json.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-resource-support/src/locks/create-manager.js":
/*!************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-resource-support/src/locks/create-manager.js ***!
  \************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createResourceLocksManager = void 0;
/**
 *
 * @param internal
 * @returns
 */
function createResourceLocksManager(internal) {
    /**
     *
     */
    var self = {};
    /**
     *
     */
    var internalApi = internal || {};
    /**
     *
     */
    internalApi.vault = {};
    /**
     *
     * @param key
     * @returns
     */
    self.acquireExclusiveLock = function acquireExclusiveLock(key) {
        if (!self.hasLocks(key)) {
            return;
        }
        var locks = internalApi.vault[key];
        if (locks.currentSharedLocksCount > 0 || locks.currentExclusiveLockCount >= locks.maxExclusiveLockCount) {
            return;
        }
        ++locks.currentExclusiveLockCount;
        return function releaseExclusiveLock() {
            --locks.currentExclusiveLockCount;
        };
    };
    /**
     *
     * @param key
     * @returns
     */
    self.acquireSharedLock = function acquireSharedLock(key) {
        if (!self.hasLocks(key)) {
            return;
        }
        var locks = internalApi.vault[key];
        if (locks.currentExclusiveLockCount >= locks.maxExclusiveLockCount ||
            locks.currentSharedLocksCount >= locks.maxSharedLocksCount) {
            return;
        }
        ++locks.currentSharedLocksCount;
        return function releaseSharedLock() {
            --locks.currentSharedLocksCount;
        };
    };
    /**
     *
     * @param config
     * @returns
     */
    self.createLocks = function createLocks(config) {
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
    /**
     *
     * @param key
     */
    self.destroyLocks = function destroyLocks(key) {
        delete internalApi.vault[key];
    };
    /**
     *
     * @param key
     * @returns
     */
    self.hasLocks = function hasLocks(key) {
        return !!internalApi.vault[key];
    };
    return self;
}
exports.createResourceLocksManager = createResourceLocksManager;
//# sourceMappingURL=create-manager.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-resource-support/src/locks/index.js":
/*!***************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-resource-support/src/locks/index.js ***!
  \***************************************************************************/
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
__exportStar(__webpack_require__(/*! ./create-manager */ "./node_modules/@agogpixel/pgmmv-resource-support/src/locks/create-manager.js"), exports);
__exportStar(__webpack_require__(/*! ./locks */ "./node_modules/@agogpixel/pgmmv-resource-support/src/locks/locks.js"), exports);
__exportStar(__webpack_require__(/*! ./locks-config */ "./node_modules/@agogpixel/pgmmv-resource-support/src/locks/locks-config.js"), exports);
__exportStar(__webpack_require__(/*! ./manager */ "./node_modules/@agogpixel/pgmmv-resource-support/src/locks/manager.js"), exports);
__exportStar(__webpack_require__(/*! ./manager-protected-api */ "./node_modules/@agogpixel/pgmmv-resource-support/src/locks/manager-protected-api.js"), exports);
__exportStar(__webpack_require__(/*! ./release-lock */ "./node_modules/@agogpixel/pgmmv-resource-support/src/locks/release-lock.js"), exports);
//# sourceMappingURL=index.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-resource-support/src/locks/locks-config.js":
/*!**********************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-resource-support/src/locks/locks-config.js ***!
  \**********************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=locks-config.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-resource-support/src/locks/locks.js":
/*!***************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-resource-support/src/locks/locks.js ***!
  \***************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=locks.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-resource-support/src/locks/manager-protected-api.js":
/*!*******************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-resource-support/src/locks/manager-protected-api.js ***!
  \*******************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=manager-protected-api.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-resource-support/src/locks/manager.js":
/*!*****************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-resource-support/src/locks/manager.js ***!
  \*****************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=manager.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-resource-support/src/locks/release-lock.js":
/*!**********************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-resource-support/src/locks/release-lock.js ***!
  \**********************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=release-lock.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/boot.js":
/*!***************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-resource-support/src/module/boot.js ***!
  \***************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.boot = void 0;
var root_module_name_1 = __webpack_require__(/*! ./root-module-name */ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/root-module-name.js");
var is_booted_1 = __webpack_require__(/*! ./is-booted */ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/is-booted.js");
/**
 *
 * @returns
 */
function boot() {
    if ((0, is_booted_1.isBooted)()) {
        return true;
    }
    if (!window) {
        return false;
    }
    window[root_module_name_1.rootModuleName] = {};
    return true;
}
exports.boot = boot;
//# sourceMappingURL=boot.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/get-module.js":
/*!*********************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-resource-support/src/module/get-module.js ***!
  \*********************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getModule = void 0;
var has_module_1 = __webpack_require__(/*! ./has-module */ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/has-module.js");
var root_module_name_1 = __webpack_require__(/*! ./root-module-name */ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/root-module-name.js");
/**
 *
 * @param key
 * @returns
 */
function getModule(key) {
    if (!(0, has_module_1.hasModule)(key)) {
        return;
    }
    return window[root_module_name_1.rootModuleName][key];
}
exports.getModule = getModule;
//# sourceMappingURL=get-module.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/has-module.js":
/*!*********************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-resource-support/src/module/has-module.js ***!
  \*********************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.hasModule = void 0;
var is_booted_1 = __webpack_require__(/*! ./is-booted */ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/is-booted.js");
var root_module_name_1 = __webpack_require__(/*! ./root-module-name */ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/root-module-name.js");
/**
 *
 * @param key
 * @returns
 */
function hasModule(key) {
    return (0, is_booted_1.isBooted)() && !!window[root_module_name_1.rootModuleName][key];
}
exports.hasModule = hasModule;
//# sourceMappingURL=has-module.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/index.js":
/*!****************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-resource-support/src/module/index.js ***!
  \****************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.setModule = exports.hasModule = exports.getModule = void 0;
var get_module_1 = __webpack_require__(/*! ./get-module */ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/get-module.js");
Object.defineProperty(exports, "getModule", ({ enumerable: true, get: function () { return get_module_1.getModule; } }));
var has_module_1 = __webpack_require__(/*! ./has-module */ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/has-module.js");
Object.defineProperty(exports, "hasModule", ({ enumerable: true, get: function () { return has_module_1.hasModule; } }));
var set_module_1 = __webpack_require__(/*! ./set-module */ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/set-module.js");
Object.defineProperty(exports, "setModule", ({ enumerable: true, get: function () { return set_module_1.setModule; } }));
//# sourceMappingURL=index.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/is-booted.js":
/*!********************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-resource-support/src/module/is-booted.js ***!
  \********************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isBooted = void 0;
var root_module_name_1 = __webpack_require__(/*! ./root-module-name */ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/root-module-name.js");
/**
 *
 * @returns
 */
function isBooted() {
    return !!(window && window[root_module_name_1.rootModuleName]);
}
exports.isBooted = isBooted;
//# sourceMappingURL=is-booted.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/root-module-name.js":
/*!***************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-resource-support/src/module/root-module-name.js ***!
  \***************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.rootModuleName = void 0;
/**
 *
 */
exports.rootModuleName = "Agog" || 0;
//# sourceMappingURL=root-module-name.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/set-module.js":
/*!*********************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-resource-support/src/module/set-module.js ***!
  \*********************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.setModule = void 0;
var boot_1 = __webpack_require__(/*! ./boot */ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/boot.js");
var is_booted_1 = __webpack_require__(/*! ./is-booted */ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/is-booted.js");
var root_module_name_1 = __webpack_require__(/*! ./root-module-name */ "./node_modules/@agogpixel/pgmmv-resource-support/src/module/root-module-name.js");
/**
 *
 * @param key
 * @param module
 * @returns
 */
function setModule(key, module) {
    if (!(0, is_booted_1.isBooted)()) {
        if (!(0, boot_1.boot)()) {
            return false;
        }
    }
    window[root_module_name_1.rootModuleName][key] = module;
    return true;
}
exports.setModule = setModule;
//# sourceMappingURL=set-module.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-resource-support/src/string/get-string-byte-length.js":
/*!*********************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-resource-support/src/string/get-string-byte-length.js ***!
  \*********************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getStringByteLength = void 0;
/**
 *
 * @param str
 * @returns
 */
function getStringByteLength(str) {
    // returns the byte length of an utf8 string
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
            i--; //trail surrogate
        }
    }
    return s;
}
exports.getStringByteLength = getStringByteLength;
//# sourceMappingURL=get-string-byte-length.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-resource-support/src/string/index.js":
/*!****************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-resource-support/src/string/index.js ***!
  \****************************************************************************/
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
__exportStar(__webpack_require__(/*! ./get-string-byte-length */ "./node_modules/@agogpixel/pgmmv-resource-support/src/string/get-string-byte-length.js"), exports);
//# sourceMappingURL=index.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-resource-support/src/time/get-unix-timestamp.js":
/*!***************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-resource-support/src/time/get-unix-timestamp.js ***!
  \***************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getUnixTimestamp = void 0;
/**
 *
 * @returns
 */
function getUnixTimestamp() {
    return Math.round(+new Date() / 1000);
}
exports.getUnixTimestamp = getUnixTimestamp;
//# sourceMappingURL=get-unix-timestamp.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-resource-support/src/time/index.js":
/*!**************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-resource-support/src/time/index.js ***!
  \**************************************************************************/
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
__exportStar(__webpack_require__(/*! ./get-unix-timestamp */ "./node_modules/@agogpixel/pgmmv-resource-support/src/time/get-unix-timestamp.js"), exports);
__exportStar(__webpack_require__(/*! ./poll-with-backoff */ "./node_modules/@agogpixel/pgmmv-resource-support/src/time/poll-with-backoff.js"), exports);
__exportStar(__webpack_require__(/*! ./poll-with-interval */ "./node_modules/@agogpixel/pgmmv-resource-support/src/time/poll-with-interval.js"), exports);
//# sourceMappingURL=index.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-resource-support/src/time/poll-with-backoff.js":
/*!**************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-resource-support/src/time/poll-with-backoff.js ***!
  \**************************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.pollWithBackoff = void 0;
var get_unix_timestamp_1 = __webpack_require__(/*! ./get-unix-timestamp */ "./node_modules/@agogpixel/pgmmv-resource-support/src/time/get-unix-timestamp.js");
/**
 *
 * @param conditional
 * @param onProceed
 * @param onTimeout
 * @param initialInterval
 * @param retries
 */
function pollWithBackoff(conditional, onProceed, onTimeout, initialInterval, retries) {
    initialInterval <= 0 ? 1000 : initialInterval;
    var maxRetries = typeof retries !== 'number' || retries <= 0 ? 3 : retries;
    var startTime = (0, get_unix_timestamp_1.getUnixTimestamp)();
    var elapsedTime = 0;
    var numRetries = 0;
    function poll() {
        elapsedTime += (0, get_unix_timestamp_1.getUnixTimestamp)() - startTime;
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
//# sourceMappingURL=poll-with-backoff.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-resource-support/src/time/poll-with-interval.js":
/*!***************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-resource-support/src/time/poll-with-interval.js ***!
  \***************************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.pollWithInterval = void 0;
var get_unix_timestamp_1 = __webpack_require__(/*! ./get-unix-timestamp */ "./node_modules/@agogpixel/pgmmv-resource-support/src/time/get-unix-timestamp.js");
/**
 *
 * @param conditional
 * @param onProceed
 * @param onTimeout
 * @param interval
 * @param timeout
 */
function pollWithInterval(conditional, onProceed, onTimeout, interval, timeout) {
    interval = interval <= 0 ? 1000 : interval;
    timeout = typeof timeout !== 'number' || timeout < 0 ? 0 : timeout;
    var startTime = (0, get_unix_timestamp_1.getUnixTimestamp)();
    var elapsedTime = 0;
    function poll() {
        elapsedTime += (0, get_unix_timestamp_1.getUnixTimestamp)() - startTime;
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
//# sourceMappingURL=poll-with-interval.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/action-command-plugin.js":
/*!***********************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/action-command-plugin.js ***!
  \***********************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=action-command-plugin.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/auto-tile-plugin.js":
/*!******************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/auto-tile-plugin.js ***!
  \******************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=auto-tile-plugin.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/index.js":
/*!*******************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/index.js ***!
  \*******************************************************************/
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
__exportStar(__webpack_require__(/*! ./action-command-plugin */ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/action-command-plugin.js"), exports);
__exportStar(__webpack_require__(/*! ./auto-tile-plugin */ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/auto-tile-plugin.js"), exports);
__exportStar(__webpack_require__(/*! ./link-condition-plugin */ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/link-condition-plugin.js"), exports);
__exportStar(__webpack_require__(/*! ./plugin */ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin.js"), exports);
__exportStar(__webpack_require__(/*! ./plugin-action-command */ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-action-command.js"), exports);
__exportStar(__webpack_require__(/*! ./plugin-auto-tile-parameters */ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-auto-tile-parameters.js"), exports);
__exportStar(__webpack_require__(/*! ./plugin-info */ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-info.js"), exports);
__exportStar(__webpack_require__(/*! ./plugin-info-category */ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-info-category.js"), exports);
__exportStar(__webpack_require__(/*! ./plugin-link-condition */ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-link-condition.js"), exports);
__exportStar(__webpack_require__(/*! ./plugin-ui-custom-id-parameter */ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-custom-id-parameter.js"), exports);
__exportStar(__webpack_require__(/*! ./plugin-ui-custom-id-parameter-param */ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-custom-id-parameter-param.js"), exports);
__exportStar(__webpack_require__(/*! ./plugin-ui-embedded-parameter */ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-embedded-parameter.js"), exports);
__exportStar(__webpack_require__(/*! ./plugin-ui-id-parameter */ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-id-parameter.js"), exports);
__exportStar(__webpack_require__(/*! ./plugin-ui-json-parameter */ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-json-parameter.js"), exports);
__exportStar(__webpack_require__(/*! ./plugin-ui-number-parameter */ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-number-parameter.js"), exports);
__exportStar(__webpack_require__(/*! ./plugin-ui-parameter */ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-parameter.js"), exports);
__exportStar(__webpack_require__(/*! ./plugin-ui-parameter-type */ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-parameter-type.js"), exports);
__exportStar(__webpack_require__(/*! ./plugin-ui-string-parameter */ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-string-parameter.js"), exports);
//# sourceMappingURL=index.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/link-condition-plugin.js":
/*!***********************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/link-condition-plugin.js ***!
  \***********************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=link-condition-plugin.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-action-command.js":
/*!***********************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-action-command.js ***!
  \***********************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=plugin-action-command.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-auto-tile-parameters.js":
/*!*****************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-auto-tile-parameters.js ***!
  \*****************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=plugin-auto-tile-parameters.js.map

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

/***/ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-info.js":
/*!*************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-info.js ***!
  \*************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=plugin-info.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-link-condition.js":
/*!***********************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-link-condition.js ***!
  \***********************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=plugin-link-condition.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-custom-id-parameter-param.js":
/*!*************************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-custom-id-parameter-param.js ***!
  \*************************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=plugin-ui-custom-id-parameter-param.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-custom-id-parameter.js":
/*!*******************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-custom-id-parameter.js ***!
  \*******************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=plugin-ui-custom-id-parameter.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-embedded-parameter.js":
/*!******************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-embedded-parameter.js ***!
  \******************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=plugin-ui-embedded-parameter.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-id-parameter.js":
/*!************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-id-parameter.js ***!
  \************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=plugin-ui-id-parameter.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-json-parameter.js":
/*!**************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-json-parameter.js ***!
  \**************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=plugin-ui-json-parameter.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-number-parameter.js":
/*!****************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-number-parameter.js ***!
  \****************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=plugin-ui-number-parameter.js.map

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

/***/ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-parameter.js":
/*!*********************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-parameter.js ***!
  \*********************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=plugin-ui-parameter.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-string-parameter.js":
/*!****************************************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-string-parameter.js ***!
  \****************************************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=plugin-ui-string-parameter.js.map

/***/ }),

/***/ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin.js":
/*!********************************************************************!*\
  !*** ./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin.js ***!
  \********************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=plugin.js.map

/***/ }),

/***/ "./src/create-log-files-manager.ts":
/*!*****************************************!*\
  !*** ./src/create-log-files-manager.ts ***!
  \*****************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createLogFileManager = void 0;
var mixin_file_manager_1 = __webpack_require__(/*! @agogpixel/pgmmv-fs-support/src/mixin-file-manager */ "./node_modules/@agogpixel/pgmmv-fs-support/src/mixin-file-manager.js");
var mixin_file_reader_1 = __webpack_require__(/*! @agogpixel/pgmmv-fs-support/src/mixin-file-reader */ "./node_modules/@agogpixel/pgmmv-fs-support/src/mixin-file-reader.js");
var mixin_file_writer_1 = __webpack_require__(/*! @agogpixel/pgmmv-fs-support/src/mixin-file-writer */ "./node_modules/@agogpixel/pgmmv-fs-support/src/mixin-file-writer.js");
var get_unix_timestamp_1 = __webpack_require__(/*! @agogpixel/pgmmv-resource-support/src/time/get-unix-timestamp */ "./node_modules/@agogpixel/pgmmv-resource-support/src/time/get-unix-timestamp.js");
var poll_with_interval_1 = __webpack_require__(/*! @agogpixel/pgmmv-resource-support/src/time/poll-with-interval */ "./node_modules/@agogpixel/pgmmv-resource-support/src/time/poll-with-interval.js");
/**
 *
 */
var targetLogFile = 'current.log';
/**
 *
 * @param config
 * @returns
 */
function createLogFileManager(config) {
    /**
     *
     */
    var self = {};
    /**
     *
     */
    var fsApi = (0, mixin_file_writer_1.mixinFileWriter)((0, mixin_file_reader_1.mixinFileReader)((0, mixin_file_manager_1.mixinFileManager)({})));
    /**
     *
     */
    var logFilesDirectory = config.logFilesDirectory;
    /**
     *
     */
    var buffer;
    /**
     *
     */
    var batchStart;
    /**
     *
     */
    var bufferSize;
    /**
     *
     */
    var lastWriteTime = (0, get_unix_timestamp_1.getUnixTimestamp)();
    /**
     *
     */
    var isWriting = false;
    /**
     *
     * @param basePath
     * @param relDirPath
     * @param callback
     * @returns
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
    function flushToFile(buffer, path) {
        if (isWriting) {
            return;
        }
        isWriting = true;
        function finish() {
            isWriting = false;
            lastWriteTime = (0, get_unix_timestamp_1.getUnixTimestamp)();
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
    (0, poll_with_interval_1.pollWithInterval)(function () {
        if (bufferSize > 2048 || (0, get_unix_timestamp_1.getUnixTimestamp)() - lastWriteTime > 3) {
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
    /**
     *
     * @returns
     */
    self.getLogFilesDirectory = function getLogFilesDirectory() {
        return logFilesDirectory;
    };
    /**
     *
     * @param relDirPath
     */
    self.setLogFilesDirectory = function setLogFilesDirectory(relDirPath) {
        logFilesDirectory = relDirPath;
        return self;
    };
    /**
     *
     * @param data
     * @param relDirPath
     * @returns
     */
    self.writeToLogFiles = function writeToLogFiles(data) {
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
    return self;
}
exports.createLogFileManager = createLogFileManager;


/***/ }),

/***/ "./src/create-runtime-logger-plugin.ts":
/*!*********************************************!*\
  !*** ./src/create-runtime-logger-plugin.ts ***!
  \*********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createRuntimeLoggerPlugin = void 0;
var create_logger_1 = __webpack_require__(/*! @agogpixel/pgmmv-logging-support/src/create-logger */ "./node_modules/@agogpixel/pgmmv-logging-support/src/create-logger.js");
var log_level_1 = __webpack_require__(/*! @agogpixel/pgmmv-logging-support/src/log-level */ "./node_modules/@agogpixel/pgmmv-logging-support/src/log-level.js");
var create_plugin_1 = __webpack_require__(/*! @agogpixel/pgmmv-plugin-support/src/create-plugin */ "./node_modules/@agogpixel/pgmmv-plugin-support/src/create-plugin.js");
var to_json_1 = __webpack_require__(/*! @agogpixel/pgmmv-resource-support/src/json/to-json */ "./node_modules/@agogpixel/pgmmv-resource-support/src/json/to-json.js");
var create_log_files_manager_1 = __webpack_require__(/*! ./create-log-files-manager */ "./src/create-log-files-manager.ts");
var locale_1 = __importDefault(__webpack_require__(/*! ./locale */ "./src/locale/index.ts"));
var parameters_1 = __webpack_require__(/*! ./parameters */ "./src/parameters.ts");
/**
 *
 */
var defaultLogLevel = log_level_1.LogLevel.Info;
/**
 *
 */
var defaultJsonIndentSize = 2;
/**
 *
 */
var defaultJsonStringifyFunctions = false;
/**
 *
 */
var defaultWriteLogFiles = false;
/**
 *
 */
var pluginBanner = "\nRuntime Logger Plugin v".concat("0.2.0-dev", "\nCopyright 2022 AgogPixel - All Rights Reserved\n");
/**
 *
 * @returns
 */
function createRuntimeLoggerPlugin() {
    /**
     *
     */
    var internalApi = {};
    /**
     *
     */
    var self = (0, create_plugin_1.createPlugin)({ localizations: locale_1.default, parameters: parameters_1.parameters }, internalApi);
    /**
     *
     */
    var AgtkLog;
    /**
     *
     */
    var combinedLogger;
    /**
     *
     */
    var logFileManager;
    /**
     *
     */
    function initLogOverride() {
        var _a;
        AgtkLog = Agtk.log;
        logFileManager = (0, create_log_files_manager_1.createLogFileManager)({
            logFilesDirectory: internalApi.internalData.logFilesDirectory
        });
        combinedLogger = (0, create_logger_1.createLogger)({
            logLevel: internalApi.internalData.logLevel,
            runtimeLog: function (arg1) {
                var chunks = arg1.match(/.{1,120}/g);
                for (var i = 0; i < chunks.length; ++i) {
                    AgtkLog(chunks[i]);
                }
                if (internalApi.inPlayer() && internalApi.internalData.writeLogFiles) {
                    logFileManager.writeToLogFiles(arg1);
                }
            },
            jsonIndentSize: internalApi.internalData.jsonIndentSize,
            jsonStringifyFunctions: internalApi.internalData.jsonStringifyFunctions,
            logLevelMap: (_a = {},
                _a[log_level_1.LogLevel.Debug] = internalApi.localization.get('LOG_LEVEL_0'),
                _a[log_level_1.LogLevel.Info] = internalApi.localization.get('LOG_LEVEL_1'),
                _a[log_level_1.LogLevel.Warn] = internalApi.localization.get('LOG_LEVEL_2'),
                _a[log_level_1.LogLevel.Error] = internalApi.localization.get('LOG_LEVEL_3'),
                _a[log_level_1.LogLevel.Fatal] = internalApi.localization.get('LOG_LEVEL_4'),
                _a)
        });
        /**
         *
         */
        var logOverride = function logOverride(data, level) {
            combinedLogger.log(data, level);
        };
        /**
         *
         * @param data
         * @param level
         */
        logOverride.log = function log(data, level) {
            combinedLogger.log(data, level);
        };
        /**
         *
         * @param data
         */
        logOverride.debug = function debug(data) {
            combinedLogger.debug(data);
        };
        /**
         *
         * @param data
         */
        logOverride.info = function info(data) {
            combinedLogger.info(data);
        };
        /**
         *
         * @param data
         */
        logOverride.warn = function warn(data) {
            combinedLogger.warn(data);
        };
        /**
         *
         * @param data
         */
        logOverride.error = function error(data) {
            combinedLogger.error(data);
        };
        /**
         *
         * @param data
         */
        logOverride.fatal = function fatal(data) {
            combinedLogger.fatal(data);
        };
        Agtk.log = logOverride;
    }
    /**
     *
     * @param data
     */
    self.initialize = function initialize(data) {
        if (!data) {
            data = {
                logLevel: defaultLogLevel,
                jsonIndentSize: defaultJsonIndentSize,
                jsonStringifyFunctions: defaultJsonStringifyFunctions,
                writeLogFiles: defaultWriteLogFiles,
                logFilesDirectory: internalApi.localization.get('PARAMETER_4_DEFAULT_VALUE')
            };
        }
        self.setInternal(data);
        if (internalApi.inEditor()) {
            return;
        }
        initLogOverride();
        combinedLogger.info("".concat(pluginBanner).concat((0, to_json_1.toJson)(internalApi.internalData)));
    };
    /**
     *
     */
    self.finalize = function finalize() {
        if (internalApi.inEditor()) {
            return;
        }
        Agtk.log = AgtkLog;
    };
    /**
     *
     * @param paramValue
     * @returns
     */
    self.setParamValue = function setParamValue(paramValue) {
        if (!paramValue || !paramValue.length) {
            return;
        }
        for (var i = 0; i < paramValue.length; ++i) {
            switch (paramValue[i].id) {
                case parameters_1.ParameterId.LogLevel:
                    internalApi.internalData.logLevel = paramValue[i].value;
                    break;
                case parameters_1.ParameterId.JsonIndentSize:
                    internalApi.internalData.jsonIndentSize = paramValue[i].value;
                    break;
                case parameters_1.ParameterId.JsonStringifyFunctions:
                    // Assumes Log Level updated first.
                    var mode = paramValue[i].value;
                    if (!mode ||
                        (mode === parameters_1.JsonStringifyFunctionsParameterId.DebugOnly &&
                            internalApi.internalData.logLevel !== log_level_1.LogLevel.Debug)) {
                        internalApi.internalData.jsonStringifyFunctions = false;
                    }
                    else {
                        internalApi.internalData.jsonStringifyFunctions = true;
                    }
                    break;
                case parameters_1.ParameterId.WriteLogFiles:
                    internalApi.internalData.writeLogFiles = !!paramValue[i].value;
                    break;
                case parameters_1.ParameterId.LogFilesDirectory:
                    var rawDir = paramValue[i].value.trim();
                    if (rawDir) {
                        var rawDirParts = rawDir.replace(/\\/g, '/').split(/\//);
                        var dirParts = [];
                        var invalid = false;
                        for (var i_1 = 0; i_1 < rawDirParts.length; ++i_1) {
                            var p = rawDirParts[i_1].trim();
                            if (/(<|>|:|"|\||\?|\*|^\.$|^\.\.$)/.test(p)) {
                                invalid = true;
                                break;
                            }
                            if (p) {
                                dirParts.push(p);
                            }
                        }
                        if (!invalid && dirParts.length) {
                            internalApi.internalData.logFilesDirectory = dirParts.join('/');
                        }
                    }
                    break;
            }
        }
        if (internalApi.inEditor()) {
            return;
        }
        combinedLogger
            .setLogLevel(internalApi.internalData.logLevel)
            .setJsonIndentSize(internalApi.internalData.jsonIndentSize)
            .setJsonStringifyFunctions(internalApi.internalData.jsonStringifyFunctions);
    };
    return self;
}
exports.createRuntimeLoggerPlugin = createRuntimeLoggerPlugin;


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

/***/ "./src/parameters.ts":
/*!***************************!*\
  !*** ./src/parameters.ts ***!
  \***************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.parameters = exports.WriteLogFilesParameterId = exports.JsonStringifyFunctionsParameterId = exports.LogLevelParameterId = exports.ParameterId = void 0;
var log_level_1 = __webpack_require__(/*! @agogpixel/pgmmv-logging-support/src/log-level */ "./node_modules/@agogpixel/pgmmv-logging-support/src/log-level.js");
var plugin_ui_parameter_type_1 = __webpack_require__(/*! @agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-parameter-type */ "./node_modules/@agogpixel/pgmmv-ts/api/agtk/plugin/plugin-ui-parameter-type.js");
/**
 *
 */
var ParameterId;
(function (ParameterId) {
    /**
     *
     */
    ParameterId[ParameterId["LogLevel"] = 12371968] = "LogLevel";
    /**
     *
     */
    ParameterId[ParameterId["JsonIndentSize"] = 12371969] = "JsonIndentSize";
    /**
     *
     */
    ParameterId[ParameterId["JsonStringifyFunctions"] = 12371970] = "JsonStringifyFunctions";
    /**
     *
     */
    ParameterId[ParameterId["WriteLogFiles"] = 12371971] = "WriteLogFiles";
    /**
     *
     */
    ParameterId[ParameterId["LogFilesDirectory"] = 12371972] = "LogFilesDirectory";
})(ParameterId = exports.ParameterId || (exports.ParameterId = {}));
/**
 *
 */
exports.LogLevelParameterId = log_level_1.LogLevel;
/**
 *
 */
var JsonStringifyFunctionsParameterId;
(function (JsonStringifyFunctionsParameterId) {
    /**
     *
     */
    JsonStringifyFunctionsParameterId[JsonStringifyFunctionsParameterId["Never"] = 0] = "Never";
    /**
     *
     */
    JsonStringifyFunctionsParameterId[JsonStringifyFunctionsParameterId["DebugOnly"] = 1] = "DebugOnly";
    /**
     *
     */
    JsonStringifyFunctionsParameterId[JsonStringifyFunctionsParameterId["Always"] = 2] = "Always";
})(JsonStringifyFunctionsParameterId = exports.JsonStringifyFunctionsParameterId || (exports.JsonStringifyFunctionsParameterId = {}));
/**
 *
 */
var WriteLogFilesParameterId;
(function (WriteLogFilesParameterId) {
    /**
     *
     */
    WriteLogFilesParameterId[WriteLogFilesParameterId["Off"] = 0] = "Off";
    /**
     *
     */
    WriteLogFilesParameterId[WriteLogFilesParameterId["On"] = 1] = "On";
})(WriteLogFilesParameterId = exports.WriteLogFilesParameterId || (exports.WriteLogFilesParameterId = {}));
exports.parameters = [
    {
        id: ParameterId.LogLevel,
        name: 'loca(PARAMETER_0_NAME)',
        type: plugin_ui_parameter_type_1.AgtkPluginUiParameterType.CustomId,
        customParam: [
            { id: exports.LogLevelParameterId.Debug, name: 'loca(PARAMETER_0_PARAM_0_NAME)' },
            { id: exports.LogLevelParameterId.Info, name: 'loca(PARAMETER_0_PARAM_1_NAME)' },
            { id: exports.LogLevelParameterId.Warn, name: 'loca(PARAMETER_0_PARAM_2_NAME)' },
            { id: exports.LogLevelParameterId.Error, name: 'loca(PARAMETER_0_PARAM_3_NAME)' },
            { id: exports.LogLevelParameterId.Fatal, name: 'loca(PARAMETER_0_PARAM_4_NAME)' }
        ],
        defaultValue: exports.LogLevelParameterId.Info
    },
    {
        id: ParameterId.JsonIndentSize,
        name: 'loca(PARAMETER_1_NAME)',
        type: plugin_ui_parameter_type_1.AgtkPluginUiParameterType.Number,
        minimumValue: 0,
        maximumValue: 8,
        defaultValue: 2
    },
    {
        id: ParameterId.JsonStringifyFunctions,
        name: 'loca(PARAMETER_2_NAME)',
        type: plugin_ui_parameter_type_1.AgtkPluginUiParameterType.CustomId,
        customParam: [
            { id: JsonStringifyFunctionsParameterId.Never, name: 'loca(PARAMETER_2_PARAM_0_NAME)' },
            { id: JsonStringifyFunctionsParameterId.DebugOnly, name: 'loca(PARAMETER_2_PARAM_1_NAME)' },
            { id: JsonStringifyFunctionsParameterId.Always, name: 'loca(PARAMETER_2_PARAM_2_NAME)' }
        ],
        defaultValue: JsonStringifyFunctionsParameterId.DebugOnly
    },
    {
        id: ParameterId.WriteLogFiles,
        name: 'loca(PARAMETER_3_NAME)',
        type: plugin_ui_parameter_type_1.AgtkPluginUiParameterType.CustomId,
        customParam: [
            { id: WriteLogFilesParameterId.Off, name: 'loca(PARAMETER_3_PARAM_0_NAME)' },
            { id: WriteLogFilesParameterId.On, name: 'loca(PARAMETER_3_PARAM_1_NAME)' }
        ],
        defaultValue: WriteLogFilesParameterId.Off
    },
    {
        id: ParameterId.LogFilesDirectory,
        name: 'loca(PARAMETER_4_NAME)',
        type: plugin_ui_parameter_type_1.AgtkPluginUiParameterType.String,
        defaultValue: 'loca(PARAMETER_4_DEFAULT_VALUE)'
    }
];


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

module.exports = JSON.parse('{"PLUGIN_NAME":"Runtime Logger","PLUGIN_DESCRIPTION":"Extends the `Agtk.log` method.","PLUGIN_AUTHOR":"kidthales <kidthales@agogpixel.com>","PLUGIN_HELP":"See help.md","PARAMETER_0_NAME":"Log Level","PARAMETER_0_PARAM_0_NAME":"DEBUG","PARAMETER_0_PARAM_1_NAME":"INFO","PARAMETER_0_PARAM_2_NAME":"WARN","PARAMETER_0_PARAM_3_NAME":"ERROR","PARAMETER_0_PARAM_4_NAME":"FATAL","PARAMETER_1_NAME":"JSON Indent Size","PARAMETER_2_NAME":"JSON Stringify Functions","PARAMETER_2_PARAM_0_NAME":"NEVER","PARAMETER_2_PARAM_1_NAME":"DEBUG ONLY","PARAMETER_2_PARAM_2_NAME":"ALWAYS","PARAMETER_3_NAME":"Write Log Files","PARAMETER_3_PARAM_0_NAME":"OFF","PARAMETER_3_PARAM_1_NAME":"ON","PARAMETER_4_NAME":"Log Files Directory","PARAMETER_4_DEFAULT_VALUE":"logs","LOG_LEVEL_0":"DEBUG","LOG_LEVEL_1":"INFO","LOG_LEVEL_2":"WARN","LOG_LEVEL_3":"ERROR","LOG_LEVEL_4":"FATAL"}');

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
var create_runtime_logger_plugin_1 = __webpack_require__(/*! ./create-runtime-logger-plugin */ "./src/create-runtime-logger-plugin.ts");
var plugin = (0, create_runtime_logger_plugin_1.createRuntimeLoggerPlugin)();
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
return plugin;

}();
/******/ })()
;