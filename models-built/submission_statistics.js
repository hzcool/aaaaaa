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
exports.__esModule = true;
var TypeORM = require("typeorm");
var common_1 = require("./common");
var StatisticsType;
(function (StatisticsType) {
    StatisticsType["FASTEST"] = "fastest";
    StatisticsType["SLOWEST"] = "slowest";
    StatisticsType["SHORTEST"] = "shortest";
    StatisticsType["LONGEST"] = "longest";
    StatisticsType["MEMORY_MIN"] = "min";
    StatisticsType["MEMORY_MAX"] = "max";
    StatisticsType["EARLIEST"] = "earliest";
})(StatisticsType = exports.StatisticsType || (exports.StatisticsType = {}));
var SubmissionStatistics = /** @class */ (function (_super) {
    __extends(SubmissionStatistics, _super);
    function SubmissionStatistics() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SubmissionStatistics.cache = false;
    __decorate([
        TypeORM.PrimaryColumn({ type: "integer" }),
        __metadata("design:type", Number)
    ], SubmissionStatistics.prototype, "problem_id");
    __decorate([
        TypeORM.PrimaryColumn({ type: "integer" }),
        __metadata("design:type", Number)
    ], SubmissionStatistics.prototype, "user_id");
    __decorate([
        TypeORM.PrimaryColumn({ type: "enum", "enum": StatisticsType }),
        __metadata("design:type", String)
    ], SubmissionStatistics.prototype, "type");
    __decorate([
        TypeORM.Column({ type: "integer" }),
        __metadata("design:type", Number)
    ], SubmissionStatistics.prototype, "key");
    __decorate([
        TypeORM.Column({ type: "integer" }),
        __metadata("design:type", Number)
    ], SubmissionStatistics.prototype, "submission_id");
    SubmissionStatistics = __decorate([
        TypeORM.Entity(),
        TypeORM.Index(['problem_id', 'type', 'key'])
    ], SubmissionStatistics);
    return SubmissionStatistics;
}(common_1["default"]));
exports["default"] = SubmissionStatistics;
;
//# sourceMappingURL=submission_statistics.js.map