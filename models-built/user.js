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
var judge_state_1 = require("./judge_state");
var user_privilege_1 = require("./user_privilege");
var article_1 = require("./article");
var contest_1 = require("./contest");
var practice_1 = require("./practice");
var User = /** @class */ (function (_super) {
    __extends(User, _super);
    function User() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    User_1 = User;
    User.fromEmail = function (email) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, User_1.findOne({
                        where: {
                            email: email
                        }
                    })];
            });
        });
    };
    User.fromName = function (name) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, User_1.findOne({
                        where: {
                            username: name
                        }
                    })];
            });
        });
    };
    User.prototype.isAllowedEditBy = function (user) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!user)
                            return [2 /*return*/, false];
                        return [4 /*yield*/, user.hasPrivilege('manage_user')];
                    case 1:
                        if (_a.sent())
                            return [2 /*return*/, true];
                        return [2 /*return*/, user && (user.is_admin || this.id === user.id)];
                }
            });
        });
    };
    User.prototype.getQueryBuilderForACProblems = function () {
        return judge_state_1["default"].createQueryBuilder()
            .select("DISTINCT(problem_id)")
            .where('user_id = :user_id', { user_id: this.id })
            .andWhere('status = :status', { status: 'Accepted' })
            .andWhere('type != 1')
            .orderBy({ problem_id: 'ASC' });
    };
    User.prototype.refreshSubmitInfo = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, syzoj.utils.lock(['User::refreshSubmitInfo', this.id], function () { return __awaiter(_this, void 0, void 0, function () {
                            var _a, _b;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        _a = this;
                                        return [4 /*yield*/, judge_state_1["default"].countQuery(this.getQueryBuilderForACProblems())];
                                    case 1:
                                        _a.ac_num = _c.sent();
                                        _b = this;
                                        return [4 /*yield*/, judge_state_1["default"].count({
                                                user_id: this.id,
                                                type: TypeORM.Not(1) && TypeORM.Not(2) // Not a contest submission
                                            })];
                                    case 2:
                                        _b.submit_num = _c.sent();
                                        return [4 /*yield*/, this.save()];
                                    case 3:
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
    User.prototype.getACProblems = function () {
        return __awaiter(this, void 0, void 0, function () {
            var queryResult;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getQueryBuilderForACProblems().getRawMany()];
                    case 1:
                        queryResult = _a.sent();
                        return [2 /*return*/, queryResult.map(function (record) { return record['problem_id']; })];
                }
            });
        });
    };
    User.prototype.getArticles = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, article_1["default"].find({
                            where: {
                                user_id: this.id
                            }
                        })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    User.prototype.getStatistics = function () {
        return __awaiter(this, void 0, void 0, function () {
            var statuses, res, _a, _b, _i, status_1, _c, _d, s, _e, _f, _g;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        statuses = {
                            "Accepted": ["Accepted"],
                            "Wrong Answer": ["Wrong Answer", "File Error", "Output Limit Exceeded"],
                            "Runtime Error": ["Runtime Error"],
                            "Time Limit Exceeded": ["Time Limit Exceeded"],
                            "Memory Limit Exceeded": ["Memory Limit Exceeded"],
                            "Compile Error": ["Compile Error"]
                        };
                        res = {};
                        _a = [];
                        for (_b in statuses)
                            _a.push(_b);
                        _i = 0;
                        _h.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 6];
                        status_1 = _a[_i];
                        res[status_1] = 0;
                        _c = 0, _d = statuses[status_1];
                        _h.label = 2;
                    case 2:
                        if (!(_c < _d.length)) return [3 /*break*/, 5];
                        s = _d[_c];
                        _e = res;
                        _f = status_1;
                        _g = _e[_f];
                        return [4 /*yield*/, judge_state_1["default"].count({
                                user_id: this.id,
                                type: 0,
                                status: s
                            })];
                    case 3:
                        _e[_f] = _g + _h.sent();
                        _h.label = 4;
                    case 4:
                        _c++;
                        return [3 /*break*/, 2];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/, res];
                }
            });
        });
    };
    User.prototype.renderInformation = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = this;
                        return [4 /*yield*/, syzoj.utils.markdown(this.information)];
                    case 1:
                        _a.information = _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    User.prototype.getPrivileges = function () {
        return __awaiter(this, void 0, void 0, function () {
            var privileges;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, user_privilege_1["default"].find({
                            where: {
                                user_id: this.id
                            }
                        })];
                    case 1:
                        privileges = _a.sent();
                        return [2 /*return*/, privileges.map(function (x) { return x.privilege; })];
                }
            });
        });
    };
    User.prototype.setPrivileges = function (newPrivileges) {
        return __awaiter(this, void 0, void 0, function () {
            var oldPrivileges, delPrivileges, addPrivileges, _i, delPrivileges_1, privilege, obj, _a, addPrivileges_1, privilege, obj;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.getPrivileges()];
                    case 1:
                        oldPrivileges = _b.sent();
                        delPrivileges = oldPrivileges.filter(function (x) { return !newPrivileges.includes(x); });
                        addPrivileges = newPrivileges.filter(function (x) { return !oldPrivileges.includes(x); });
                        _i = 0, delPrivileges_1 = delPrivileges;
                        _b.label = 2;
                    case 2:
                        if (!(_i < delPrivileges_1.length)) return [3 /*break*/, 6];
                        privilege = delPrivileges_1[_i];
                        return [4 /*yield*/, user_privilege_1["default"].findOne({ where: {
                                    user_id: this.id,
                                    privilege: privilege
                                } })];
                    case 3:
                        obj = _b.sent();
                        return [4 /*yield*/, obj.destroy()];
                    case 4:
                        _b.sent();
                        _b.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 2];
                    case 6:
                        _a = 0, addPrivileges_1 = addPrivileges;
                        _b.label = 7;
                    case 7:
                        if (!(_a < addPrivileges_1.length)) return [3 /*break*/, 11];
                        privilege = addPrivileges_1[_a];
                        return [4 /*yield*/, user_privilege_1["default"].create({
                                user_id: this.id,
                                privilege: privilege
                            })];
                    case 8:
                        obj = _b.sent();
                        return [4 /*yield*/, obj.save()];
                    case 9:
                        _b.sent();
                        _b.label = 10;
                    case 10:
                        _a++;
                        return [3 /*break*/, 7];
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    User.prototype.hasPrivilege = function (privilege) {
        return __awaiter(this, void 0, void 0, function () {
            var x;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.is_admin)
                            return [2 /*return*/, true];
                        return [4 /*yield*/, user_privilege_1["default"].findOne({ where: { user_id: this.id, privilege: privilege } })];
                    case 1:
                        x = _a.sent();
                        return [2 /*return*/, !!x];
                }
            });
        });
    };
    User.prototype.getLastSubmitLanguage = function () {
        return __awaiter(this, void 0, void 0, function () {
            var a;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, judge_state_1["default"].findOne({
                            where: {
                                user_id: this.id
                            },
                            order: {
                                submit_time: 'DESC'
                            }
                        })];
                    case 1:
                        a = _a.sent();
                        if (a)
                            return [2 /*return*/, a.language];
                        return [2 /*return*/, null];
                }
            });
        });
    };
    /*async getconts(){
        let mygid = this.group_id;
        let sql = `SELECT id FROM contest WHERE  ( group_id LIKE '${mygid}' OR group_id LIKE '${mygid}|%' OR group_id LIKE '%|${mygid}' OR group_id LIKE '%|${mygid}|%' OR group_id LIKE 'all' ) AND ( is_public = 1 )  `;
        let myconts = ( await Contest.query(sql) ).map(row=>row['id']);
        return myconts ;
    }*/
    User.prototype.getconts = function () {
        return __awaiter(this, void 0, void 0, function () {
            var mygid, srt_time, sql, res, myconts, i, row, f, j, k;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mygid = (this.group_id).split("|");
                        srt_time = this.start_time;
                        sql = "SELECT id,group_id FROM contest where start_time>=" + srt_time + " ";
                        return [4 /*yield*/, contest_1["default"].query(sql)];
                    case 1:
                        res = _a.sent();
                        myconts = [];
                        for (i = 0; i < res.length; ++i) {
                            row = res[i]["group_id"];
                            row = row.split("|");
                            f = 0;
                            for (j = 0; j < row.length; ++j) {
                                for (k = 0; k < mygid.length; k++) {
                                    if (row[j] == mygid[k]) {
                                        f = 1;
                                        break;
                                    }
                                }
                                if (f == 1)
                                    break;
                            }
                            if (f == 1)
                                myconts.push(res[i]["id"]);
                        }
                        return [2 /*return*/, myconts];
                }
            });
        });
    };
    User.prototype.getcontprobs = function () {
        return __awaiter(this, void 0, void 0, function () {
            var c, contests, sql, res, mycp, i, row;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getconts()];
                    case 1:
                        c = _a.sent();
                        contests = c.toString();
                        sql = "SELECT problems FROM contest WHERE ( id in (" + contests + ") OR group_id LIKE 'all' ) AND ( is_public = 1 ) AND ( end_time < unix_timestamp(now()) )  ";
                        return [4 /*yield*/, contest_1["default"].query(sql)];
                    case 2:
                        res = _a.sent();
                        mycp = [];
                        for (i = 0; i < res.length; ++i) {
                            row = res[i]['problems'];
                            row = row.split('|');
                            mycp = mycp.concat(row);
                        }
                        mycp = mycp.map(function (a) { return parseInt(a); });
                        return [2 /*return*/, mycp];
                }
            });
        });
    };
    User.prototype.getpracs = function () {
        return __awaiter(this, void 0, void 0, function () {
            var mygid, srt_time, sql, res, myconts, i, row, f, j, k;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mygid = (this.group_id).split("|");
                        srt_time = this.start_time;
                        sql = "SELECT id,group_id FROM practice where start_time>=" + srt_time + " ";
                        return [4 /*yield*/, practice_1["default"].query(sql)];
                    case 1:
                        res = _a.sent();
                        myconts = [];
                        for (i = 0; i < res.length; ++i) {
                            row = res[i]["group_id"];
                            row = row.split("|");
                            f = 0;
                            for (j = 0; j < row.length; ++j) {
                                for (k = 0; k < mygid.length; k++) {
                                    if (row[j] == mygid[k]) {
                                        f = 1;
                                        break;
                                    }
                                }
                                if (f == 1)
                                    break;
                            }
                            if (f == 1)
                                myconts.push(res[i]["id"]);
                        }
                        return [2 /*return*/, myconts];
                }
            });
        });
    };
    User.prototype.getpracprobs = function () {
        return __awaiter(this, void 0, void 0, function () {
            var c, practices, sql, res, mycp, i, row;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getpracs()];
                    case 1:
                        c = _a.sent();
                        practices = c.toString();
                        if (!practices)
                            return [2 /*return*/, []];
                        sql = "SELECT problems FROM practice WHERE ( id in (" + practices + ") OR group_id LIKE 'all' ) AND ( is_public = 1 )  ";
                        return [4 /*yield*/, practice_1["default"].query(sql)];
                    case 2:
                        res = _a.sent();
                        mycp = [];
                        for (i = 0; i < res.length; ++i) {
                            row = res[i]['problems'];
                            row = row.split('|');
                            mycp = mycp.concat(row);
                        }
                        mycp = mycp.map(function (a) { return parseInt(a); });
                        return [2 /*return*/, mycp];
                }
            });
        });
    };
    User.prototype.isEnded = function () {
        if (!this.end_time)
            return false;
        var now = syzoj.utils.getCurrentDate();
        return now >= this.end_time;
    };
    var User_1;
    User.cache = true;
    __decorate([
        TypeORM.PrimaryGeneratedColumn(),
        __metadata("design:type", Number)
    ], User.prototype, "id");
    __decorate([
        TypeORM.Index({ unique: true }),
        TypeORM.Column({ nullable: true, type: "varchar", length: 80 }),
        __metadata("design:type", String)
    ], User.prototype, "username");
    __decorate([
        TypeORM.Column({ nullable: true, type: "varchar", length: 120 }),
        __metadata("design:type", String)
    ], User.prototype, "email");
    __decorate([
        TypeORM.Column({ nullable: true, type: "varchar", length: 120 }),
        __metadata("design:type", String)
    ], User.prototype, "password");
    __decorate([
        TypeORM.Column({ nullable: true, type: "varchar", length: 80 }),
        __metadata("design:type", String)
    ], User.prototype, "nickname");
    __decorate([
        TypeORM.Column({ nullable: true, type: "text" }),
        __metadata("design:type", String)
    ], User.prototype, "nameplate");
    __decorate([
        TypeORM.Column({ nullable: true, type: "text" }),
        __metadata("design:type", String)
    ], User.prototype, "information");
    __decorate([
        TypeORM.Index(),
        TypeORM.Column({ nullable: true, type: "integer" }),
        __metadata("design:type", Number)
    ], User.prototype, "ac_num");
    __decorate([
        TypeORM.Index(),
        TypeORM.Column({ nullable: true, type: "integer" }),
        __metadata("design:type", Number)
    ], User.prototype, "submit_num");
    __decorate([
        TypeORM.Column({ nullable: true, type: "boolean" }),
        __metadata("design:type", Boolean)
    ], User.prototype, "is_admin");
    __decorate([
        TypeORM.Index(),
        TypeORM.Column({ nullable: true, type: "boolean" }),
        __metadata("design:type", Boolean)
    ], User.prototype, "is_show");
    __decorate([
        TypeORM.Column({ nullable: true, type: "boolean", "default": true }),
        __metadata("design:type", Boolean)
    ], User.prototype, "public_email");
    __decorate([
        TypeORM.Column({ nullable: true, type: "boolean", "default": true }),
        __metadata("design:type", Boolean)
    ], User.prototype, "prefer_formatted_code");
    __decorate([
        TypeORM.Column({ nullable: true, type: "integer" }),
        __metadata("design:type", Number)
    ], User.prototype, "sex");
    __decorate([
        TypeORM.Column({ nullable: true, type: "integer" }),
        __metadata("design:type", Number)
    ], User.prototype, "rating");
    __decorate([
        TypeORM.Column({ nullable: true, type: "integer" }),
        __metadata("design:type", Number)
    ], User.prototype, "register_time");
    __decorate([
        TypeORM.Column({ nullable: true, type: "integer" }),
        __metadata("design:type", Number)
    ], User.prototype, "start_time");
    __decorate([
        TypeORM.Column({ nullable: true, type: "integer" }),
        __metadata("design:type", Number)
    ], User.prototype, "end_time");
    __decorate([
        TypeORM.Column({ nullable: true, type: "datetime" }),
        __metadata("design:type", Date)
    ], User.prototype, "last_login_time");
    __decorate([
        TypeORM.Column({ nullable: true, type: "text" }),
        __metadata("design:type", String)
    ], User.prototype, "group_id");
    User = User_1 = __decorate([
        TypeORM.Entity()
    ], User);
    return User;
}(common_1["default"]));
exports["default"] = User;
//# sourceMappingURL=user.js.map