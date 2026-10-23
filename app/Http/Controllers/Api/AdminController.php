<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Endpoint dashboard admin (di balik auth:sanctum + AdminOnly).
 */
class AdminController extends Controller
{
    // GET /api/admin/stats
    public function stats()
    {
        $recent = Order::with(['user', 'items'])
            ->orderByDesc('id')
            ->take(5)
            ->get()
            ->map(fn ($o) => $o->toPayload())
            ->values();

        return response()->json([
            'products'      => Product::count(),
            'customers'     => User::where('role', 'user')->count(),
            'orders'        => Order::count(),
            'revenue'       => (float) Order::where('status', '!=', 'cancelled')->sum('total'),
            'low_stock'     => Product::where('stock', '<=', 5)->count(),
            'recent_orders' => $recent,
        ]);
    }

    // GET /api/admin/orders
    public function orders()
    {
        $orders = Order::with(['user', 'items'])
            ->orderByDesc('id')
            ->take(200)
            ->get()
            ->map(fn ($o) => $o->toPayload())
            ->values();

        return response()->json(['data' => $orders]);
    }

    // PATCH /api/admin/orders/{order}  {status}
    public function updateOrderStatus(Request $request, Order $order)
    {
        $status = $request->validate([
            'status' => 'required|in:pending,paid,shipped,done,cancelled',
        ])['status'];

        if ($order->status === 'cancelled' && $status !== 'cancelled') {
            return response()->json(['message' => 'Pesanan yang dibatalkan tidak dapat diubah lagi.'], 422);
        }

        DB::transaction(function () use ($order, $status) {
            // dibatalkan -> kembalikan stok
            if ($status === 'cancelled' && $order->status !== 'cancelled') {
                foreach ($order->items as $item) {
                    if ($item->product_id) {
                        Product::where('product_id', $item->product_id)->increment('stock', $item->qty);
                    }
                }
            }
            $order->update(['status' => $status]);
        });

        return response()->json($order->fresh(['user', 'items'])->toPayload());
    }
}
