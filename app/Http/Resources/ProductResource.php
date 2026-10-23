<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // img bisa berupa path storage (hasil upload) atau URL penuh (data seeder)
        $imgUrl = null;
        if ($this->img) {
            $imgUrl = str_starts_with($this->img, 'http')
                ? $this->img
                : url('storage/' . $this->img);
        }

        return [
            'id'          => $this->product_id,
            'name'        => $this->name,
            'brand'       => $this->brand,
            'slug'        => $this->slug,
            'description' => $this->description,
            'price'       => (float) $this->price,
            'stock'       => (int) $this->stock,
            'rating'      => (float) $this->rating,
            'size_min'    => (int) $this->size_min,
            'size_max'    => (int) $this->size_max,
            'sizes'       => range((int) $this->size_min, (int) $this->size_max),
            'colors'      => [$this->color1, $this->color2],
            'img_url'     => $imgUrl,
            'category'    => [
                'id'   => $this->category_id,
                'name' => $this->category?->category,
            ],
            'created_at'  => $this->created_at,
            'updated_at'  => $this->updated_at,
        ];
    }
}
