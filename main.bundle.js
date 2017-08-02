webpackJsonp([1],{

/***/ "../../../../../src async recursive":
/***/ (function(module, exports) {

function webpackEmptyContext(req) {
	throw new Error("Cannot find module '" + req + "'.");
}
webpackEmptyContext.keys = function() { return []; };
webpackEmptyContext.resolve = webpackEmptyContext;
module.exports = webpackEmptyContext;
webpackEmptyContext.id = "../../../../../src async recursive";

/***/ }),

/***/ "../../../../../src/app/app.component.css":
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__("../../../../css-loader/lib/css-base.js")(false);
// imports


// module
exports.push([module.i, "", ""]);

// exports


/*** EXPORTS FROM exports-loader ***/
module.exports = module.exports.toString();

/***/ }),

/***/ "../../../../../src/app/app.component.html":
/***/ (function(module, exports) {

module.exports = "\n<div class=\"container\">\n  <app-nav-bar></app-nav-bar>\n  <router-outlet></router-outlet>\n</div>\n\n"

/***/ }),

/***/ "../../../../../src/app/app.component.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("../../../core/@angular/core.es5.js");
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return AppComponent; });
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};

var AppComponent = (function () {
    function AppComponent() {
        this.title = 'BookR';
    }
    return AppComponent;
}());
AppComponent = __decorate([
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_14" /* Component */])({
        selector: 'app-root',
        template: __webpack_require__("../../../../../src/app/app.component.html"),
        styles: [__webpack_require__("../../../../../src/app/app.component.css")]
    })
], AppComponent);

//# sourceMappingURL=app.component.js.map

/***/ }),

/***/ "../../../../../src/app/app.module.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_platform_browser__ = __webpack_require__("../../../platform-browser/@angular/platform-browser.es5.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__angular_core__ = __webpack_require__("../../../core/@angular/core.es5.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__app_component__ = __webpack_require__("../../../../../src/app/app.component.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__dashboard_dashboard_component__ = __webpack_require__("../../../../../src/app/dashboard/dashboard.component.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__bookdetails_bookdetails_component__ = __webpack_require__("../../../../../src/app/bookdetails/bookdetails.component.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__cart_cart_component__ = __webpack_require__("../../../../../src/app/cart/cart.component.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__angular_router__ = __webpack_require__("../../../router/@angular/router.es5.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__app_routing__ = __webpack_require__("../../../../../src/app/app.routing.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8__nav_bar_nav_bar_component__ = __webpack_require__("../../../../../src/app/nav-bar/nav-bar.component.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9__angular_forms__ = __webpack_require__("../../../forms/@angular/forms.es5.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_10__services_BookService__ = __webpack_require__("../../../../../src/app/services/BookService.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_11__angular_common_http__ = __webpack_require__("../../../common/@angular/common/http.es5.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_12__services_CartService__ = __webpack_require__("../../../../../src/app/services/CartService.ts");
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return AppModule; });
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};













var AppModule = (function () {
    function AppModule() {
    }
    return AppModule;
}());
AppModule = __decorate([
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__angular_core__["b" /* NgModule */])({
        declarations: [
            __WEBPACK_IMPORTED_MODULE_2__app_component__["a" /* AppComponent */],
            __WEBPACK_IMPORTED_MODULE_3__dashboard_dashboard_component__["a" /* DashboardComponent */],
            __WEBPACK_IMPORTED_MODULE_4__bookdetails_bookdetails_component__["a" /* BookdetailsComponent */],
            __WEBPACK_IMPORTED_MODULE_5__cart_cart_component__["a" /* CartComponent */],
            __WEBPACK_IMPORTED_MODULE_8__nav_bar_nav_bar_component__["a" /* NavBarComponent */]
        ],
        imports: [
            __WEBPACK_IMPORTED_MODULE_0__angular_platform_browser__["a" /* BrowserModule */],
            __WEBPACK_IMPORTED_MODULE_11__angular_common_http__["a" /* HttpClientModule */],
            __WEBPACK_IMPORTED_MODULE_6__angular_router__["a" /* RouterModule */].forRoot(__WEBPACK_IMPORTED_MODULE_7__app_routing__["a" /* appRoutes */]),
            __WEBPACK_IMPORTED_MODULE_9__angular_forms__["a" /* FormsModule */]
        ],
        providers: [__WEBPACK_IMPORTED_MODULE_10__services_BookService__["a" /* BookService */], __WEBPACK_IMPORTED_MODULE_12__services_CartService__["a" /* CartService */]],
        bootstrap: [__WEBPACK_IMPORTED_MODULE_2__app_component__["a" /* AppComponent */]]
    })
], AppModule);

//# sourceMappingURL=app.module.js.map

/***/ }),

