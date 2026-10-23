<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Hanya user dengan role 'admin' yang boleh lewat.
 * Dipasang SETELAH auth:sanctum, jadi user sudah terautentikasi.
 */
class AdminOnly
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user || $user->role !== 'admin') {
            return response()->json(['message' => 'Akses ditolak. Khusus admin.'], 403);
        }

        return $next($request);
    }
}
