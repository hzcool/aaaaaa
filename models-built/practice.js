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
var problem_1 = require("./problem");
var practice_ranklist_1 = require("./practice_ranklist");
var practice_player_1 = require("./practice_player");
var PracticeType;
(function (PracticeType) {
    PracticeType["NOI"] = "noi";
    PracticeType["IOI"] = "ioi";
    PracticeType["ICPC"] = "acm";
})(PracticeType || (PracticeType = {}));
var Practice = /** @class */ (function (_super) {
    __extends(Practice, _super);
    function Practice() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Practice.prototype.loadRelationships = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = this;
                        return [4 /*yield*/, user_1["default"].findById(this.holder_id)];
                    case 1:
                        _a.holder = _c.sent();
                        _b = this;
                        return [4 /*yield*/, practice_ranklist_1["default"].findById(this.ranklist_id)];
                    case 2:
                        _b.ranklist = _c.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Practice.prototype.isSupervisior = function (user) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, user && (user.is_admin || this.holder_id === user.id || this.admins.split('|').includes(user.id.toString()))];
            });
        });
    };
    Practice.prototype.allowedSeeingOthers = function () {
        if (this.type === 'acm')
            return true;
        else
            return false;
    };
    Practice.prototype.allowedSeeingScore = function () {
        if (this.type === 'ioi')
            return true;
        else
            return false;
    };
    Practice.prototype.allowedSeeingResult = function () {
        if (this.type === 'ioi' || this.type === 'acm')
            return true;
        else
            return false;
    };
    Practice.prototype.allowedSeeingTestcase = function () {
        if (this.type === 'ioi')
            return true;
        return false;
    };
    Practice.prototype.getProblems = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (!this.problems)
                    return [2 /*return*/, []];
                return [2 /*return*/, this.problems.split('|').map(function (x) { return parseInt(x); })];
            });
        });
    };
    Practice.prototype.setProblemsNoCheck = function (problemIDs) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.problems = problemIDs.join('|');
                return [2 /*return*/];
            });
        });
    };
    Practice.prototype.setProblems = function (s) {
        return __awaiter(this, void 0, void 0, function () {
            var a;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        a = [];
                        return [4 /*yield*/, s.split('|').forEachAsync(function (x) { return __awaiter(_this, void 0, void 0, function () {
                                var problem;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, problem_1["default"].findById(x)];
                                        case 1:
                                            problem = _a.sent();
                                            if (!problem)
                                                return [2 /*return*/];
                                            a.push(x);
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                    case 1:
                        _a.sent();
                        this.problems = a.join('|');
                        return [2 /*return*/];
                }
            });
        });
    };
    Practice.prototype.newSubmission = function (judge_state) {
        return __awaiter(this, void 0, void 0, function () {
            var problems;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(judge_state.submit_time >= this.start_time && judge_state.submit_time <= this.end_time)) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.getProblems()];
                    case 1:
                        problems = _a.sent();
                        if (!problems.includes(judge_state.problem_id))
                            throw new ErrorMessage('当前练习赛中无此题目。');
                        return [4 /*yield*/, syzoj.utils.lock(['Practice::newSubmission', judge_state.user_id], function () { return __awaiter(_this, void 0, void 0, function () {
                                var player;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, practice_player_1["default"].findInPractice({
                                                practice_id: this.id,
                                                user_id: judge_state.user_id
                                            })];
                                        case 1:
                                            player = _a.sent();
                                            if (!!player) return [3 /*break*/, 4];
                                            return [4 /*yield*/, practice_player_1["default"].create({
                                                    practice_id: this.id,
                                                    user_id: judge_state.user_id
                                                })];
                                        case 2:
                                            player = _a.sent();
                                            return [4 /*yield*/, player.save()];
                                        case 3:
                                            _a.sent();
                                            _a.label = 4;
                                        case 4: return [4 /*yield*/, player.updateScore(judge_state)];
                                        case 5:
                                            _a.sent();
                                            return [4 /*yield*/, player.save()];
                                        case 6:
                                            _a.sent();
                                            return [4 /*yield*/, this.loadRelationships()];
                                        case 7:
                                            _a.sent();
                                            return [4 /*yield*/, this.ranklist.updatePlayer(this, player)];
                                        case 8:
                                            _a.sent();
                                            return [4 /*yield*/, this.ranklist.save()];
                                        case 9:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Practice.prototype.isRunning = function (now) {
        if (!now)
            now = syzoj.utils.getCurrentDate();
        return now >= this.start_time && now < this.end_time;
    };
    Practice.prototype.isEnded = function (now) {
        if (!now)
            now = syzoj.utils.getCurrentDate();
        return now >= this.end_time;
    };
    Practice.cache = true;
    __decorate([
        TypeORM.PrimaryGeneratedColumn(),
        __metadata("design:type", Number)
    ], Practice.prototype, "id");
    __decorate([
        TypeORM.Column({ nullable: true, type: "varchar", length: 80 }),
        __metadata("design:type", String)
    ], Practice.prototype, "title");
    __decorate([
        TypeORM.Column({ nullable: true, type: "text" }),
        __metadata("design:type", String)
    ], Practice.prototype, "subtitle");
    __decorate([
        TypeORM.Column({ nullable: true, type: "integer" }),
        __metadata("design:type", Number)
    ], Practice.prototype, "start_time");
    __decorate([
        TypeORM.Column({ nullable: true, type: "integer" }),
        __metadata("design:type", Number)
    ], Practice.prototype, "end_time");
    __decorate([
        TypeORM.Index(),
        TypeORM.Column({ nullable: true, type: "integer" }),
        __metadata("design:type", Number)
    ], Practice.prototype, "holder_id");
    __decorate([
        TypeORM.Column({ nullable: true, type: "enum", "enum": PracticeType }),
        __metadata("design:type", String)
    ], Practice.prototype, "type");
    __decorate([
        TypeORM.Column({ nullable: true, type: "text" }),
        __metadata("design:type", String)
    ], Practice.prototype, "information");
    __decorate([
        TypeORM.Column({ nullable: true, type: "text" }),
        __metadata("design:type", String)
    ], Practice.prototype, "problems");
    __decorate([
        TypeORM.Column({ nullable: true, type: "text" }),
        __metadata("design:type", String)
    ], Practice.prototype, "admins");
    __decorate([
        TypeORM.Index(),
        TypeORM.Column({ nullable: true, type: "integer" }),
        __metadata("design:type", Number)
    ], Practice.prototype, "ranklist_id");
    __decorate([
        TypeORM.Column({ nullable: true, type: "boolean" }),
        __metadata("design:type", Boolean)
    ], Practice.prototype, "is_public");
    __decorate([
        TypeORM.Column({ nullable: true, type: "boolean" }),
        __metadata("design:type", Boolean)
    ], Practice.prototype, "hide_statistics");
    __decorate([
        TypeORM.Column({ nullable: true, type: "text" }),
        __metadata("design:type", String)
    ], Practice.prototype, "group_id");
    Practice = __decorate([
        TypeORM.Entity()
    ], Practice);
    return Practice;
}(common_1["default"]));
exports["default"] = Practice;
//# sourceMappingURL=practice.js.map