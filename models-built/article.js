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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
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
var common_1 = require("./common");
var user_1 = require("./user");
var article_comment_1 = require("./article-comment");
var Article = /** @class */ (function (_super) {
    __extends(Article, _super);
    function Article() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Article.prototype.loadRelationships = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = this;
                        return [4 /*yield*/, user_1["default"].findById(this.user_id)];
                    case 1:
                        _a.user = _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Article.prototype.isAllowedEditBy = function (user) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, user && (user.is_admin || this.user_id === user.id)];
            });
        });
    };
    Article.prototype.isAllowedManageBy = function (user) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = user;
                        if (!_a) return [3 /*break*/, 3];
                        _b = user.is_admin;
                        if (_b) return [3 /*break*/, 2];
                        return [4 /*yield*/, user.hasPrivilege('manage_problem')];
                    case 1:
                        _b = (_c.sent());
                        _c.label = 2;
                    case 2:
                        _a = (_b);
                        _c.label = 3;
                    case 3: return [2 /*return*/, _a];
                }
            });
        });
    };
    Article.prototype.isAllowedCommentBy = function (user) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, user && (this.allow_comment || user.is_admin || this.user_id === user.id)];
            });
        });
    };
    Article.prototype.resetReplyCountAndTime = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, syzoj.utils.lock(['Article::resetReplyCountAndTime', this.id], function () { return __awaiter(_this, void 0, void 0, function () {
                            var _a, _b;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        _a = this;
                                        return [4 /*yield*/, article_comment_1["default"].count({ article_id: this.id })];
                                    case 1:
                                        _a.comments_num = _c.sent();
                                        if (!(this.comments_num === 0)) return [3 /*break*/, 2];
                                        this.sort_time = this.public_time;
                                        return [3 /*break*/, 4];
                                    case 2:
                                        _b = this;
                                        return [4 /*yield*/, article_comment_1["default"].findOne({
                                                where: { article_id: this.id },
                                                order: { public_time: "DESC" }
                                            })];
                                    case 3:
                                        _b.sort_time = (_c.sent()).public_time;
                                        _c.label = 4;
                                    case 4: return [4 /*yield*/, this.save()];
                                    case 5:
                                        _c.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Article.cache = false;
    __decorate([
        TypeORM.PrimaryGeneratedColumn(),
        __metadata("design:type", Number)
    ], Article.prototype, "id");
    __decorate([
        TypeORM.Column({ nullable: true, type: "varchar", length: 80 }),
        __metadata("design:type", String)
    ], Article.prototype, "title");
    __decorate([
        TypeORM.Column({ nullable: true, type: "mediumtext" }),
        __metadata("design:type", String)
    ], Article.prototype, "content");
    __decorate([
        TypeORM.Index(),
        TypeORM.Column({ nullable: true, type: "integer" }),
        __metadata("design:type", Number)
    ], Article.prototype, "user_id");
    __decorate([
        TypeORM.Index(),
        TypeORM.Column({ nullable: true, type: "integer" }),
        __metadata("design:type", Number)
    ], Article.prototype, "problem_id");
    __decorate([
        TypeORM.Column({ nullable: true, type: "integer" }),
        __metadata("design:type", Number)
    ], Article.prototype, "public_time");
    __decorate([
        TypeORM.Column({ nullable: true, type: "integer" }),
        __metadata("design:type", Number)
    ], Article.prototype, "update_time");
    __decorate([
        TypeORM.Index(),
        TypeORM.Column({ nullable: true, type: "integer" }),
        __metadata("design:type", Number)
    ], Article.prototype, "sort_time");
    __decorate([
        TypeORM.Column({ "default": 0, type: "integer" }),
        __metadata("design:type", Number)
    ], Article.prototype, "comments_num");
    __decorate([
        TypeORM.Column({ "default": true, type: "boolean" }),
        __metadata("design:type", Boolean)
    ], Article.prototype, "allow_comment");
    __decorate([
        TypeORM.Index(),
        TypeORM.Column({ nullable: true, type: "boolean" }),
        __metadata("design:type", Boolean)
    ], Article.prototype, "is_notice");
    __decorate([
        TypeORM.Index(),
        TypeORM.Column({ nullable: true, type: "boolean" }),
        __metadata("design:type", Boolean)
    ], Article.prototype, "is_public");
    Article = __decorate([
        TypeORM.Entity()
    ], Article);
    return Article;
}(common_1["default"]));
exports["default"] = Article;
;
//# sourceMappingURL=article.js.map