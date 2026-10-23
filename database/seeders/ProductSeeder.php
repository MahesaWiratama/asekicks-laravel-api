<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        // Gambar diambil dari situs Asekicks (GitHub Pages). Jika tidak bisa dimuat,
        // tampilan otomatis memakai gradasi warna + ikon sepatu.
        $base = 'https://mahesawiratama.github.io/asekicks/images/';

        // [nama, merek, kategori_id, harga, stok, ukuran min, ukuran max, warna1, warna2, rating, file gambar, deskripsi]
        $items = [
            ['Nike Air Max Plus SE', 'Nike', 1, 1679200, 80, 38, 43, '#6366f1', '#ec4899', 4.6, 'nike-air-max-plus.avif',
                'Sneakers dengan bantalan Air yang empuk dan tampilan berani, nyaman untuk kuliah maupun jalan santai.'],
            ['Adidas Samba OG', 'Adidas', 1, 1899000, 8, 39, 42, '#f8fafc', '#94a3b8', 4.4, 'adidas-samba-og.avif',
                'Desain klasik terinspirasi sepatu sepak bola indoor, mudah dipadukan dengan outfit apa pun.'],
            ['Puma Palermo', 'Puma', 1, 1799000, 5, 40, 44, '#f97316', '#ef4444', 4.8, 'puma-palermo.avif',
                'Sneakers gaya terrace retro dengan upper suede dan sol gum yang ikonik.'],
            ['Puma Speedcat', 'Puma', 1, 1399000, 0, 40, 42, '#10b981', '#0d9488', 4.5, 'puma-speedcat.webp',
                'Siluet ramping bergaya motorsport dengan bobot ringan dan sol tipis yang lincah.'],
            ['ASICS Gel-Kayano 14', 'ASICS', 2, 2150000, 4, 40, 43, '#78350f', '#451a03', 4.7, 'asics-gel-kayano-14.webp',
                'Sepatu lari bergaya klasik 2000-an dengan teknologi GEL untuk peredam benturan.'],
            ['Salomon XT 6', 'Salomon', 2, 2799000, 6, 39, 43, '#1e293b', '#0f172a', 4.3, 'salomon-xt6.jpg',
                'Sepatu trail legendaris dengan cengkeraman kuat dan lacing cepat untuk medan campuran.'],
            ['Salomon XT6 Goretex White Silver', 'Salomon', 2, 4399000, 20, 38, 43, '#06b6d4', '#2563eb', 4.2, 'salomon-xt6-goretex-white.webp',
                'Versi tahan air berlapis GORE-TEX dalam warna putih-perak, siap menghadapi hujan.'],
            ['Nike Air Max Phenomena Women', 'Nike', 3, 2759000, 0, 39, 42, '#eab308', '#84cc16', 4.5, 'nike-air-max-phenomena.avif',
                'Sepatu wanita dengan unit Air terlihat dan potongan bersih yang feminin.'],
            ['Puma Speedcat Ballet Nova Women', 'Puma', 3, 1249000, 9, 38, 43, '#38bdf8', '#a78bfa', 4.6, 'puma-speedcat-ballet-nova.avif',
                'Perpaduan flat ballet dan siluet Speedcat, ringan dan nyaman untuk dipakai seharian.'],
        ];

        $rows = [];
        foreach ($items as [$name, $brand, $cat, $price, $stock, $smin, $smax, $c1, $c2, $rating, $file, $desc]) {
            $rows[] = [
                'name'        => $name,
                'brand'       => $brand,
                'slug'        => Str::slug($name),
                'description' => $desc,
                'category_id' => $cat,
                'price'       => $price,
                'img'         => $base . $file,
                'stock'       => $stock,
                'size_min'    => $smin,
                'size_max'    => $smax,
                'color1'      => $c1,
                'color2'      => $c2,
                'rating'      => $rating,
                'created_at'  => now(),
                'updated_at'  => now(),
            ];
        }

        DB::table('products')->insert($rows);
    }
}
