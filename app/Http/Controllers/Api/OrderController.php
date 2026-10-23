<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Checkout dan riwayat pesanan milik user yang login.
 */
class OrderController extends Controller
{
    // GET /api/orders  -> pesanan saya
    public function index(Request $request)
    {
        $orders = Order::with('items')
            ->where('user_id', $request->user()->id)
            ->orderByDesc('id')
            ->get()
            ->map(fn ($o) => $o->toPayload())
            ->values();

        return response()->json(['data' => $orders]);
    }

    // POST /api/checkout
    public function checkout(Request $request)
    {
        $data = $request->validate([
            'recipient_name' => 'required|string|max:120',
            'phone'          => 'required|string|max:30',
            'address'        => 'required|string|max:500',
            'payment_method' => 'required|in:transfer,qris,cod',
        ]);

        $user  = $request->user();
        $items = CartItem::where('user_id', $user->id)->orderBy('id')->get();

        if ($items->isEmpty()) {
            return response()->json(['message' => 'Keranjang masih kosong.'], 422);
        }

        try {
            $order = DB::transaction(function () use ($items, $data, $user) {
                // cek stok terbaru semua item dulu
                $products = [];
                $subtotal = 0.0;
                foreach ($items as $it) {
                    $p = Product::find($it->product_id);
                    if (!$p || $p->stock < $it->qty) {
                        throw new \RuntimeException(
                            'Stok "' . ($p->name ?? 'produk') . '" tidak mencukupi. Perbarui keranjangmu.'
                        );
                    }
                    $products[$it->id] = $p;
                    $subtotal += (float) $p->price * $it->qty;
                }

                $shipping = Order::shippingFee($subtotal);

                do {
                    $code = 'ASK-' . strtoupper(Str::random(6));
                } while (Order::where('code', $code)->exists());

                $order = Order::create([
                    'user_id'        => $user->id,
                    'code'           => $code,
                    'recipient_name' => $data['recipient_name'],
                    'phone'          => $data['phone'],
                    'address'        => $data['address'],
                    'payment_method' => $data['payment_method'],
                    'subtotal'       => $subtotal,
                    'shipping'       => $shipping,
                    'total'          => $subtotal + $shipping,
                    'status'         => 'pending',
                ]);

                foreach ($items as $it) {
                    $p = $products[$it->id];
                    OrderItem::create([
                        'order_id'   => $order->id,
                        'product_id' => $p->product_id,
                        'name'       => $p->name,
                        'size'       => $it->size,
                        'qty'        => $it->qty,
                        'price'      => $p->price,
                    ]);
                    $p->decrement('stock', $it->qty);
                }

                CartItem::where('user_id', $user->id)->delete();

                return $order;
            });
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => 'Pesanan berhasil dibuat',
            'order'   => $order->load('items')->toPayload(),
        ], 201);
    }
}
