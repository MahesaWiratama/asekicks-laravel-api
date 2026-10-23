<?php

use Illuminate\Support\Facades\Route;

// Toko (halaman utama) dan dashboard admin: file statis di folder public/
Route::get('/', fn () => response()->file(public_path('shop.html')));
Route::get('/admin', fn () => response()->file(public_path('admin.html')));
