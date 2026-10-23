<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    /**
     * GET /api/products
     * Query: search, category_id, min_price, max_price, in_stock, sort_by, order, per_page, page
     */
    public function index(Request $request)
    {
        $sortable = ['product_id', 'name', 'price', 'stock', 'rating', 'created_at'];
        $sortBy   = in_array($request->sort_by, $sortable, true) ? $request->sort_by : 'product_id';
        $order    = $request->order === 'desc' ? 'desc' : 'asc';
        $perPage  = max(1, min($request->integer('per_page', 10), 50));

        $products = Product::with('category')
            ->when($request->search, function ($q, $s) {
                $q->where(function ($w) use ($s) {
                    $w->where('name', 'like', "%{$s}%")
                      ->orWhere('brand', 'like', "%{$s}%");
                });
            })
            ->when($request->category_id, fn ($q, $c) => $q->where('category_id', $c))
            ->when($request->min_price, fn ($q, $v) => $q->where('price', '>=', $v))
            ->when($request->max_price, fn ($q, $v) => $q->where('price', '<=', $v))
            ->when($request->boolean('in_stock'), fn ($q) => $q->where('stock', '>', 0))
            ->orderBy($sortBy, $order)
            ->paginate($perPage)
            ->withQueryString();

        return ProductResource::collection($products);
    }

    /**
     * GET /api/products/{product}
     */
    public function show(Product $product)
    {
        return new ProductResource($product->load('category'));
    }

    /**
     * POST /api/products  (token + admin)
     */
    public function store(StoreProductRequest $request)
    {
        $data = $this->clean(Arr::except($request->validated(), ['img']));
        $data['slug'] = $this->uniqueSlug($data['name']);

        // simpan file gambar (jika ada) ke storage/app/public/products
        $path = null;
        if ($request->hasFile('img')) {
            $path = $request->file('img')->store('products', 'public');
        }
        $data['img'] = $path;

        try {
            // jika gagal di tengah jalan, semua perubahan dibatalkan (rollback)
            $product = DB::transaction(fn () => Product::create($data));
        } catch (\Throwable $e) {
            if ($path) {
                Storage::disk('public')->delete($path); // jangan sisakan file yatim
            }
            throw $e;
        }

        return (new ProductResource($product->load('category')))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * PUT/PATCH /api/products/{product}  (token + admin)
     */
    public function update(UpdateProductRequest $request, Product $product)
    {
        $data = $this->clean(Arr::except($request->validated(), ['img']));

        if (isset($data['name'])) {
            $data['slug'] = $this->uniqueSlug($data['name'], $product->product_id);
        }

        $oldImg  = $product->img;
        $newPath = null;

        if ($request->hasFile('img')) {
            $newPath     = $request->file('img')->store('products', 'public');
            $data['img'] = $newPath;
        }

        try {
            DB::transaction(fn () => $product->update($data));
        } catch (\Throwable $e) {
            if ($newPath) {
                Storage::disk('public')->delete($newPath);
            }
            throw $e;
        }

        // hapus gambar lama hanya setelah update berhasil
        $this->deleteStoredImage($newPath ? $oldImg : null);

        return new ProductResource($product->load('category'));
    }

    /**
     * DELETE /api/products/{product}  (token + admin)
     */
    public function destroy(Product $product)
    {
        DB::transaction(fn () => $product->delete());

        $this->deleteStoredImage($product->img);

        return response()->json(['message' => 'Product deleted successfully']);
    }

    /**
     * Hapus file gambar hasil upload. URL luar (data seeder) dibiarkan.
     */
    private function deleteStoredImage(?string $img): void
    {
        if ($img && !str_starts_with($img, 'http')) {
            Storage::disk('public')->delete($img);
        }
    }

    /**
     * Buang nilai null untuk kolom yang punya default di database.
     */
    private function clean(array $data): array
    {
        foreach (['brand', 'size_min', 'size_max', 'color1', 'color2', 'rating'] as $key) {
            if (array_key_exists($key, $data) && $data[$key] === null) {
                unset($data[$key]);
            }
        }
        return $data;
    }

    /**
     * Buat slug unik dari nama produk.
     */
    private function uniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name) ?: 'produk';
        $slug = $base;
        $i    = 2;

        while (
            Product::where('slug', $slug)
                ->when($ignoreId, fn ($q) => $q->where('product_id', '!=', $ignoreId))
                ->exists()
        ) {
            $slug = $base . '-' . $i++;
        }

        return $slug;
    }
}
