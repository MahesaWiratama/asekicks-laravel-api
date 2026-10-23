<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Keranjang milik user yang sedang login (semua route di balik auth:sanctum).
 */
class CartController extends Controller
{
    // GET /api/cart
    public function index(Request $request)
    {
        return response()->json($this->payload($request));
    }

    // POST /api/cart  {product_id, size}  -> tambah 1 pasang
    public function store(Request $request)
    {
        $data = $request->validate([
            'product_id' => 'required|exists:products,product_id',
            'size'       => 'required|integer',
        ]);

        $product = Product::findOrFail($data['product_id']);

        if ($product->stock < 1) {
            return response()->json(['message' => 'Stok habis.'], 422);
        }
        if ($data['size'] < $product->size_min || $data['size'] > $product->size_max) {
            return response()->json(['message' => 'Ukuran tidak tersedia untuk produk ini.'], 422);
        }

        $error = DB::transaction(function () use ($request, $product, $data) {
            $item = CartItem::firstOrNew([
                'user_id'    => $request->user()->id,
                'product_id' => $product->product_id,
                'size'       => $data['size'],
            ]);
            $newQty = ($item->exists ? $item->qty : 0) + 1;

            if ($newQty > $product->stock) {
                return 'Jumlah melebihi stok yang tersedia (' . $product->stock . ' pasang).';
            }

            $item->qty = $newQty;
            $item->save();
            return null;
        });

        if ($error) {
            return response()->json(['message' => $error], 422);
        }

        return response()->json($this->payload($request), 201);
    }

    // PATCH /api/cart/{cartItem}  {qty}
    public function update(Request $request, CartItem $cartItem)
    {
        $this->authorizeOwner($request, $cartItem);

        $data = $request->validate(['qty' => 'required|integer|min:1']);

        $stock = (int) optional($cartItem->product)->stock;
        if ($data['qty'] > $stock) {
            return response()->json(['message' => 'Jumlah melebihi stok yang tersedia (' . $stock . ' pasang).'], 422);
        }

        $cartItem->update(['qty' => $data['qty']]);

        return response()->json($this->payload($request));
    }

    // DELETE /api/cart/{cartItem}
    public function destroy(Request $request, CartItem $cartItem)
    {
        $this->authorizeOwner($request, $cartItem);
        $cartItem->delete();

        return response()->json($this->payload($request));
    }

    // DELETE /api/cart  -> kosongkan
    public function clear(Request $request)
    {
        CartItem::where('user_id', $request->user()->id)->delete();

        return response()->json($this->payload($request));
    }

    private function authorizeOwner(Request $request, CartItem $item): void
    {
        abort_unless($item->user_id === $request->user()->id, 404);
    }

    private function payload(Request $request): array
    {
        $items = CartItem::with('product.category')
            ->where('user_id', $request->user()->id)
            ->orderBy('id')
            ->get()
            ->filter(fn ($i) => $i->product)
            ->map(function ($i) use ($request) {
                $p = (new ProductResource($i->product))->resolve($request);
                return [
                    'id'         => $i->id,
                    'product_id' => $i->product_id,
                    'size'       => $i->size,
                    'qty'        => $i->qty,
                    'name'       => $p['name'],
                    'brand'      => $p['brand'],
                    'price'      => $p['price'],
                    'stock'      => $p['stock'],
                    'img_url'    => $p['img_url'],
                    'colors'     => $p['colors'],
                ];
            })
            ->values();

        $subtotal = (float) $items->sum(fn ($i) => $i['price'] * $i['qty']);
        $shipping = Order::shippingFee($subtotal);

        return [
            'items'    => $items->all(),
            'count'    => (int) $items->sum('qty'),
            'subtotal' => $subtotal,
            'shipping' => $shipping,
            'total'    => $subtotal + $shipping,
        ];
    }
}