/***/ "../../../../../src/app/app.routing.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__dashboard_dashboard_component__ = __webpack_require__("../../../../../src/app/dashboard/dashboard.component.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__bookdetails_bookdetails_component__ = __webpack_require__("../../../../../src/app/bookdetails/bookdetails.component.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__cart_cart_component__ = __webpack_require__("../../../../../src/app/cart/cart.component.ts");
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return appRoutes; });



var appRoutes = [
    { path: '', component: __WEBPACK_IMPORTED_MODULE_0__dashboard_dashboard_component__["a" /* DashboardComponent */] },
    { path: 'book/:id', component: __WEBPACK_IMPORTED_MODULE_1__bookdetails_bookdetails_component__["a" /* BookdetailsComponent */] },
    { path: 'cart', component: __WEBPACK_IMPORTED_MODULE_2__cart_cart_component__["a" /* CartComponent */] }
];
//# sourceMappingURL=app.routing.js.map

/***/ }),

/***/ "../../../../../src/app/bookdetails/bookdetails.component.css":
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__("../../../../css-loader/lib/css-base.js")(false);
// imports


// module
exports.push([module.i, "", ""]);

// exports


/*** EXPORTS FROM exports-loader ***/
module.exports = module.exports.toString();

/***/ }),

/***/ "../../../../../src/app/bookdetails/bookdetails.component.html":
/***/ (function(module, exports) {

module.exports = "<div *ngIf=\"book\">\n\n\n  <div class=\"row\">\n    <div class=\"col-sm-2\">\n      <img src=\"{{book.cover}}\">\n    </div>\n    <div class=\"col-sm-10\">\n      <div>\n        <h2>{{book.title}}</h2>\n      </div>\n      <div>\n        <h4>Author(s):</h4>\n        <p>{{book.authors}}</p>\n      </div>\n      <h4>Description:</h4>\n      <div [innerHTML]=\"book.description\">\n\n      </div>\n      <button (click)=\"addBookToCart(book)\">Add to cart</button>\n    </div>\n\n\n  </div>\n\n\n</div>\n\n"

/***/ }),

/***/ "../../../../../src/app/bookdetails/bookdetails.component.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("../../../core/@angular/core.es5.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__angular_router__ = __webpack_require__("../../../router/@angular/router.es5.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_rxjs_add_operator_switchMap__ = __webpack_require__("../../../../rxjs/add/operator/switchMap.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_rxjs_add_operator_switchMap___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2_rxjs_add_operator_switchMap__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__services_BookService__ = __webpack_require__("../../../../../src/app/services/BookService.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__services_CartService__ = __webpack_require__("../../../../../src/app/services/CartService.ts");
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return BookdetailsComponent; });
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};





