<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    // primary key bukan 'id'
    protected $primaryKey = 'category_id';

    // field yang boleh diisi massal
    protected $fillable = ['category'];

    public function products()
    {
        // satu kategori memiliki banyak produk
        return $this->hasMany(Product::class, 'category_id');
    }
}
