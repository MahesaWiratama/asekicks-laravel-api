<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    // primary key bukan 'id'
    protected $primaryKey = 'product_id';

    // field yang boleh diisi massal
    protected $fillable = [
        'name',
        'brand',
        'description',
        'category_id',
        'price',
        'img',
        'stock',
        'size_min',
        'size_max',
        'color1',
        'color2',
        'rating',
        'slug',
    ];

    public function category()
    {
        // satu produk dimiliki oleh satu kategori
        return $this->belongsTo(Category::class, 'category_id');
    }
}