var BookdetailsComponent = (function () {
    function BookdetailsComponent(route, bookService, cartService) {
        this.route = route;
        this.bookService = bookService;
        this.cartService = cartService;
    }
    BookdetailsComponent.prototype.ngOnInit = function () {
        var _this = this;
        this.route.paramMap
            .switchMap(function (params) {
            return _this.bookService.getBook(params.get('id'));
        })
            .subscribe(function (book) { return _this.book = book; });
    };
    BookdetailsComponent.prototype.addBookToCart = function (book) {
        this.cartService.addBook(book);
    };
    return BookdetailsComponent;
}());
BookdetailsComponent = __decorate([
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_14" /* Component */])({
        selector: 'app-bookdetails',
        template: __webpack_require__("../../../../../src/app/bookdetails/bookdetails.component.html"),
        styles: [__webpack_require__("../../../../../src/app/bookdetails/bookdetails.component.css")]
    }),
    __metadata("design:paramtypes", [typeof (_a = typeof __WEBPACK_IMPORTED_MODULE_1__angular_router__["c" /* ActivatedRoute */] !== "undefined" && __WEBPACK_IMPORTED_MODULE_1__angular_router__["c" /* ActivatedRoute */]) === "function" && _a || Object, typeof (_b = typeof __WEBPACK_IMPORTED_MODULE_3__services_BookService__["a" /* BookService */] !== "undefined" && __WEBPACK_IMPORTED_MODULE_3__services_BookService__["a" /* BookService */]) === "function" && _b || Object, typeof (_c = typeof __WEBPACK_IMPORTED_MODULE_4__services_CartService__["a" /* CartService */] !== "undefined" && __WEBPACK_IMPORTED_MODULE_4__services_CartService__["a" /* CartService */]) === "function" && _c || Object])
], BookdetailsComponent);

var _a, _b, _c;
//# sourceMappingURL=bookdetails.component.js.map

/***/ }),

/***/ "../../../../../src/app/cart/cart.component.css":
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__("../../../../css-loader/lib/css-base.js")(false);
// imports


// module
exports.push([module.i, "", ""]);

// exports


/*** EXPORTS FROM exports-loader ***/
module.exports = module.exports.toString();

/***/ }),

/***/ "../../../../../src/app/cart/cart.component.html":
/***/ (function(module, exports) {

module.exports = "<div *ngIf=\"cart\">\n  <ul class=\"list-group\">\n    <li class=\"list-group-item\" *ngFor=\"let book of cart\">\n      <h3 ><a class=\"clickable\" (click)=\"onSelect(book)\">{{book.title}}</a></h3>\n      <p>{{book.authors}}</p>\n      <button (click)=\"removeBook(book)\">Remove</button>\n    </li>\n  </ul>\n</div>\n\n<div *ngIf=\"!cart || cart.length === 0\">\n  <p>The cart is empty!</p>\n</div>\n"

/***/ }),

/***/ "../../../../../src/app/cart/cart.component.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("../../../core/@angular/core.es5.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__services_CartService__ = __webpack_require__("../../../../../src/app/services/CartService.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__angular_router__ = __webpack_require__("../../../router/@angular/router.es5.js");
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return CartComponent; });
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};



var CartComponent = (function () {
    function CartComponent(cartService, router) {
        this.cartService = cartService;
        this.router = router;
        this.cart = undefined;
    }
    CartComponent.prototype.ngOnInit = function () {
        this.loadCart();
    };
    CartComponent.prototype.loadCart = function () {
        this.cart = this.cartService.getCart();
    };
    CartComponent.prototype.removeBook = function (book) {
        this.cartService.removeBook(book);
        this.loadCart();
    };
    CartComponent.prototype.onSelect = function (book) {
        this.router.navigate(['/book', book.id]);
    };
    return CartComponent;
}());
CartComponent = __decorate([
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_14" /* Component */])({
        selector: 'app-cart',
        template: __webpack_require__("../../../../../src/app/cart/cart.component.html"),
        styles: [__webpack_require__("../../../../../src/app/cart/cart.component.css")]
    }),
    __metadata("design:paramtypes", [typeof (_a = typeof __WEBPACK_IMPORTED_MODULE_1__services_CartService__["a" /* CartService */] !== "undefined" && __WEBPACK_IMPORTED_MODULE_1__services_CartService__["a" /* CartService */]) === "function" && _a || Object, typeof (_b = typeof __WEBPACK_IMPORTED_MODULE_2__angular_router__["b" /* Router */] !== "undefined" && __WEBPACK_IMPORTED_MODULE_2__angular_router__["b" /* Router */]) === "function" && _b || Object])
], CartComponent);

