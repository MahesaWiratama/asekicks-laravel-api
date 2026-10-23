<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cart_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products', 'product_id')->cascadeOnDelete();
            $table->unsignedSmallInteger('size');
            $table->unsignedInteger('qty')->default(1);
            $table->timestamps();

            $table->unique(['user_id', 'product_id', 'size']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cart_items');
    }
};
