<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
{
    use ReturnsJsonErrors;

    public function authorize(): bool
    {
        // akses dijaga middleware auth:sanctum + AdminOnly pada route
        return true;
    }

    public function rules(): array
    {
        return [
            'name'        => 'required|string|max:150|unique:products,name',
            'brand'       => 'nullable|string|max:80',
            'description' => 'nullable|string',
            'category_id' => 'required|exists:categories,category_id',
            'price'       => 'required|numeric|min:0',
            'stock'       => 'required|integer|min:0',
            'size_min'    => 'nullable|integer|min:20|max:60',
            'size_max'    => 'nullable|integer|min:20|max:60|gte:size_min',
            'color1'      => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'color2'      => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'rating'      => 'nullable|numeric|min:0|max:5',
            'img'         => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
        ];
    }

    public function messages(): array
    {
        return [
            'required' => 'Kolom :attribute wajib diisi.',
            'numeric'  => 'Kolom :attribute harus berupa angka.',
            'integer'  => 'Kolom :attribute harus berupa bilangan bulat.',
            'exists'   => ':attribute tidak ditemukan.',
            'unique'   => ':attribute sudah digunakan.',
            'image'    => 'File harus berupa gambar.',
            'mimes'    => 'Format gambar harus jpg, jpeg, png, atau webp.',
            'max'      => 'Isian :attribute melebihi batas yang diizinkan.',
            'min'      => 'Isian :attribute tidak boleh kurang dari :min.',
            'gte'      => 'Ukuran maksimum harus lebih besar atau sama dengan ukuran minimum.',
            'regex'    => 'Format warna harus seperti #4f46e5.',
        ];
    }
}