var _a, _b;
//# sourceMappingURL=cart.component.js.map

/***/ }),

/***/ "../../../../../src/app/dashboard/dashboard.component.css":
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__("../../../../css-loader/lib/css-base.js")(false);
// imports


// module
exports.push([module.i, "", ""]);

// exports


/*** EXPORTS FROM exports-loader ***/
module.exports = module.exports.toString();

/***/ }),

/***/ "../../../../../src/app/dashboard/dashboard.component.html":
/***/ (function(module, exports) {

module.exports = "<form #searchForm=\"ngForm\" (ngSubmit)=\"searchBooks()\">\n  <div class=\"form-group\">\n    <label for=\"searchField\">Search field:</label>\n    <input required class=\"form-control\" id=\"searchField\" [(ngModel)]=\"values\" name=\"searchField\" #searchField=\"ngModel\" >\n\n    <div *ngIf=\"searchField.errors && (searchField.dirty || searchField.touched)\"\n         class=\"alert alert-danger\">\n      <div [hidden]=\"!searchField.errors.required\">\n        Please fill the search field!\n      </div>\n    </div>\n\n  </div>\n  <button class=\"btn btn-default\" [disabled]=\"!searchForm.form.valid\" >Search!</button>\n</form>\n<br>\n<div *ngIf=\"books\">\n  <ul class=\"list-group\">\n    <li class=\"list-group-item\" *ngFor=\"let book of books\">\n      <h3 ><a class=\"clickable\" (click)=\"onSelect(book)\">{{book.title}}</a></h3>\n      <p>{{book.authors}}</p>\n      <button (click)=\"addBookToCart(book)\">Add to cart</button>\n    </li>\n  </ul>\n</div>\n\n<div *ngIf=\"result && books.length == 0\">\n  <p>No results found!</p>\n</div>\n"

/***/ }),

/***/ "../../../../../src/app/dashboard/dashboard.component.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("../../../core/@angular/core.es5.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__services_BookService__ = __webpack_require__("../../../../../src/app/services/BookService.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__angular_router__ = __webpack_require__("../../../router/@angular/router.es5.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__services_CartService__ = __webpack_require__("../../../../../src/app/services/CartService.ts");
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return DashboardComponent; });
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};




var DashboardComponent = (function () {
    function DashboardComponent(bookService, router, cartService) {
        this.bookService = bookService;
        this.router = router;
        this.cartService = cartService;
        this.values = '';
        this.result = false;
        this.books = [];
    }
    DashboardComponent.prototype.ngOnInit = function () {
    };
    DashboardComponent.prototype.searchBooks = function () {
        this.getBooksFromApi(this.values);
    };
    DashboardComponent.prototype.onSelect = function (book) {
        this.router.navigate(['/book', book.id]);
    };
    DashboardComponent.prototype.getBooksFromApi = function (query) {
        var _this = this;
        this.bookService.getBooks(query).subscribe(function (results) { return _this.books = results || []; }, function () { return console.log("onError"); }, function () { return _this.result = _this.books.length === 0; });
    };
    DashboardComponent.prototype.addBookToCart = function (book) {
        this.cartService.addBook(book);
    };
    return DashboardComponent;
}());
DashboardComponent = __decorate([
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_14" /* Component */])({
        selector: 'app-dashboard',
        template: __webpack_require__("../../../../../src/app/dashboard/dashboard.component.html"),
        styles: [__webpack_require__("../../../../../src/app/dashboard/dashboard.component.css")]
    }),
    __metadata("design:paramtypes", [typeof (_a = typeof __WEBPACK_IMPORTED_MODULE_1__services_BookService__["a" /* BookService */] !== "undefined" && __WEBPACK_IMPORTED_MODULE_1__services_BookService__["a" /* BookService */]) === "function" && _a || Object, typeof (_b = typeof __WEBPACK_IMPORTED_MODULE_2__angular_router__["b" /* Router */] !== "undefined" && __WEBPACK_IMPORTED_MODULE_2__angular_router__["b" /* Router */]) === "function" && _b || Object, typeof (_c = typeof __WEBPACK_IMPORTED_MODULE_3__services_CartService__["a" /* CartService */] !== "undefined" && __WEBPACK_IMPORTED_MODULE_3__services_CartService__["a" /* CartService */]) === "function" && _c || Object])
], DashboardComponent);

