<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('code', 20)->unique();
            $table->string('recipient_name', 120);
            $table->string('phone', 30);
            $table->text('address');
            $table->string('payment_method', 20);
            $table->decimal('subtotal', 12, 2);
            $table->decimal('shipping', 12, 2)->default(0);
            $table->decimal('total', 12, 2);
            $table->string('status', 20)->default('pending'); // pending|paid|shipped|done|cancelled
            $table->timestamps();
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()
                  ->constrained('products', 'product_id')->nullOnDelete();
            $table->string('name', 150);   // salinan nama saat dibeli
            $table->unsignedSmallInteger('size');
            $table->unsignedInteger('qty');
            $table->decimal('price', 12, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
    }
};
