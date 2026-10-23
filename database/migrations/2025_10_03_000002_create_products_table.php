<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id('product_id')->autoIncrement();
            $table->string('name', 150);
            $table->string('brand', 80)->default('');
            $table->text('description')->nullable();
            $table->foreignId('category_id');
            $table->decimal('price', 12, 2);
            $table->string('img')->nullable();          // path storage ATAU url gambar
            $table->integer('stock')->default(0);
            $table->unsignedSmallInteger('size_min')->default(38);
            $table->unsignedSmallInteger('size_max')->default(43);
            $table->string('color1', 7)->default('#6366f1');
            $table->string('color2', 7)->default('#ec4899');
            $table->decimal('rating', 2, 1)->default(4.5);
            $table->string('slug')->unique();
            $table->timestamps();

            // Foreign key ke categories
            $table->foreign('category_id')->references('category_id')
                  ->on('categories')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