var _a, _b, _c;
//# sourceMappingURL=dashboard.component.js.map

/***/ }),

/***/ "../../../../../src/app/nav-bar/nav-bar.component.css":
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__("../../../../css-loader/lib/css-base.js")(false);
// imports


// module
exports.push([module.i, "", ""]);

// exports


/*** EXPORTS FROM exports-loader ***/
module.exports = module.exports.toString();

/***/ }),

/***/ "../../../../../src/app/nav-bar/nav-bar.component.html":
/***/ (function(module, exports) {

module.exports = "<header>\n  <nav class='navbar navbar-sticky-top navbar-dark bg-inverse'>\n    <ul class='nav navbar-nav'>\n      <li class='nav-item'>\n        <span class='navbar-brand'>BookR</span>\n      </li>\n    </ul>\n    <ul class='nav navbar-nav pull-xs-right'>\n      <li class='nav-item' >\n        <a class='nav-link' routerLink=\"/\">Home</a>\n      </li>\n      <li class='nav-item' >\n        <a class='nav-link' routerLink=\"/cart\">Cart</a>\n      </li>\n\n    </ul>\n  </nav>\n</header>\n"

/***/ }),

/***/ "../../../../../src/app/nav-bar/nav-bar.component.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("../../../core/@angular/core.es5.js");
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return NavBarComponent; });
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};

var NavBarComponent = (function () {
    function NavBarComponent() {
    }
    NavBarComponent.prototype.ngOnInit = function () {
    };
    return NavBarComponent;
}());
NavBarComponent = __decorate([
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_14" /* Component */])({
        selector: 'app-nav-bar',
        template: __webpack_require__("../../../../../src/app/nav-bar/nav-bar.component.html"),
        styles: [__webpack_require__("../../../../../src/app/nav-bar/nav-bar.component.css")]
    }),
    __metadata("design:paramtypes", [])
], NavBarComponent);

//# sourceMappingURL=nav-bar.component.js.map

/***/ }),

/***/ "../../../../../src/app/services/BookService.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("../../../core/@angular/core.es5.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__angular_common_http__ = __webpack_require__("../../../common/@angular/common/http.es5.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_rxjs_add_operator_map__ = __webpack_require__("../../../../rxjs/add/operator/map.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_rxjs_add_operator_map___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2_rxjs_add_operator_map__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return Book; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return BookService; });
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};



var Book = (function () {
    function Book(id, title, authors, description, cover) {
        this.id = id;
        this.title = title;
        this.authors = authors;
        this.description = description;
        this.cover = cover;
    }
    return Book;
}());

