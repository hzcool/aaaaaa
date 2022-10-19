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
var practice_player_1 = require("./practice_player");
var judge_state_1 = require("./judge_state");
var PracticeRanklist = /** @class */ (function (_super) {
    __extends(PracticeRanklist, _super);
    function PracticeRanklist() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    PracticeRanklist.prototype.getPlayers = function () {
        return __awaiter(this, void 0, void 0, function () {
            var a, i, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        a = [];
                        i = 1;
                        _c.label = 1;
                    case 1:
                        if (!(i <= this.ranklist.player_num)) return [3 /*break*/, 4];
                        _b = (_a = a).push;
                        return [4 /*yield*/, practice_player_1["default"].findById(this.ranklist[i])];
                    case 2:
                        _b.apply(_a, [_c.sent()]);
                        _c.label = 3;
                    case 3:
                        i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, a];
                }
            });
        });
    };
    PracticeRanklist.prototype.updatePlayer = function (practice, player) {
        return __awaiter(this, void 0, void 0, function () {
            var players, newPlayer, _i, players_1, x, _a, players_2, player_1, _b, _c, _d, i, judge_state, multiplier, _e, players_3, player_2, i, multiplier, i;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0: return [4 /*yield*/, this.getPlayers()];
                    case 1:
                        players = _f.sent(), newPlayer = true;
                        for (_i = 0, players_1 = players; _i < players_1.length; _i++) {
                            x = players_1[_i];
                            if (x.user_id === player.user_id) {
                                newPlayer = false;
                                break;
                            }
                        }
                        if (newPlayer) {
                            players.push(player);
                        }
                        if (!(practice.type === 'noi' || practice.type === 'ioi')) return [3 /*break*/, 10];
                        _a = 0, players_2 = players;
                        _f.label = 2;
                    case 2:
                        if (!(_a < players_2.length)) return [3 /*break*/, 9];
                        player_1 = players_2[_a];
                        player_1.latest = 0;
                        player_1.score = 0;
                        _b = [];
                        for (_c in player_1.score_details)
                            _b.push(_c);
                        _d = 0;
                        _f.label = 3;
                    case 3:
                        if (!(_d < _b.length)) return [3 /*break*/, 6];
                        i = _b[_d];
                        return [4 /*yield*/, judge_state_1["default"].findById(player_1.score_details[i].judge_id)];
                    case 4:
                        judge_state = _f.sent();
                        if (!judge_state)
                            return [3 /*break*/, 5];
                        player_1.latest = Math.max(player_1.latest, judge_state.submit_time);
                        if (player_1.score_details[i].score != null) {
                            multiplier = this.ranking_params[i] || 1.0;
                            player_1.score_details[i].weighted_score = Math.round(player_1.score_details[i].score * multiplier);
                            player_1.score += player_1.score_details[i].weighted_score;
                        }
                        _f.label = 5;
                    case 5:
                        _d++;
                        return [3 /*break*/, 3];
                    case 6: return [4 /*yield*/, player_1.save()];
                    case 7:
                        _f.sent();
                        _f.label = 8;
                    case 8:
                        _a++;
                        return [3 /*break*/, 2];
                    case 9:
                        players.sort(function (a, b) {
                            if (a.score > b.score)
                                return -1;
                            if (b.score > a.score)
                                return 1;
                            if (a.latest < b.latest)
                                return -1;
                            if (a.latest > b.latest)
                                return 1;
                            return 0;
                        });
                        return [3 /*break*/, 15];
                    case 10:
                        _e = 0, players_3 = players;
                        _f.label = 11;
                    case 11:
                        if (!(_e < players_3.length)) return [3 /*break*/, 14];
                        player_2 = players_3[_e];
                        player_2.timeSum = 0;
                        player_2.score = 0;
                        for (i in player_2.score_details) {
                            if (player_2.score_details[i].accepted) {
                                multiplier = this.ranking_params[i] || 1.0;
                                player_2.score_details[i].weighted_score = Math.round(multiplier * 100);
                                player_2.score += player_2.score_details[i].weighted_score;
                                player_2.timeSum += (player_2.score_details[i].acceptedTime - practice.start_time) + (player_2.score_details[i].unacceptedCount * 20 * 60);
                            }
                        }
                        return [4 /*yield*/, player_2.save()];
                    case 12:
                        _f.sent();
                        _f.label = 13;
                    case 13:
                        _e++;
                        return [3 /*break*/, 11];
                    case 14:
                        players.sort(function (a, b) {
                            if (a.score > b.score)
                                return -1;
                            if (b.score > a.score)
                                return 1;
                            if (a.timeSum < b.timeSum)
                                return -1;
                            if (a.timeSum > b.timeSum)
                                return 1;
                            return 0;
                        });
                        _f.label = 15;
                    case 15:
                        this.ranklist = { player_num: players.length };
                        for (i = 0; i < players.length; i++)
                            this.ranklist[i + 1] = players[i].id;
                        return [2 /*return*/];
                }
            });
        });
    };
    __decorate([
        TypeORM.PrimaryGeneratedColumn(),
        __metadata("design:type", Number)
    ], PracticeRanklist.prototype, "id");
    __decorate([
        TypeORM.Column({ nullable: true, type: "json" }),
        __metadata("design:type", Object)
    ], PracticeRanklist.prototype, "ranking_params");
    __decorate([
        TypeORM.Column({ "default": JSON.stringify({ player_num: 0 }), type: "json" }),
        __metadata("design:type", Object)
    ], PracticeRanklist.prototype, "ranklist");
    PracticeRanklist = __decorate([
        TypeORM.Entity()
    ], PracticeRanklist);
    return PracticeRanklist;
}(common_1["default"]));
exports["default"] = PracticeRanklist;
//# sourceMappingURL=practice_ranklist.js.map