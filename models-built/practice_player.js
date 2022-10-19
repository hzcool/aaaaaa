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
var practice_1 = require("./practice");
var PracticePlayer = /** @class */ (function (_super) {
    __extends(PracticePlayer, _super);
    function PracticePlayer() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    PracticePlayer_1 = PracticePlayer;
    PracticePlayer.findInPractice = function (where) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, PracticePlayer_1.findOne({ where: where })];
            });
        });
    };
    PracticePlayer.prototype.loadRelationships = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = this;
                        return [4 /*yield*/, user_1["default"].findById(this.user_id)];
                    case 1:
                        _a.user = _c.sent();
                        _b = this;
                        return [4 /*yield*/, practice_1["default"].findById(this.practice_id)];
                    case 2:
                        _b.practice = _c.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    PracticePlayer.prototype.updateScore = function (judge_state) {
        return __awaiter(this, void 0, void 0, function () {
            var arr, maxScoreSubmission, _i, arr_1, x, x, x, arr, _a, arr_2, x, x;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.loadRelationships()];
                    case 1:
                        _b.sent();
                        if (this.practice.type === 'ioi') {
                            if (!judge_state.pending) {
                                if (!this.score_details[judge_state.problem_id]) {
                                    this.score_details[judge_state.problem_id] = {
                                        score: judge_state.score,
                                        judge_id: judge_state.id,
                                        submissions: {}
                                    };
                                }
                                this.score_details[judge_state.problem_id].submissions[judge_state.id] = {
                                    judge_id: judge_state.id,
                                    score: judge_state.score,
                                    time: judge_state.submit_time
                                };
                                arr = Object.values(this.score_details[judge_state.problem_id].submissions);
                                arr.sort(function (a, b) { return a.time - b.time; });
                                maxScoreSubmission = null;
                                for (_i = 0, arr_1 = arr; _i < arr_1.length; _i++) {
                                    x = arr_1[_i];
                                    if (!maxScoreSubmission || x.score >= maxScoreSubmission.score && maxScoreSubmission.score < 100) {
                                        maxScoreSubmission = x;
                                    }
                                }
                                this.score_details[judge_state.problem_id].judge_id = maxScoreSubmission.judge_id;
                                this.score_details[judge_state.problem_id].score = maxScoreSubmission.score;
                                this.score_details[judge_state.problem_id].time = maxScoreSubmission.time;
                                this.score = 0;
                                for (x in this.score_details) {
                                    if (this.score != null)
                                        this.score += this.score_details[x].score;
                                }
                            }
                        }
                        else if (this.practice.type === 'noi') {
                            if (this.score_details[judge_state.problem_id] && this.score_details[judge_state.problem_id].judge_id > judge_state.id)
                                return [2 /*return*/];
                            this.score_details[judge_state.problem_id] = {
                                score: judge_state.score,
                                judge_id: judge_state.id
                            };
                            this.score = 0;
                            for (x in this.score_details) {
                                if (this.score != null)
                                    this.score += this.score_details[x].score;
                            }
                        }
                        else if (this.practice.type === 'acm') {
                            if (!judge_state.pending) {
                                if (!this.score_details[judge_state.problem_id]) {
                                    this.score_details[judge_state.problem_id] = {
                                        accepted: false,
                                        unacceptedCount: 0,
                                        acceptedTime: 0,
                                        judge_id: 0,
                                        submissions: {}
                                    };
                                }
                                this.score_details[judge_state.problem_id].submissions[judge_state.id] = {
                                    judge_id: judge_state.id,
                                    accepted: judge_state.status === 'Accepted',
                                    compiled: judge_state.score != null,
                                    time: judge_state.submit_time
                                };
                                arr = Object.values(this.score_details[judge_state.problem_id].submissions);
                                arr.sort(function (a, b) { return a.time - b.time; });
                                this.score_details[judge_state.problem_id].unacceptedCount = 0;
                                this.score_details[judge_state.problem_id].judge_id = 0;
                                this.score_details[judge_state.problem_id].accepted = 0;
                                for (_a = 0, arr_2 = arr; _a < arr_2.length; _a++) {
                                    x = arr_2[_a];
                                    if (x.accepted) {
                                        this.score_details[judge_state.problem_id].accepted = true;
                                        this.score_details[judge_state.problem_id].acceptedTime = x.time;
                                        this.score_details[judge_state.problem_id].judge_id = x.judge_id;
                                        break;
                                    }
                                    else if (x.compiled) {
                                        this.score_details[judge_state.problem_id].unacceptedCount++;
                                    }
                                }
                                if (!this.score_details[judge_state.problem_id].accepted) {
                                    this.score_details[judge_state.problem_id].judge_id = arr[arr.length - 1].judge_id;
                                }
                                this.score = 0;
                                for (x in this.score_details) {
                                    if (this.score_details[x].accepted)
                                        this.score++;
                                }
                            }
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    var PracticePlayer_1;
    PracticePlayer.cache = true;
    __decorate([
        TypeORM.PrimaryGeneratedColumn(),
        __metadata("design:type", Number)
    ], PracticePlayer.prototype, "id");
    __decorate([
        TypeORM.Index(),
        TypeORM.Column({ nullable: true, type: "integer" }),
        __metadata("design:type", Number)
    ], PracticePlayer.prototype, "practice_id");
    __decorate([
        TypeORM.Index(),
        TypeORM.Column({ nullable: true, type: "integer" }),
        __metadata("design:type", Number)
    ], PracticePlayer.prototype, "user_id");
    __decorate([
        TypeORM.Column({ nullable: true, type: "integer" }),
        __metadata("design:type", Number)
    ], PracticePlayer.prototype, "score");
    __decorate([
        TypeORM.Column({ "default": JSON.stringify({}), type: "json" }),
        __metadata("design:type", Object)
    ], PracticePlayer.prototype, "score_details");
    __decorate([
        TypeORM.Column({ nullable: true, type: "integer" }),
        __metadata("design:type", Number)
    ], PracticePlayer.prototype, "time_spent");
    PracticePlayer = PracticePlayer_1 = __decorate([
        TypeORM.Entity()
    ], PracticePlayer);
    return PracticePlayer;
}(common_1["default"]));
exports["default"] = PracticePlayer;
//# sourceMappingURL=practice_player.js.map