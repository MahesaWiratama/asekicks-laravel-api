<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Middleware\AdminOnly;
use App\Models\Category;
use Illuminate\Support\Facades\Route;

// ---------- Auth (publik) ----------
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Supaya request tanpa token (tanpa header Accept: application/json)
// tetap mendapat 401 JSON, bukan error "Route [login] not defined".
Route::get('/login', fn () => response()->json(['message' => 'Unauthenticated.'], 401))
    ->name('login');

// ---------- Daftar kategori (publik) ----------
Route::get('/categories', fn () => Category::select('category_id', 'category')
    ->orderBy('category')->get());

// ---------- Baca produk (publik): list + search/filter/pagination, detail ----------
Route::apiResource('products', ProductController::class)->only(['index', 'show']);

// ---------- Wajib login (token Sanctum): user biasa maupun admin ----------
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/profile', [AuthController::class, 'profile']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Keranjang: HARUS login
    Route::get('/cart', [CartController::class, 'index']);
    Route::post('/cart', [CartController::class, 'store']);
    Route::delete('/cart', [CartController::class, 'clear']);
    Route::patch('/cart/{cartItem}', [CartController::class, 'update']);
    Route::delete('/cart/{cartItem}', [CartController::class, 'destroy']);

    // Checkout dan pesanan saya
    Route::post('/checkout', [OrderController::class, 'checkout']);
    Route::get('/orders', [OrderController::class, 'index']);

    // ---------- Khusus ADMIN: mutasi produk + dashboard ----------
    Route::middleware(AdminOnly::class)->group(function () {
        Route::apiResource('products', ProductController::class)
            ->only(['store', 'update', 'destroy']);

        Route::get('/admin/stats', [AdminController::class, 'stats']);
        Route::get('/admin/orders', [AdminController::class, 'orders']);
        Route::patch('/admin/orders/{order}', [AdminController::class, 'updateOrderStatus']);
    });
});