var BookService = (function () {
    function BookService(http) {
        this.http = http;
        this.searchUrl = 'https://www.googleapis.com/books/v1/volumes';
        this.oneBookUrl = 'https://www.googleapis.com/books/v1/volumes/';
    }
    BookService.prototype.getBook = function (id) {
        var _this = this;
        var apiUrl = this.oneBookUrl + id;
        return this.http
            .get(apiUrl)
            .map(function (response) { return _this.createBook(response); });
    };
    BookService.prototype.getBooks = function (query) {
        var _this = this;
        var apiUrl = this.searchUrl + '?q=' + query.split(" ").join("+");
        console.log(apiUrl);
        return this.http
            .get(apiUrl)
            .map(function (response) { return _this.extractResult(response["items"]); });
    };
    BookService.prototype.extractResult = function (result) {
        return result && result.map(this.createBook);
    };
    BookService.prototype.createBook = function (item) {
        var volumeInfo = item.volumeInfo;
        var imageLink = volumeInfo.imageLinks && volumeInfo.imageLinks.thumbnail;
        return new Book(item.id, volumeInfo.title, volumeInfo.authors, volumeInfo.description, imageLink);
    };
    return BookService;
}());
BookService = __decorate([
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__angular_core__["c" /* Injectable */])(),
    __metadata("design:paramtypes", [typeof (_a = typeof __WEBPACK_IMPORTED_MODULE_1__angular_common_http__["b" /* HttpClient */] !== "undefined" && __WEBPACK_IMPORTED_MODULE_1__angular_common_http__["b" /* HttpClient */]) === "function" && _a || Object])
], BookService);

var _a;
//# sourceMappingURL=BookService.js.map

/***/ }),

/***/ "../../../../../src/app/services/CartService.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("../../../core/@angular/core.es5.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__BookService__ = __webpack_require__("../../../../../src/app/services/BookService.ts");
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return CartService; });
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};


var CartService = (function () {
    function CartService() {
        this.cart = [];
    }
    CartService.prototype.addBook = function (book) {
        this.cart.push(book);
        this.saveCart();
    };
    CartService.prototype.removeBook = function (book) {
        this.cart = this.cart.filter(function (item) { return item.id !== book.id; });
        this.saveCart();
    };
    CartService.prototype.getCart = function () {
        this.loadCart();
        return this.cart;
    };
    CartService.prototype.saveCart = function () {
        localStorage.setItem('currentUser', JSON.stringify(this.cart));
    };
    CartService.prototype.loadCart = function () {
        var _this = this;
        var storage = JSON.parse(localStorage.getItem('currentUser'));
        this.cart = storage.map(function (item) { return _this.parseBook(item); });
    };
    CartService.prototype.parseBook = function (item) {
        return new __WEBPACK_IMPORTED_MODULE_1__BookService__["b" /* Book */](item.id, item.title, item.authors, item.description, item.cover);
    };
    return CartService;
}());
CartService = __decorate([
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__angular_core__["c" /* Injectable */])()
], CartService);

//# sourceMappingURL=CartService.js.map

/***/ }),

/***/ "../../../../../src/environments/environment.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return environment; });
// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.
// The file contents for the current environment will overwrite these during build.
var environment = {
    production: false
};
//# sourceMappingURL=environment.js.map

/***/ }),

/***/ "../../../../../src/main.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("../../../core/@angular/core.es5.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__angular_platform_browser_dynamic__ = __webpack_require__("../../../platform-browser-dynamic/@angular/platform-browser-dynamic.es5.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__app_app_module__ = __webpack_require__("../../../../../src/app/app.module.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__environments_environment__ = __webpack_require__("../../../../../src/environments/environment.ts");




if (__WEBPACK_IMPORTED_MODULE_3__environments_environment__["a" /* environment */].production) {
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__angular_core__["a" /* enableProdMode */])();
}
__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__angular_platform_browser_dynamic__["a" /* platformBrowserDynamic */])().bootstrapModule(__WEBPACK_IMPORTED_MODULE_2__app_app_module__["a" /* AppModule */]);
//# sourceMappingURL=main.js.map

/***/ }),

/***/ 0:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__("../../../../../src/main.ts");


/***/ })

},[0]);
//# sourceMappingURL=main.bundle.js.map