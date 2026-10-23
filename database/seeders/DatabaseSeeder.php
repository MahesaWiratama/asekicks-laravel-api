<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // ADMIN : test@example.com / password
        $admin = User::factory()->create([
            'name'  => 'Admin Asekicks',
            'email' => 'test@example.com',
        ]);
        $admin->forceFill(['role' => 'admin'])->save();

        // USER biasa : user@example.com / password
        User::factory()->create([
            'name'  => 'Pelanggan Demo',
            'email' => 'user@example.com',
        ]);

        $this->call([
            CategorySeeder::class,
            ProductSeeder::class,
        ]);
    }
}
