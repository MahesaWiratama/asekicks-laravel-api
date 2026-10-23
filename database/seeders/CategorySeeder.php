<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        DB::table('categories')->insert([
            ['category' => 'Sneakers',  'created_at' => now(), 'updated_at' => now()], // id 1
            ['category' => 'Running',   'created_at' => now(), 'updated_at' => now()], // id 2
            ['category' => 'Flatshoes', 'created_at' => now(), 'updated_at' => now()], // id 3
        ]);
    }
}
