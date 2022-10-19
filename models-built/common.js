"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var TypeORM = require("typeorm");
var LRUCache = require("lru-cache");
var DeepCopy = require("deepcopy");
var PaginationType;
(function (PaginationType) {
    PaginationType[PaginationType["PREV"] = -1] = "PREV";
    PaginationType[PaginationType["NEXT"] = 1] = "NEXT";
})(PaginationType || (PaginationType = {}));
var PaginationIDOrder;
(function (PaginationIDOrder) {
    PaginationIDOrder[PaginationIDOrder["ASC"] = 1] = "ASC";
    PaginationIDOrder[PaginationIDOrder["DESC"] = -1] = "DESC";
})(PaginationIDOrder || (PaginationIDOrder = {}));
var caches = new Map();
function ensureCache(modelName) {
    if (!caches.has(modelName)) {
        caches.set(modelName, new LRUCache({
            max: syzoj.config.db.cache_size
        }));
    }
    return caches.get(modelName);
}
function cacheGet(modelName, id) {
    return ensureCache(modelName).get(parseInt(id));
}
function cacheSet(modelName, id, data) {
    if (data == null) {
        ensureCache(modelName).del(id);
    }
    else {
        ensureCache(modelName).set(parseInt(id), data);
    }
}
var Model = /** @class */ (function (_super) {
    __extends(Model, _super);
    function Model() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Model.findById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var doQuery, resultObject, result;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        doQuery = function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, this.findOne(parseInt(id) || 0)];
                                case 1: return [2 /*return*/, _a.sent()];
                            }
                        }); }); };
                        if (!this.cache) return [3 /*break*/, 2];
                        resultObject = cacheGet(this.name, id);
                        if (resultObject) {
                            return [2 /*return*/, this.create(resultObject)];
                        }
                        return [4 /*yield*/, doQuery()];
                    case 1:
                        result = _a.sent();
                        if (result) {
                            cacheSet(this.name, id, result.toPlain());
                        }
                        return [2 /*return*/, result];
                    case 2: return [4 /*yield*/, doQuery()];
                    case 3: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    Model.prototype.toPlain = function () {
        var _this = this;
        var object = {};
        TypeORM.getConnection().getMetadata(this.constructor).ownColumns.map(function (column) { return column.propertyName; }).forEach(function (key) {
            object[key] = DeepCopy(_this[key]);
        });
        return object;
    };
    Model.prototype.destroy = function () {
        return __awaiter(this, void 0, void 0, function () {
            var id;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        id = this.id;
                        return [4 /*yield*/, TypeORM.getManager().remove(this)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.constructor.deleteFromCache(id)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Model.deleteFromCache = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.cache) {
                    cacheSet(this.name, id, null);
                }
                return [2 /*return*/];
            });
        });
    };
    Model.prototype.saveHook = function () {
        return __awaiter(this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/];
        }); });
    };
    Model.prototype.save = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.saveHook()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, _super.prototype.save.call(this)];
                    case 2:
                        _a.sent();
                        if (this.constructor.cache) {
                            cacheSet(this.constructor.name, this.id, this);
                        }
                        return [2 /*return*/, this];
                }
            });
        });
    };
    Model.countQuery = function (query) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, parameters, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        parameters = null;
                        if (typeof query !== 'string') {
                            _a = query.getQueryAndParameters(), query = _a[0], parameters = _a[1];
                        }
                        _b = parseInt;
                        return [4 /*yield*/, TypeORM.getManager().query("SELECT COUNT(*) FROM (" + query + ") AS `__tmp_table`", parameters)];
                    case 1: return [2 /*return*/, _b.apply(void 0, [(_c.sent())[0]['COUNT(*)']])];
                }
            });
        });
    };
    Model.countForPagination = function (where) {
        return __awaiter(this, void 0, void 0, function () {
            var queryBuilder;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        queryBuilder = where instanceof TypeORM.SelectQueryBuilder
                            ? where
                            : this.createQueryBuilder().where(where);
                        return [4 /*yield*/, queryBuilder.getCount()];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    Model.queryAll = function (queryBuilder) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, queryBuilder.getMany()];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    Model.queryPage = function (paginater, where, order, largeData) {
        if (largeData === void 0) { largeData = false; }
        return __awaiter(this, void 0, void 0, function () {
            var queryBuilder, rawResult;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!paginater.pageCnt)
                            return [2 /*return*/, []];
                        queryBuilder = where instanceof TypeORM.SelectQueryBuilder
                            ? where
                            : this.createQueryBuilder().where(where);
                        if (order)
                            queryBuilder.orderBy(order);
                        queryBuilder.skip((paginater.currPage - 1) * paginater.perPage)
                            .take(paginater.perPage);
                        if (!largeData) return [3 /*break*/, 3];
                        return [4 /*yield*/, queryBuilder.select('id').getRawMany()];
                    case 1:
                        rawResult = _a.sent();
                        return [4 /*yield*/, Promise.all(rawResult.map(function (result) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, this.findById(result.id)];
                            }); }); }))];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3: return [2 /*return*/, queryBuilder.getMany()];
                }
            });
        });
    };
    Model.queryPageFast = function (queryBuilder, _a, idOrder, pageType) {
        var currPageTop = _a.currPageTop, currPageBottom = _a.currPageBottom, perPage = _a.perPage;
        return __awaiter(this, void 0, void 0, function () {
            var queryBuilderBak, result, _b, queryBuilderHasPrev, queryBuilderHasNext;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        queryBuilderBak = queryBuilder.clone();
                        result = {
                            meta: {
                                hasPrevPage: false,
                                hasNextPage: false,
                                top: 0,
                                bottom: 0
                            },
                            data: []
                        };
                        queryBuilder.take(perPage);
                        if (pageType === PaginationType.PREV) {
                            if (currPageTop != null) {
                                queryBuilder.andWhere("id " + (idOrder === PaginationIDOrder.DESC ? '>' : '<') + " :currPageTop", { currPageTop: currPageTop });
                                queryBuilder.orderBy('id', idOrder === PaginationIDOrder.DESC ? 'ASC' : 'DESC');
                            }
                        }
                        else if (pageType === PaginationType.NEXT) {
                            if (currPageBottom != null) {
                                queryBuilder.andWhere("id " + (idOrder === PaginationIDOrder.DESC ? '<' : '>') + " :currPageBottom", { currPageBottom: currPageBottom });
                                queryBuilder.orderBy('id', idOrder === PaginationIDOrder.DESC ? 'DESC' : 'ASC');
                            }
                        }
                        else
                            queryBuilder.orderBy('id', idOrder === PaginationIDOrder.DESC ? 'DESC' : 'ASC');
                        _b = result;
                        return [4 /*yield*/, queryBuilder.getMany()];
                    case 1:
                        _b.data = _c.sent();
                        result.data.sort(function (a, b) { return (a.id - b.id) * idOrder; });
                        if (result.data.length === 0)
                            return [2 /*return*/, result];
                        queryBuilderHasPrev = queryBuilderBak.clone(), queryBuilderHasNext = queryBuilderBak;
                        result.meta.top = result.data[0].id;
                        result.meta.bottom = result.data[result.data.length - 1].id;
                        // Run two queries in parallel.
                        return [4 /*yield*/, Promise.all(([
                                function () { return __awaiter(_this, void 0, void 0, function () {
                                    var _a;
                                    return __generator(this, function (_b) {
                                        switch (_b.label) {
                                            case 0:
                                                _a = result.meta;
                                                return [4 /*yield*/, queryBuilderHasPrev.andWhere("id " + (idOrder === PaginationIDOrder.DESC ? '>' : '<') + " :id", {
                                                        id: result.meta.top
                                                    }).take(1).getOne()];
                                            case 1: return [2 /*return*/, _a.hasPrevPage = !!(_b.sent())];
                                        }
                                    });
                                }); },
                                function () { return __awaiter(_this, void 0, void 0, function () {
                                    var _a;
                                    return __generator(this, function (_b) {
                                        switch (_b.label) {
                                            case 0:
                                                _a = result.meta;
                                                return [4 /*yield*/, queryBuilderHasNext.andWhere("id " + (idOrder === PaginationIDOrder.DESC ? '<' : '>') + " :id", {
                                                        id: result.meta.bottom
                                                    }).take(1).getOne()];
                                            case 1: return [2 /*return*/, _a.hasNextPage = !!(_b.sent())];
                                        }
                                    });
                                }); }
                            ]).map(function (f) { return f(); }))];
                    case 2:
                        // Run two queries in parallel.
                        _c.sent();
                        return [2 /*return*/, result];
                }
            });
        });
    };
    Model.queryRange = function (range, where, order) {
        return __awaiter(this, void 0, void 0, function () {
            var queryBuilder;
            return __generator(this, function (_a) {
                range[0] = parseInt(range[0]);
                range[1] = parseInt(range[1]);
                queryBuilder = where instanceof TypeORM.SelectQueryBuilder
                    ? where
                    : this.createQueryBuilder().where(where);
                if (order)
                    queryBuilder.orderBy(order);
                queryBuilder.skip(range[0] - 1)
                    .take(range[1] - range[0] + 1);
                return [2 /*return*/, queryBuilder.getMany()];
            });
        });
    };
    Model.cache = false;
    return Model;
}(TypeORM.BaseEntity));
exports["default"] = Model;
//# sourceMappingURL=common.js.map